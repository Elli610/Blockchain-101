// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;
pragma experimental ABIEncoderV2;

import "./PointERC20.sol";
import "./IExerciceSolution.sol";
import "./IRichERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IPositionManager} from "./interfaces/IPositionManager.sol";
import {IStateView} from "./interfaces/IStateView.sol";
import {LPFeeLibrary} from "@uniswap/v4-core/src/libraries/LPFeeLibrary.sol";
import {PositionInfo, PositionInfoLibrary} from "./utils/PositionInfoLibrary.sol";
import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";

uint24 constant POOL_FEE = 500;
uint256 constant SCALE = 1e18;
uint256 constant Q96 = 0x1000000000000000000000000;

contract Evaluator {
    using PoolIdLibrary for PoolKey;
    using LPFeeLibrary for uint24;
    using PositionInfoLibrary for PositionInfo;

    mapping(address => bool) public teachers;
    PointERC20 public TDAMM;

    ERC20 public dummyToken;
    IPositionManager public positionManagerV4;
    IStateView public stateViewV4;
    address public WETH;

    uint256[20] private randomSupplies;
    string[20] private randomTickers;
    uint public nextValueStoreRank;

    mapping(address => string) public assignedTicker;
    mapping(address => uint256) public assignedSupply;
    mapping(address => mapping(uint256 => bool)) public exerciceProgression;
    mapping(address => IRichERC20) public studentErc20;
    mapping(address => IExerciceSolution) public studentExercice;
    mapping(address => bool) public hasBeenPaired;

    event newRandomTickerAndSupply(string ticker, uint256 supply);
    event constructedCorrectly(
        address erc20Address,
        address dummyTokenAddress,
        address positionManagerAddress,
        address wethAddress
    );

    constructor(
        PointERC20 _TDAMM,
        ERC20 _dummyToken,
        IPositionManager _positionManagerV4,
        IStateView _stateViewV4,
        address _WETH
    ) {
        TDAMM = _TDAMM;
        dummyToken = _dummyToken;
        positionManagerV4 = _positionManagerV4;
        stateViewV4 = _stateViewV4;
        WETH = _WETH;
        emit constructedCorrectly(
            address(TDAMM),
            address(_dummyToken),
            address(_positionManagerV4),
            _WETH
        );
    }

    fallback() external payable {}

    receive() external payable {}

    function ex1_showIHaveTokens() public {
        require(
            dummyToken.balanceOf(msg.sender) > 0,
            "You do not hold dummyTokens. Buy them on Uniswap"
        );

        if (!exerciceProgression[msg.sender][1]) {
            exerciceProgression[msg.sender][1] = true;
            TDAMM.distributeTokens(msg.sender, 2);
        }
    }

    function ex2_showIProvidedLiquidity(uint256 positionId) public {
        // Getting address from factory for pair dummyToken / WETH
        (address token0, address token1) = address(dummyToken) < WETH
            ? (address(dummyToken), WETH)
            : (WETH, address(dummyToken));

        PoolKey memory dummyTokenAndWethKey = PoolKey({
            currency0: Currency.wrap(token0),
            currency1: Currency.wrap(token1),
            fee: POOL_FEE,
            tickSpacing: POOL_FEE.isDynamicFee()
                ? int24(60)
                : int24((POOL_FEE / 100) * 2),
            hooks: IHooks(address(0))
        });

        // Checking if caller holds LP token
        require(
            IERC721(address(positionManagerV4)).ownerOf(positionId) ==
                msg.sender,
            "Owner is not caller"
        );
        (PoolKey memory tokenPoolKey, ) = positionManagerV4
            .getPoolAndPositionInfo(positionId);

        require(
            dummyTokenAndWethKey.currency0 == tokenPoolKey.currency0 &&
                dummyTokenAndWethKey.currency1 == tokenPoolKey.currency1 &&
                dummyTokenAndWethKey.fee == tokenPoolKey.fee &&
                dummyTokenAndWethKey.tickSpacing == tokenPoolKey.tickSpacing &&
                address(dummyTokenAndWethKey.hooks) ==
                address(tokenPoolKey.hooks),
            "The provided token id does not match the wanted pool"
        );

        if (!exerciceProgression[msg.sender][2]) {
            exerciceProgression[msg.sender][2] = true;
            TDAMM.distributeTokens(msg.sender, 2);
        }
    }

    function ex6a_getTickerAndSupply() public {
        assignedSupply[msg.sender] =
            randomSupplies[nextValueStoreRank] *
            1000000000000000000;

        assignedTicker[msg.sender] = randomTickers[nextValueStoreRank];

        nextValueStoreRank += 1;
        if (nextValueStoreRank >= 20) {
            nextValueStoreRank = 0;
        }

        // Crediting points
        if (!exerciceProgression[msg.sender][5]) {
            exerciceProgression[msg.sender][5] = true;
            TDAMM.distributeTokens(msg.sender, 2);
        }
    }

    function ex6b_testErc20TickerAndSupply() public {
        // Checking ticker and supply were received
        require(exerciceProgression[msg.sender][5]);

        // Checking ticker was set properly
        require(
            _compareStrings(
                assignedTicker[msg.sender],
                studentErc20[msg.sender].symbol()
            ),
            "Incorrect ticker"
        );
        // Checking supply was set properly
        require(
            assignedSupply[msg.sender] ==
                studentErc20[msg.sender].totalSupply(),
            "Incorrect supply"
        );
        // Checking some ERC20 functions were created
        require(
            studentErc20[msg.sender].allowance(address(this), msg.sender) == 0,
            "Allowance not implemented or incorrectly set"
        );
        require(
            studentErc20[msg.sender].balanceOf(address(this)) == 0,
            "BalanceOf not implemented or incorrectly set"
        );
        require(
            studentErc20[msg.sender].approve(msg.sender, 10),
            "Approve not implemented"
        );

        // Crediting points
        if (!exerciceProgression[msg.sender][6]) {
            exerciceProgression[msg.sender][6] = true;
            // Creating ERC20
            TDAMM.distributeTokens(msg.sender, 2);
        }
    }

    function ex7_tokenIsTradableOnUniswap() public {
        // Retrieving address of pair from library
        (address token0, address token1) = address(studentErc20[msg.sender]) <
            WETH
            ? (address(studentErc20[msg.sender]), WETH)
            : (WETH, address(studentErc20[msg.sender]));

        PoolId studentId = studentTokenAndWethKey(token0, token1).toId();

        (
            uint160 sqrtPriceX96,
            int24 tick,
            uint24 protocolFee,
            uint24 lpFee
        ) = stateViewV4.getSlot0(studentId);

        require(
            sqrtPriceX96 != 0 && tick != 0 && protocolFee != 0 && lpFee != 0,
            "Student's pool is not setup"
        );

        // Crediting points
        if (!exerciceProgression[msg.sender][7]) {
            exerciceProgression[msg.sender][7] = true;
            // Creating ERC20
            TDAMM.distributeTokens(msg.sender, 5);
        }
    }

    function ex8_contractCanSwapVsEth() public {
        // Retrieving address of pair from library
        (address token0, address token1) = address(studentErc20[msg.sender]) <
            WETH
            ? (address(studentErc20[msg.sender]), WETH)
            : (WETH, address(studentErc20[msg.sender]));

        PoolId studentId = studentTokenAndWethKey(token0, token1).toId();

        // Check quote before swap
        (uint160 sqrtPriceX96, , , ) = stateViewV4.getSlot0(studentId);
        uint256 initialSqrtPriceScaled = (SCALE * uint256(sqrtPriceX96)) / Q96;

        // Checking caller balance before executing contract
        uint initialBalance = studentErc20[msg.sender].balanceOf(
            address(studentExercice[msg.sender])
        );

        // Calling student contract to tell him to provide liquidity
        studentExercice[msg.sender].swapYourTokenForEth();

        // Check quote after swap
        (uint160 secondSqrtPriceX96, , , ) = stateViewV4.getSlot0(studentId);
        uint256 finalSqrtPriceScaled = (SCALE * uint256(secondSqrtPriceX96)) /
            Q96;

        require(
            initialSqrtPriceScaled != finalSqrtPriceScaled,
            "No price change in your token's pool"
        );

        // Checking your token balance after calling the exercice
        uint finalBalance = studentErc20[msg.sender].balanceOf(
            address(studentExercice[msg.sender])
        );

        require(
            initialBalance != finalBalance,
            "You still have the same amount of tokens"
        );

        // Crediting points
        if (!exerciceProgression[msg.sender][8]) {
            exerciceProgression[msg.sender][8] = true;
            // Creating ERC20
            TDAMM.distributeTokens(msg.sender, 1);
        }
    }

    function ex9_contractCanSwapVsDummyToken() public {
        // Retrieving address of the first pair from library
        (address token0, address token1) = address(studentErc20[msg.sender]) <
            WETH
            ? (address(studentErc20[msg.sender]), WETH)
            : (WETH, address(studentErc20[msg.sender]));

        PoolId studentId = studentTokenAndWethKey(token0, token1).toId();

        // Retrieving address of the second pair from library
        (address token2, address token3) = WETH < address(dummyToken)
            ? (WETH, address(dummyToken))
            : (address(dummyToken), WETH);

        PoolId dummyTokenAndWethKey = PoolKey({
            currency0: Currency.wrap(token2),
            currency1: Currency.wrap(token3),
            fee: POOL_FEE,
            tickSpacing: POOL_FEE.isDynamicFee()
                ? int24(60)
                : int24((POOL_FEE / 100) * 2),
            hooks: IHooks(address(0))
        }).toId();

        // Check quote before swap
        (uint160 firstStudentSqrtPriceX96, , , ) = stateViewV4.getSlot0(
            studentId
        );
        uint256 initialStudentSqrtPriceScaled = (SCALE *
            uint256(firstStudentSqrtPriceX96)) / Q96;
        (uint160 firstDummySqrtPriceX96, , , ) = stateViewV4.getSlot0(
            dummyTokenAndWethKey
        );
        uint256 initialDummySqrtPriceScaled = (SCALE *
            uint256(firstDummySqrtPriceX96)) / Q96;

        // Checking caller balance before executing contract
        uint initialBalance = studentErc20[msg.sender].balanceOf(
            address(studentExercice[msg.sender])
        );
        uint initialDummyBalance = dummyToken.balanceOf(
            address(studentExercice[msg.sender])
        );

        // Calling student contract to tell him to provide liquidity
        studentExercice[msg.sender].swapYourTokenForDummyToken();

        // Check quote after swap
        (uint160 secondSqrtPriceX96, , , ) = stateViewV4.getSlot0(studentId);
        uint256 finalStudentSqrtPriceScaled = (SCALE *
            uint256(secondSqrtPriceX96)) / Q96;

        (uint160 secondDummySqrtPriceX96, , , ) = stateViewV4.getSlot0(
            dummyTokenAndWethKey
        );
        uint256 finalDummySqrtPriceScaled = (SCALE *
            uint256(secondDummySqrtPriceX96)) / Q96;

        // Checking your token balance after calling the exercice
        uint finalBalance = studentErc20[msg.sender].balanceOf(
            address(studentExercice[msg.sender])
        );
        uint finalDummyBalance = dummyToken.balanceOf(
            address(studentExercice[msg.sender])
        );

        require(
            initialStudentSqrtPriceScaled != finalStudentSqrtPriceScaled,
            "No price change in your token's pool"
        );
        require(
            initialDummySqrtPriceScaled != finalDummySqrtPriceScaled,
            "No price change in the dummy token's pool"
        );
        require(
            initialBalance != finalBalance,
            "You still have the same amount of your tokens"
        );
        require(
            initialDummyBalance != finalDummyBalance,
            "You still have the same amount of dummy tokens"
        );

        // Crediting points
        if (!exerciceProgression[msg.sender][9]) {
            exerciceProgression[msg.sender][9] = true;
            // Creating ERC20
            TDAMM.distributeTokens(msg.sender, 2);
        }
    }

    function ex10_contractCanProvideLiquidity() public {
        // Retrieving address of pair from library
        (address token0, address token1) = address(studentErc20[msg.sender]) <
            WETH
            ? (address(studentErc20[msg.sender]), WETH)
            : (WETH, address(studentErc20[msg.sender]));

        PoolId studentId = studentTokenAndWethKey(token0, token1).toId();

        // Checking pool liquidity before calling exercice contract
        uint128 initialLiquidity = stateViewV4.getLiquidity(studentId);

        // Calling student contract to tell him to provide liquidity
        studentExercice[msg.sender].addLiquidity();

        // Checking pool liquidity after calling exercice contract
        uint128 finalLiquidity = stateViewV4.getLiquidity(studentId);

        require(
            finalLiquidity > initialLiquidity,
            "No liquidity increase in your token's pool"
        );

        // Crediting points
        if (!exerciceProgression[msg.sender][10]) {
            exerciceProgression[msg.sender][10] = true;
            // Creating ERC20
            TDAMM.distributeTokens(msg.sender, 2);
        }
    }

    function ex11_contractCansLiquidity() public {
        // Retrieving address of pair from library
        (address token0, address token1) = address(studentErc20[msg.sender]) <
            WETH
            ? (address(studentErc20[msg.sender]), WETH)
            : (WETH, address(studentErc20[msg.sender]));

        PoolId studentId = studentTokenAndWethKey(token0, token1).toId();

        // Checking pool liquidity before calling exercice contract
        uint128 initialLiquidity = stateViewV4.getLiquidity(studentId);

        // Calling student contract to tell him to provide liquidity
        studentExercice[msg.sender].addLiquidity();

        // Checking pool liquidity after calling exercice contract
        uint128 finalLiquidity = stateViewV4.getLiquidity(studentId);

        require(
            finalLiquidity < initialLiquidity,
            "No liquidity decrease in your token's pool"
        );

        // Crediting points
        if (!exerciceProgression[msg.sender][11]) {
            exerciceProgression[msg.sender][11] = true;
            // Creating ERC20
            TDAMM.distributeTokens(msg.sender, 2);
        }
    }

    modifier onlyTeachers() {
        require(TDAMM.teachers(msg.sender));
        _;
    }

    function submitExercice(IExerciceSolution studentExercice_) public {
        // Checking this contract was not used by another group before
        require(!hasBeenPaired[address(studentExercice_)]);

        // Assigning passed ERC20 as student ERC20
        studentExercice[msg.sender] = studentExercice_;
        hasBeenPaired[address(studentExercice_)] = true;
    }

    function submitErc20(IRichERC20 studentErc20_) public {
        // Checking this contract was not used by another group before
        require(!hasBeenPaired[address(studentErc20_)]);
        // Assigning passed ERC20 as student ERC20
        studentErc20[msg.sender] = studentErc20_;
        hasBeenPaired[address(studentErc20_)] = true;
    }

    function _compareStrings(
        string memory a,
        string memory b
    ) internal pure returns (bool) {
        return (keccak256(abi.encodePacked((a))) ==
            keccak256(abi.encodePacked((b))));
    }

    function bytes32ToString(
        bytes32 _bytes32
    ) public pure returns (string memory) {
        uint8 i = 0;
        while (i < 32 && _bytes32[i] != 0) {
            i++;
        }
        bytes memory bytesArray = new bytes(i);
        for (i = 0; i < 32 && _bytes32[i] != 0; i++) {
            bytesArray[i] = _bytes32[i];
        }
        return string(bytesArray);
    }

    function readTicker(
        address studentAddres
    ) public view returns (string memory) {
        return assignedTicker[studentAddres];
    }

    function readSupply(address studentAddres) public view returns (uint256) {
        return assignedSupply[studentAddres];
    }

    function setRandomTickersAndSupply(
        uint256[20] memory _randomSupplies,
        string[20] memory _randomTickers
    ) public onlyTeachers {
        randomSupplies = _randomSupplies;
        randomTickers = _randomTickers;
        nextValueStoreRank = 0;
        for (uint i = 0; i < 20; i++) {
            emit newRandomTickerAndSupply(randomTickers[i], randomSupplies[i]);
        }
    }

    function studentTokenAndWethKey(
        address token0,
        address token1
    ) internal pure returns (PoolKey memory) {
        return
            PoolKey({
                currency0: Currency.wrap(token0),
                currency1: Currency.wrap(token1),
                fee: POOL_FEE,
                tickSpacing: POOL_FEE.isDynamicFee()
                    ? int24(60)
                    : int24((POOL_FEE / 100) * 2),
                hooks: IHooks(address(0))
            });
    }
}
