# Part 1: Smart Contract Development

## Overview

In this first part of the workshop, you'll create the smart contracts that form the foundation of your cross-chain bridge. You'll need to develop contracts for both Ethereum Holesky and your target blockchain.

## Objectives

By the end of this section, you will have:
- Developed bridge contracts with deposit and distribution functionality
- Implemented ownership mechanisms for security
- Tested your contracts locally
- Deployed your contracts to both blockchains

## Step 1: Setting Up Your Development Environment

1. Create a new project directory and initialize a git repository:
   ```bash
   mkdir cross-chain-bridge
   cd cross-chain-bridge
   git init
   ```

2. Install Foundry if you haven't already:
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

3. Initialize a new Forge project:
   ```bash
   forge init
   ```

4. Add OpenZeppelin contracts as a dependency:
   ```bash
   forge install OpenZeppelin/openzeppelin-contracts
   ```

5. Create a `.env` file for environment variables:
   ```bash
   touch .env
   ```
   
   Add the following to your `.env` file:
   ```
   PRIVATE_KEY=your_private_key_here
   HOLESKY_RPC_URL=https://holesky.infura.io/v3/your_infura_key
   TARGET_CHAIN_RPC_URL=your_target_chain_rpc_url
   ETHERSCAN_API_KEY=your_etherscan_api_key
   ```

6. Ensure your `.gitignore` file includes the following:
   ```
   .env
   out/
   lib/
   broadcast/
   ```

7. Create a `.env.example` file as a template:
   ```bash
   cp .env .env.example
   ```
   Edit `.env.example` to remove any sensitive information.

8. Set up foundry.toml with network configurations:
   ```toml
   # foundry.toml
   [profile.default]
   src = 'src'
   out = 'out'
   libs = ['lib']
   solc = "0.8.20"
   optimizer = true
   optimizer_runs = 200

   [rpc_endpoints]
   holesky = "${HOLESKY_RPC_URL}"
   target_chain = "${TARGET_CHAIN_RPC_URL}"

   [etherscan]
   holesky = { key = "${ETHERSCAN_API_KEY}" }

   [profile.remapping]
   "@openzeppelin/contracts/" = "lib/openzeppelin-contracts/contracts/"
   "forge-std" = "lib/forge-std/src/"

   ```

## Step 2: Creating the Bridge Contract

Create a contract that will:
- Accept token deposits
- Emit events for the indexer to monitor
- Include ownership controls for security

1. Create a basic ERC20 token for testing (if needed):

   ```solidity
   // src/TestToken.sol
   // SPDX-License-Identifier: MIT
   pragma solidity ^0.8.20;

   import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

   contract TestToken is ERC20 {
       constructor() ERC20("Test Token", "TST") {
           _mint(msg.sender, 1000000 * 10 ** decimals());
       }
   }
   ```

2. Create the bridge contract:

   ```solidity
   // src/TokenBridge.sol
   // SPDX-License-Identifier: MIT
   pragma solidity ^0.8.20;

   import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
   import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
   import "@openzeppelin/contracts/access/Ownable.sol";
   import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

   contract TokenBridge is Ownable, ReentrancyGuard {
       using SafeERC20 for IERC20;

       // Events
       event Deposit(
           address indexed token,
           address indexed from,
           address indexed to,
           uint256 amount,
           uint256 nonce
       );

       event Distribution(
           address indexed token,
           address indexed to,
           uint256 amount,
           uint256 nonce
       );

       // State variables
       uint256 private _nonce;
       mapping(address => bool) private _supportedTokens;
       // Track processed deposits to prevent double-processing
       mapping(uint256 => bool) private _processedDeposits;
       // Pause mechanism
       bool private _paused;

       // Modifiers
       modifier whenNotPaused() {
           require(!_paused, "Bridge: paused");
           _;
       }

       modifier onlyDistributor() {
           // In production, this would be a more sophisticated authorization system
           require(msg.sender == owner(), "Bridge: not distributor");
           _;
       }

       constructor() Ownable(msg.sender) {
           _nonce = 0;
           _paused = false;
       }

       /**
        * @dev Adds a token to the supported tokens list
        * @param token The token address to add
        */
       function addSupportedToken(address token) external onlyOwner {
           _supportedTokens[token] = true;
       }

       /**
        * @dev Removes a token from the supported tokens list
        * @param token The token address to remove
        */
       function removeSupportedToken(address token) external onlyOwner {
           _supportedTokens[token] = false;
       }

       /**
        * @dev Pauses the bridge
        */
       function pause() external onlyOwner {
           _paused = true;
       }

       /**
        * @dev Unpauses the bridge
        */
       function unpause() external onlyOwner {
           _paused = false;
       }

       /**
        * @dev Deposits tokens to the bridge
        * @param token The token address
        * @param amount The amount to deposit
        * @param recipient The address that will receive tokens on the other chain
        */
       function deposit(
           address token,
           uint256 amount,
           address recipient
       ) external nonReentrant whenNotPaused {
           require(_supportedTokens[token], "Bridge: token not supported");
           require(amount > 0, "Bridge: amount must be greater than 0");
           
           // Transfer tokens from sender to bridge
           IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
           
           // Emit deposit event
           uint256 currentNonce = _nonce++;
           emit Deposit(token, msg.sender, recipient, amount, currentNonce);
       }

       /**
        * @dev Distributes tokens from the bridge to a recipient
        * @param token The token address
        * @param recipient The recipient address
        * @param amount The amount to distribute
        * @param depositNonce The nonce of the corresponding deposit
        */
       function distribute(
           address token,
           address recipient,
           uint256 amount,
           uint256 depositNonce
       ) external nonReentrant whenNotPaused onlyDistributor {
           require(_supportedTokens[token], "Bridge: token not supported");
           require(!_processedDeposits[depositNonce], "Bridge: deposit already processed");
           
           // Mark deposit as processed
           _processedDeposits[depositNonce] = true;
           
           // Transfer tokens from bridge to recipient
           IERC20(token).safeTransfer(recipient, amount);
           
           // Emit distribution event
           emit Distribution(token, recipient, amount, depositNonce);
       }

       /**
        * @dev Withdraws tokens in case of emergency
        * @param token The token address
        * @param amount The amount to withdraw
        */
       function emergencyWithdraw(
           address token,
           uint256 amount
       ) external onlyOwner {
           IERC20(token).safeTransfer(owner(), amount);
       }
   }
   ```

## Step 3: Testing Your Contract

1. Create test cases for your bridge contract:

   ```solidity
   // test/TokenBridge.t.sol
   // SPDX-License-Identifier: MIT
   pragma solidity ^0.8.20;

   import "forge-std/Test.sol";
   import "../src/TokenBridge.sol";
   import "../src/TestToken.sol";

   contract TokenBridgeTest is Test {
       TokenBridge public bridge;
       TestToken public token;
       
       address public owner = address(this);
       address public user = makeAddr("user");
       address public distributor = makeAddr("distributor");
       
       function setUp() public {
           // Deploy test token
           token = new TestToken();
           
           // Deploy bridge contract
           bridge = new TokenBridge();
           
           vm.startPrank(owner);
           // Add test token to supported tokens
           bridge.addSupportedToken(address(token));
           vm.stopPrank();
           
           // Transfer some tokens to user for testing
           token.transfer(user, 1000 ether);
       }
       
       function testDeposit() public {
           // Set user as msg.sender
           vm.startPrank(user);
           
           // Approve bridge to spend tokens
           token.approve(address(bridge), 100 ether);
           
           // Deposit tokens
           bridge.deposit(address(token), 100 ether, user);
           
           // Stop being user
           vm.stopPrank();
           
           // Check if tokens were transferred to the bridge
           assertEq(token.balanceOf(address(bridge)), 100 ether);
       }
       
       function testDistributeByOwner() public {
           // First deposit tokens to the bridge as user
           vm.startPrank(user);
           token.approve(address(bridge), 100 ether);
           bridge.deposit(address(token), 100 ether, user);
           vm.stopPrank();
           
           // Remember the user's balance after deposit
           uint256 userBalanceAfterDeposit = token.balanceOf(user);
           
           // Now distribute tokens as owner
           bridge.distribute(
               address(token),
               user,
               100 ether,
               0 // Nonce from the deposit
           );
           
           // Check if tokens were transferred to the user
           assertEq(token.balanceOf(user), userBalanceAfterDeposit + 100 ether);
       }
       
       function testDistributeByNonOwnerFails() public {
           // Try to distribute tokens as a non-owner
           vm.startPrank(user);
           
           vm.expectRevert("Bridge: not distributor");
           bridge.distribute(
               address(token),
               user,
               100 ether,
               0
           );
           
           vm.stopPrank();
       }
       
       // Add more tests for other functionality
   }
   ```

2. Run the tests:
   ```bash
   forge test
   ```

## Step 4: Deploying Your Contracts

1. Create deployment scripts for both networks:

   ```solidity
   // script/DeployTokenBridge.s.sol
   // SPDX-License-Identifier: MIT
   pragma solidity ^0.8.20;

   import "forge-std/Script.sol";
   import "../src/TokenBridge.sol";

   contract DeployTokenBridge is Script {
       function run() external {
           uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
           
           vm.startBroadcast(deployerPrivateKey);
           
           TokenBridge bridge = new TokenBridge();
           
           vm.stopBroadcast();
           
           console.log("TokenBridge deployed to:", address(bridge));
       }
   }
   ```

2. Deploy to Holesky:
   ```bash
   source .env
   forge script script/DeployTokenBridge.s.sol:DeployTokenBridge --rpc-url $HOLESKY_RPC_URL --broadcast --verify
   ```

3. Deploy to your target chain:
   ```bash
   source .env
   forge script script/DeployTokenBridge.s.sol:DeployTokenBridge --rpc-url $TARGET_CHAIN_RPC_URL --broadcast
   ```

4. Save your deployed contract addresses:
   ```
   Holesky Bridge Contract: 0x...
   Target Chain Bridge Contract: 0x...
   ```

## Step 5: Bridge Contract Verification

Once your contracts are deployed, they should be automatically verified if you used the `--verify` flag with Forge. If not, you can verify them manually:

1. For Holesky, verify using Forge:
   ```bash
   forge verify-contract <DEPLOYED_CONTRACT_ADDRESS> src/TokenBridge.sol:TokenBridge --chain-id 17000 --etherscan-api-key $ETHERSCAN_API_KEY
   ```

2. For your target chain, use the appropriate block explorer and verification method.

## Next Steps

Now that you have deployed your bridge contracts, you can proceed to Part 2 where you'll build an indexer to monitor events on both chains.

## Troubleshooting

- **Contract Deployment Failures**: Ensure you have enough test ETH for gas fees. Use faucets if needed.
- **Transaction Errors**: Check that your environment variables are correctly set and your private key has the necessary permissions.
- **Smart Contract Bugs**: Use Hardhat's console.log for debugging and ensure all tests pass before deployment.

## Security Considerations

The contract in this workshop is a simplified version for educational purposes. In a production environment, consider:

1. Using a multi-signature wallet for ownership
2. Implementing time locks for critical functions
3. Adding more sophisticated validation for cross-chain transactions
4. Conducting thorough security audits before deployment
5. Implementing rate limiting to prevent abuse

## Advanced Challenges

If you complete the basic implementation quickly, consider these extensions:

1. Add support for native currency (ETH/MATIC/etc.) bridging
2. Implement a fee mechanism for bridge operations
3. Add a validation period before distribution
4. Create a governance mechanism for bridge parameters
