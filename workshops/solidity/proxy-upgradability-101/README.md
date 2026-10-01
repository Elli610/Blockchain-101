# Proxy and Upgradability 101

## Introduction
Welcome! This is an automated workshop covering the four main proxy patterns used to build upgradeable smart contracts on the EVM. You will build each proxy **from scratch**, without inheriting from any library implementation, so the mechanics stay visible.

The workshop is organised as **four levels**, ordered from simple to complex:

1. **Level 1: EIP-1167 Minimal Proxy (clones)**. Non-upgradeable, cheap deployments, 45-byte runtime bytecode. Great starting point to internalise `delegatecall`.
2. **Level 2: Transparent Proxy (EIP-1967)**. Admin-gated upgrades, canonical storage slots, selector-collision protection between proxy admin functions and the impl.
3. **Level 3: UUPS (EIP-1822)**. Upgrade logic lives in the implementation, not the proxy. Introduces `proxiableUUID` and the brick-protection trap.
4. **Level 4: Beacon Proxy**. One beacon controls many proxies. Upgrade all instances in a single transaction.

By the end you will have:
* deployed a minimal proxy whose runtime code matches the EIP-1167 template byte-for-byte,
* stored an implementation address in the exact EIP-1967 storage slot,
* built and defended a Transparent proxy admin gate,
* built a UUPS `upgradeTo` that rejects a non-UUPS impl (avoiding a bricked contract),
* orchestrated a beacon upgrade that flips multiple proxies at once,
* observed a storage-collision bug happen in real time.

This workshop assumes you have completed [ERC20 101](../erc20-101/) and are comfortable with Solidity, `delegatecall`, and Hardhat deployment.

## How to Work on This TD
The TD ships with two deployed contracts:
- A points token, ticker **TD-PROXY-101**, tracks your score. Transfers are disabled.
- An **Evaluator** that grades every exercise and mints TD-PROXY-101 tokens on success.

Rules:
- To receive points, trigger `TDERC20.distributeTokens(msg.sender, n)` inside the Evaluator by successfully calling one of the `exN_...` functions.
- Submit ONE **facade** contract implementing [`IExerciseSolution.sol`](./contracts/IExerciseSolution.sol). This facade only stores addresses; it does not perform upgrades itself. Register it via `submitExercise(<yourFacade>)`. The Evaluator NEVER holds admin/owner on any of your proxies. All upgrades are triggered by YOUR EOA off-chain (Hardhat script, Etherscan, whatever you prefer), between exercise calls.
- A high-level description of each exercise is below. For the exact requirements, read [`Evaluator.sol`](./contracts/Evaluator.sol).

### Getting to Work
1. Clone the repo and enter this workshop:
   ```bash
   git clone <repo url>
   cd workshops/solidity/proxy-upgradability-101
   npm install
   ```
2. Create a `.env` based on [`.env.example`](./.env.example). Fill `PRIVATE_KEY` and `SEPOLIA_RPC_URL`.
3. Deploy contracts to Sepolia in a fresh Hardhat project of your own.
4. Use the addresses from the [Deployed Addresses](#deployed-addresses) section at the bottom of this file.

## Understanding the Building Blocks

Before jumping in, make sure the following mental model is clear.

### `delegatecall` and where state lives
`A.delegatecall(B, calldata)` runs B's code in A's context. That means:
* the reading and writing of storage happens in A,
* `msg.sender` and `msg.value` are A's caller,
* B's own storage is not touched at all.

Every proxy in this workshop is a very small contract whose sole job is to forward calls with `delegatecall`. State (variables like `value`, `owner`, `paused`) lives in the proxy. Code (logic like `setValue`, `permit`, `swap`) lives in the implementation.

### EIP-1967 storage slots
To avoid clashing with the implementation's own storage layout, EIP-1967 mandates a specific slot for each proxy metadata field. These slots are derived so they cannot collide with a normal Solidity storage layout:
```
implementation slot = bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1)
                    = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc

admin slot          = bytes32(uint256(keccak256("eip1967.proxy.admin")) - 1)
                    = 0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103

beacon slot         = bytes32(uint256(keccak256("eip1967.proxy.beacon")) - 1)
                    = 0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50
```
You will read and write these slots with `sload` / `sstore` in inline assembly. Never mirror them into a normal Solidity variable; the whole point is to avoid any possible clash with the impl.

### The EIP-1167 template
The runtime code of a minimal proxy is exactly 45 bytes:
```
0x363d3d373d3d3d363d73<20-byte-impl>5af43d82803e903d91602b57fd5bf3
```
Breakdown:
* `363d3d373d3d3d363d73`: 10-byte prefix that sets up the stack and copies calldata.
* `<20 bytes>`: the implementation address, embedded as a `PUSH20` immediate.
* `5af43d82803e903d91602b57fd5bf3`: 15-byte suffix that runs `DELEGATECALL`, then either `REVERT`s or `RETURN`s the returndata.

You will need to construct this bytecode manually and deploy it. The Evaluator hashes your proxy's runtime code and compares it against the exact template.

### UUPS and `proxiableUUID`
In UUPS, the `upgradeTo` function lives inside the implementation, not the proxy. That means an incorrect upgrade can leave the proxy pointing at a contract that itself has no upgrade path, permanently freezing your system.

The defence is `proxiableUUID()`, a view function every UUPS implementation MUST expose that returns the canonical EIP-1967 implementation slot. Before switching over, your current impl must:
1. call `proxiableUUID()` on the new impl,
2. require it returns exactly `0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc`,
3. only then write the new impl address into the EIP-1967 slot.

If the new impl reverts or returns any other value, refuse the upgrade.

### Beacon indirection
A beacon proxy reads `implementation()` from a separate **beacon** contract on every call, then `delegatecall`s to whatever it returns. Upgrading the beacon changes the code every proxy runs, in a single transaction, with no state migration.

### Common upgrade traps (all covered in this workshop)
1. **Constructor in the impl**. The impl's constructor runs during its own deployment, but never through the proxy. Anything set in the constructor is invisible to the proxy's state. Use an `initialize()` function called through the proxy exactly once instead.
2. **Uninitialised impl**. If the impl itself is deployed with no protection, an attacker can call its `initialize` and take ownership of that impl directly. Either self-destruct it at construction, or set an "already initialised" flag in the impl's constructor.
3. **Storage layout append-only rule**. You may add variables at the END of the layout across upgrades, never in the middle. Reordering shifts all subsequent variables to different slots, corrupting existing state.
4. **Selector collisions (Transparent)**. If your impl has a function with the same 4-byte selector as one of the proxy's admin functions (`upgradeTo`, `admin`, `changeAdmin`, ...), admin calls to the proxy would silently hit the impl instead. Transparent proxies solve this by dispatching on `msg.sender == admin`.
5. **`_authorizeUpgrade` brick (UUPS)**. UUPS puts upgrade authorisation in the impl, so if you deploy a new impl whose `_authorizeUpgrade` always reverts, you brick your contract forever. The upgrade path must include a `proxiableUUID()` check on the new impl.

## Points List

Total points available: **38**.

### Setting Up (2 points)
- Create a Git repository and share it with the instructor.
- Get an RPC API key.
- Deploy a first `Facade` contract implementing [`IExerciseSolution.sol`](./contracts/IExerciseSolution.sol) (any stub will do at first), and call `submitExercise(<yourFacade>)` on the Evaluator. This grants **2 points**.

### Level 1: EIP-1167 Minimal Proxy (7 points)
1. Write a `Logic` contract implementing [`ILogic.sol`](./contracts/ILogic.sol) with `version() == "v1"`. Deploy it and register its address via `getMinimalProxyLogic()` in your facade.
2. Call `ex1_deployLogicMinimal()`. The Evaluator will verify the impl works on its own. **2 points**.
3. Build a minimal proxy contract. You have two options:
   - Deploy the raw 45-byte runtime via a small factory (recommended, teaches the bytecode).
   - Write a Solidity contract that manually returns the template from its constructor.
   The runtime code MUST be exactly 45 bytes matching the EIP-1167 template with your logic address embedded. Register via `getMinimalProxy()`.
4. Call `ex2_deployMinimalProxyBytecode()`. The Evaluator hashes your proxy code and compares against the template. **3 points**.
5. Call `ex3_minimalProxyDelegates()`. The Evaluator calls `initialize`, `setValue`, `value` and `version` through the proxy to confirm delegation works. **2 points**.

### Level 2: Transparent Proxy (EIP-1967) (12 points)
1. Write two implementation contracts, `LogicV1` and `LogicV2`, both implementing `ILogic`. V1's `version()` returns `"v1"`, V2's returns `"v2"`. Both share the SAME storage layout (append-only), where the first storage slot holds `value`.
2. Write your own `TransparentProxy` contract with:
   - impl address stored in the EIP-1967 implementation slot,
   - admin address stored in the EIP-1967 admin slot,
   - a `fallback` that `delegatecall`s to the current impl,
   - admin-only `upgradeTo(address newImpl)` and `admin()` selectors,
   - the transparent dispatch rule: if `msg.sender == admin`, admin functions run; otherwise, ALL calls fall through to `delegatecall`.
3. Deploy the proxy with `LogicV1` as impl. Register everything in the facade.
4. Call `ex4_transparentProxyBasics()`. The Evaluator confirms the proxy is on V1 and roundtripping works. **3 points**.
5. Upgrade the proxy to `LogicV2` (`proxy.upgradeTo(V2)` from your admin EOA). Call `ex5_transparentUpgrade()`. The Evaluator confirms V2 is active, state persisted, and writes a sentinel value for the next exercise. **3 points**.
6. Call `ex6_transparentAdminGating()`. The Evaluator tries to `upgradeTo(...)` from its own address (not admin) and confirms the call reverts and the proxy is unchanged. **3 points**.
7. Write a `LogicBroken` contract with a WRONG storage layout: insert an extra `uint256 wrongSlot0` BEFORE `value` (so `value` moves from slot 0 to slot 1). It MUST also expose `wrongSlot0() view returns (uint256)`. Its `version()` returns `"vBROKEN"`. Register it via `getTransparentLogicBroken()`, then upgrade the proxy to it. Call `ex7_transparentStorageCollision()`. The Evaluator observes the shift: `value()` reads 0 (fresh slot 1) and `wrongSlot0()` reads the sentinel. **3 points**.

### Level 3: UUPS (EIP-1822) (10 points)
Deploy an INDEPENDENT proxy for Level 3. Do not reuse the Transparent proxy (its Level 2 state must remain observable).

1. Write two UUPS implementations, `UUPSLogicV1` and `UUPSLogicV2`, each implementing `ILogic` AND `IUUPS`:
   - `proxiableUUID()` returns the EIP-1967 implementation slot constant.
   - `upgradeTo(address newImpl)` is admin-gated (store admin at deploy time in a slot).
   - **Brick protection**: before writing the new impl into the slot, `upgradeTo` MUST call `proxiableUUID()` on `newImpl` and verify it returns the EIP-1967 slot constant. Reject `newImpl == address(0)` and `newImpl.code.length == 0`.
2. Write a `UUPSProxy` contract whose ONLY jobs are:
   - store the initial impl in the EIP-1967 slot at construction,
   - delegate all calls to the current impl.
   There is no `upgradeTo` in the proxy: the impl handles that.
3. Deploy V1, deploy the proxy pointing at V1, register both in the facade.
4. Call `ex8_uupsBasics()`. The Evaluator verifies the proxy is on V1, roundtrip works, and V1 is UUPS-safe. **3 points**.
5. Deploy V2, upgrade the proxy via `IUUPS(proxy).upgradeTo(V2)` from your admin EOA. Call `ex9_uupsUpgrade()`. **3 points**.
6. Write a `UUPSNonUpgradeable` contract that implements `ILogic` but is NOT UUPS-safe: either omit `proxiableUUID()` entirely, or make it return a wrong slot. Register it via `getUUPSNonUpgradeable()`. Attempt to upgrade the proxy to it; your `upgradeTo` MUST revert. Confirm the proxy is still on V2. Call `ex10_uupsBrickProtection()`. **4 points**.

### Level 4: Beacon Proxy (7 points)
1. Write two beacon-logic implementations, `BeaconLogicV1` and `BeaconLogicV2`, both implementing `ILogic`. Same storage layout, `version` differs.
2. Write a `Beacon` contract exposing:
   - `implementation() view returns (address)`, and
   - an admin-gated `upgradeTo(address newImpl)` that updates the stored impl.
3. Write a `BeaconProxy` contract whose fallback reads `implementation()` from the beacon on every call and `delegatecall`s to it. Store the beacon address in the EIP-1967 beacon slot.
4. Deploy the beacon (pointing at V1), and deploy TWO independent `BeaconProxy` instances that both point at that beacon. Register everything in the facade.
5. Call `ex11_beaconBasics()`. **2 points**.
6. Call `ex12_beaconStateIndependence()`. The Evaluator writes different values to each proxy and confirms they are independent. **2 points**.
7. Upgrade the beacon to V2. Call `ex13_beaconUpgrade()`. Both proxies must now report V2 and preserve their independent state. **3 points**.

## Notes and Hints
- **Never expose `implementation()` publicly on your production Transparent proxy**: on OZ's implementation it is admin-only, precisely because a public getter is a small selector-collision risk with impl functions. For this workshop, however, admin-only or public both work: the Evaluator does not read it.
- **Assembly slot access**:
  ```solidity
  bytes32 constant IMPL_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
  function _getImpl() internal view returns (address impl) {
      assembly { impl := sload(IMPL_SLOT) }
  }
  function _setImpl(address newImpl) internal {
      assembly { sstore(IMPL_SLOT, newImpl) }
  }
  ```
- **Delegate fallback template**:
  ```solidity
  fallback() external payable {
      address impl = _getImpl();
      assembly {
          calldatacopy(0, 0, calldatasize())
          let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
          returndatacopy(0, 0, returndatasize())
          switch result
          case 0 { revert(0, returndatasize()) }
          default { return(0, returndatasize()) }
      }
  }
  ```
- **Do NOT copy this into a library import**. Writing the fallback and slot code yourself is the whole point of the workshop.
- **`initialize` guard**: use a boolean stored in a normal Solidity variable, e.g. `bool private _initialized`. Do NOT use a constructor for state that must live in the proxy.
- **Impl uninitialised trap**: after deploying your V1 impl, call `initialize` on the impl itself with dummy values to lock it (or set `_initialized = true` in the impl's constructor).
- **Deploying raw 45-byte bytecode**: the easiest way is a small factory contract that returns a memory buffer containing the 45 bytes from its constructor. The creation code is:
  ```
  0x3d602d80600a3d3981f3 || <45-byte runtime>
  ```
  which is 55 bytes total.
- **Beacon proxy fallback** reads the current impl on every call, so a beacon upgrade is instant across all proxies. Cache-nothing.

## Deployed Addresses

> Sepolia (chainId 11155111). Both contracts are verified on Etherscan and Sourcify.

| Contract | Address |
|---|---|
| `TDERC20_PROXY` (points token) | [`0xf0Ad8a1001814Ead7fc85dC5Af764EE0580a2da2`](https://sepolia.etherscan.io/address/0xf0Ad8a1001814Ead7fc85dC5Af764EE0580a2da2#code) |
| `Evaluator`                    | [`0x4a78Ed38B27fe5287eaB77aB40252a1635909AE8`](https://sepolia.etherscan.io/address/0x4a78Ed38B27fe5287eaB77aB40252a1635909AE8#code) |
