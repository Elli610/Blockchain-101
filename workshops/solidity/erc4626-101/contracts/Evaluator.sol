// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;
pragma experimental ABIEncoderV2;

import "./ERC4626_101.sol";
import "./MockUnderlying.sol";
import "./IExerciceSolution.sol";
import "./IAllInOneSolution.sol";

contract Evaluator {
    ERC4626_101 public erc4626_101Address;
    MockUnderlying public underlying;

    string[20] private randomNames;
    string[20] private randomSymbols;
    uint256 public nextValueStoreRank;

    mapping(address => string) public assignedName;
    mapping(address => string) public assignedSymbol;
    mapping(address => mapping(uint256 => bool)) public exerciceProgression;
    mapping(address => IExerciceSolution) public studentVault;
    mapping(address => bool) public hasBeenPaired;

    event newRandomNameAndSymbol(string name, string symbol);
    event constructedCorrectly(address erc4626Address, address underlyingAddress);

    constructor(ERC4626_101 _erc4626_101Address, MockUnderlying _underlying) {
        erc4626_101Address = _erc4626_101Address;
        underlying = _underlying;
        emit constructedCorrectly(address(_erc4626_101Address), address(_underlying));
    }

    fallback() external payable {}

    receive() external payable {}

    modifier onlyTeachers() {
        require(erc4626_101Address.teachers(msg.sender));
        _;
    }

    /* ---------- Setup ---------- */

    function ex0_setupProject() external {
        if (!exerciceProgression[msg.sender][0]) {
            exerciceProgression[msg.sender][0] = true;
            // Setup project
            erc4626_101Address.distributeTokens(msg.sender, 2);
            // Get an RPC access
            erc4626_101Address.distributeTokens(msg.sender, 1);
        }
    }

    function submitExercice(IExerciceSolution studentExercice) external {
        require(!hasBeenPaired[address(studentExercice)], "Vault already paired");
        studentVault[msg.sender] = studentExercice;
        hasBeenPaired[address(studentExercice)] = true;
        if (!exerciceProgression[msg.sender][0]) {
            exerciceProgression[msg.sender][0] = true;
            // Setup
            erc4626_101Address.distributeTokens(msg.sender, 2);
            // Creating contract
            erc4626_101Address.distributeTokens(msg.sender, 2);
            // Deploying contract
            erc4626_101Address.distributeTokens(msg.sender, 1);
        }
    }

    /* ---------- Exercises ---------- */

    function ex1_getVaultParameters() external {
        assignedName[msg.sender] = randomNames[nextValueStoreRank];
        assignedSymbol[msg.sender] = randomSymbols[nextValueStoreRank];

        nextValueStoreRank += 1;
        if (nextValueStoreRank >= 20) {
            nextValueStoreRank = 0;
        }

        if (!exerciceProgression[msg.sender][1]) {
            exerciceProgression[msg.sender][1] = true;
            erc4626_101Address.distributeTokens(msg.sender, 1);
        }
    }

    function ex2_testVaultDeployment() external {
        require(exerciceProgression[msg.sender][1], "Get vault parameters first");
        require(exerciceProgression[msg.sender][0], "Submit an exercice contract first");

        IExerciceSolution vault = studentVault[msg.sender];
        require(address(vault) != address(0), "No vault registered");

        require(vault.asset() == address(underlying), "Wrong underlying asset");
        require(
            _compareStrings(vault.name(), assignedName[msg.sender]),
            "Incorrect vault name"
        );
        require(
            _compareStrings(vault.symbol(), assignedSymbol[msg.sender]),
            "Incorrect vault symbol"
        );
        require(vault.totalSupply() == 0, "Vault should start with 0 shares");
        require(vault.totalAssets() == 0, "Vault should start with 0 assets");

        if (!exerciceProgression[msg.sender][2]) {
            exerciceProgression[msg.sender][2] = true;
            erc4626_101Address.distributeTokens(msg.sender, 2);
        }
    }

    function ex3_testDeposit() public {
        IExerciceSolution vault = studentVault[msg.sender];
        require(address(vault) != address(0), "No vault registered");

        uint256 depositAmount = 1000 * 1e18;
        underlying.getTokens(depositAmount);
        require(
            underlying.balanceOf(address(this)) >= depositAmount,
            "Failed to obtain underlying"
        );

        underlying.approve(address(vault), depositAmount);

        uint256 sharesBefore = vault.balanceOf(address(this));
        uint256 previewedShares = vault.previewDeposit(depositAmount);
        uint256 shares = vault.deposit(depositAmount, address(this));
        uint256 sharesAfter = vault.balanceOf(address(this));

        require(shares > 0, "No shares minted");
        require(sharesAfter - sharesBefore == shares, "Shares balance mismatch");
        require(shares == previewedShares, "previewDeposit did not match deposit output");

        if (!exerciceProgression[msg.sender][3]) {
            exerciceProgression[msg.sender][3] = true;
            erc4626_101Address.distributeTokens(msg.sender, 2);
        }
    }

    function ex4_testMint() external {
        IExerciceSolution vault = studentVault[msg.sender];
        require(address(vault) != address(0), "No vault registered");

        uint256 sharesToMint = 500 * 1e18;
        uint256 previewedAssets = vault.previewMint(sharesToMint);
        require(previewedAssets > 0, "previewMint returned 0");

        underlying.getTokens(previewedAssets);
        underlying.approve(address(vault), previewedAssets);

        uint256 sharesBefore = vault.balanceOf(address(this));
        uint256 underlyingBefore = underlying.balanceOf(address(this));
        uint256 assetsPulled = vault.mint(sharesToMint, address(this));
        uint256 sharesAfter = vault.balanceOf(address(this));
        uint256 underlyingAfter = underlying.balanceOf(address(this));

        require(sharesAfter - sharesBefore == sharesToMint, "Wrong shares minted");
        require(underlyingBefore - underlyingAfter == assetsPulled, "Wrong assets pulled");
        require(assetsPulled == previewedAssets, "previewMint did not match mint output");

        if (!exerciceProgression[msg.sender][4]) {
            exerciceProgression[msg.sender][4] = true;
            erc4626_101Address.distributeTokens(msg.sender, 2);
        }
    }

    function ex5_testWithdraw() external {
        IExerciceSolution vault = studentVault[msg.sender];
        require(address(vault) != address(0), "No vault registered");

        // Ensure the evaluator has shares to withdraw against
        _ensureSomeShares(vault);

        uint256 sharesBefore = vault.balanceOf(address(this));
        uint256 assetsToWithdraw = 100 * 1e18;
        require(
            vault.maxWithdraw(address(this)) >= assetsToWithdraw,
            "Not enough withdrawable assets"
        );

        uint256 previewedShares = vault.previewWithdraw(assetsToWithdraw);
        uint256 underlyingBefore = underlying.balanceOf(address(this));
        uint256 sharesBurned = vault.withdraw(assetsToWithdraw, address(this), address(this));
        uint256 sharesAfter = vault.balanceOf(address(this));
        uint256 underlyingAfter = underlying.balanceOf(address(this));

        require(sharesBefore - sharesAfter == sharesBurned, "Wrong shares burned");
        require(underlyingAfter - underlyingBefore == assetsToWithdraw, "Wrong assets received");
        require(sharesBurned == previewedShares, "previewWithdraw did not match withdraw output");

        if (!exerciceProgression[msg.sender][5]) {
            exerciceProgression[msg.sender][5] = true;
            erc4626_101Address.distributeTokens(msg.sender, 2);
        }
    }

    function ex6_testRedeem() external {
        IExerciceSolution vault = studentVault[msg.sender];
        require(address(vault) != address(0), "No vault registered");

        _ensureSomeShares(vault);

        uint256 sharesBefore = vault.balanceOf(address(this));
        uint256 sharesToRedeem = sharesBefore / 4;
        require(sharesToRedeem > 0, "Not enough shares to redeem");

        uint256 previewedAssets = vault.previewRedeem(sharesToRedeem);
        uint256 underlyingBefore = underlying.balanceOf(address(this));
        uint256 assetsReceived = vault.redeem(sharesToRedeem, address(this), address(this));
        uint256 sharesAfter = vault.balanceOf(address(this));
        uint256 underlyingAfter = underlying.balanceOf(address(this));

        require(sharesBefore - sharesAfter == sharesToRedeem, "Wrong shares burned");
        require(underlyingAfter - underlyingBefore == assetsReceived, "Wrong assets received");
        require(assetsReceived == previewedAssets, "previewRedeem did not match redeem output");

        if (!exerciceProgression[msg.sender][6]) {
            exerciceProgression[msg.sender][6] = true;
            erc4626_101Address.distributeTokens(msg.sender, 2);
        }
    }

    function ex7_testPreviewConsistency() external {
        IExerciceSolution vault = studentVault[msg.sender];
        require(address(vault) != address(0), "No vault registered");

        // In a fee-less vault, previewDeposit(x) must equal convertToShares(x)
        uint256 sampleAssets = 42 * 1e18;
        require(
            vault.previewDeposit(sampleAssets) == vault.convertToShares(sampleAssets),
            "previewDeposit must equal convertToShares in a fee-less vault"
        );

        // Same for previewRedeem vs convertToAssets
        uint256 sampleShares = 17 * 1e18;
        require(
            vault.previewRedeem(sampleShares) == vault.convertToAssets(sampleShares),
            "previewRedeem must equal convertToAssets in a fee-less vault"
        );

        // Round-trip must be non-inflationary (rounding in favor of the vault)
        uint256 assets = vault.convertToAssets(sampleShares);
        uint256 sharesBack = vault.convertToShares(assets);
        require(sharesBack <= sampleShares, "Round-trip inflates shares");

        if (!exerciceProgression[msg.sender][7]) {
            exerciceProgression[msg.sender][7] = true;
            erc4626_101Address.distributeTokens(msg.sender, 1);
        }
    }

    function ex8_testYield() external {
        IExerciceSolution vault = studentVault[msg.sender];
        require(address(vault) != address(0), "No vault registered");

        // Fresh deposit for this exercise
        uint256 depositAmount = 1000 * 1e18;
        underlying.getTokens(depositAmount);
        underlying.approve(address(vault), depositAmount);
        uint256 mintedShares = vault.deposit(depositAmount, address(this));
        require(mintedShares > 0, "Deposit did not mint shares");

        // Airdrop yield directly to the vault so totalAssets grows without minting new shares
        uint256 yieldAmount = 500 * 1e18;
        underlying.getTokens(yieldAmount);
        underlying.transfer(address(vault), yieldAmount);

        // Redeem the shares from this deposit and confirm we receive more than we deposited
        uint256 underlyingBefore = underlying.balanceOf(address(this));
        uint256 assetsBack = vault.redeem(mintedShares, address(this), address(this));
        uint256 underlyingAfter = underlying.balanceOf(address(this));

        require(underlyingAfter - underlyingBefore == assetsBack, "Wrong assets received");
        require(assetsBack > depositAmount, "Share price did not increase after yield");

        if (!exerciceProgression[msg.sender][8]) {
            exerciceProgression[msg.sender][8] = true;
            erc4626_101Address.distributeTokens(msg.sender, 2);
        }
    }

    function ex9_testMaxFunctions() external {
        IExerciceSolution vault = studentVault[msg.sender];
        require(address(vault) != address(0), "No vault registered");

        require(vault.maxDeposit(address(this)) > 0, "maxDeposit should be > 0");
        require(vault.maxMint(address(this)) > 0, "maxMint should be > 0");
        require(
            vault.maxWithdraw(address(0xdead)) == 0,
            "maxWithdraw should be 0 for an account with no shares"
        );
        require(
            vault.maxRedeem(address(0xdead)) == 0,
            "maxRedeem should be 0 for an account with no shares"
        );

        if (!exerciceProgression[msg.sender][9]) {
            exerciceProgression[msg.sender][9] = true;
            erc4626_101Address.distributeTokens(msg.sender, 1);
        }
    }

    function ex10_allInOne() external {
        // The AllInOne solution must start with 0 points and end with at least 18 points
        uint256 initialBalance = erc4626_101Address.balanceOf(msg.sender);
        require(initialBalance == 0, "Solution should start with 0 points");

        IAllInOneSolution callerSolution = IAllInOneSolution(msg.sender);
        callerSolution.completeWorkshop();

        uint256 finalBalance = erc4626_101Address.balanceOf(msg.sender);
        uint256 dec = erc4626_101Address.decimals();
        require(
            finalBalance >= 10 ** dec * 18,
            "Solution should end with at least 18 points"
        );

        if (!exerciceProgression[msg.sender][10]) {
            exerciceProgression[msg.sender][10] = true;
            erc4626_101Address.distributeTokens(msg.sender, 2);
        }
    }

    /* ---------- Internal helpers ---------- */

    function _ensureSomeShares(IExerciceSolution vault) internal {
        if (vault.balanceOf(address(this)) < 200 * 1e18) {
            uint256 depositAmount = 1000 * 1e18;
            underlying.getTokens(depositAmount);
            underlying.approve(address(vault), depositAmount);
            vault.deposit(depositAmount, address(this));
        }
    }

    function _compareStrings(
        string memory a,
        string memory b
    ) internal pure returns (bool) {
        return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
    }

    /* ---------- Views ---------- */

    function readName(address studentAddress) public view returns (string memory) {
        return assignedName[studentAddress];
    }

    function readSymbol(address studentAddress) public view returns (string memory) {
        return assignedSymbol[studentAddress];
    }

    /* ---------- Admin ---------- */

    function setRandomNamesAndSymbols(
        string[20] memory _randomNames,
        string[20] memory _randomSymbols
    ) public onlyTeachers {
        randomNames = _randomNames;
        randomSymbols = _randomSymbols;
        nextValueStoreRank = 0;
        for (uint256 i = 0; i < 20; i++) {
            emit newRandomNameAndSymbol(_randomNames[i], _randomSymbols[i]);
        }
    }
}
