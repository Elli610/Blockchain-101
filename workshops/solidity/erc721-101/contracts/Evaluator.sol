// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;
pragma experimental ABIEncoderV2;

import "./ERC20Points.sol";
import "./IExerciceSolution.sol";

contract Evaluator {
    mapping(address => bool) public teachers;
    ERC20Points pointsERC20;

    mapping(address => mapping(uint256 => bool)) public exerciceProgression;
    mapping(address => IExerciceSolution) public studentExerciceSolution;
    mapping(address => bool) public hasBeenPaired;

    string[20] private randomNames;
    uint256[20] private randomLegs;
    uint256[20] private randomSex;
    bool[20] private randomWings;
    mapping(address => uint256) public assignedRank;
    uint public nextValueStoreRank;

    event newRandomAnimalAttributes(
        string name,
        uint256 legs,
        uint256 sex,
        bool wings
    );
    event constructedCorrectly(address erc20Address);

    constructor(ERC20Points _ERC20Points) {
        pointsERC20 = _ERC20Points;
        emit constructedCorrectly(address(pointsERC20));
    }

    fallback() external payable {}

    receive() external payable {}

    function ex1_testERC721() public {
        // Checking a solution was submitted
        require(exerciceProgression[msg.sender][0], "No solution submitted");

        // Check that token 1 belongs to the Evaluator
        require(
            studentExerciceSolution[msg.sender].balanceOf(address(this)) == 1
        );
        require(
            studentExerciceSolution[msg.sender].ownerOf(1) == address(this)
        );
        // Check that token 1 can be transferred back to msg.sender
        studentExerciceSolution[msg.sender].safeTransferFrom(
            address(this),
            msg.sender,
            1
        );
        require(
            studentExerciceSolution[msg.sender].balanceOf(address(this)) == 0
        );
        require(studentExerciceSolution[msg.sender].ownerOf(1) == msg.sender);

        // Crediting points
        if (!exerciceProgression[msg.sender][1]) {
            exerciceProgression[msg.sender][1] = true;
            // ERC721 points
            pointsERC20.distributeTokens(msg.sender, 2);
        }
    }

    function ex2a_getAnimalToCreateAttributes() public {
        assignedRank[msg.sender] = nextValueStoreRank;
        nextValueStoreRank += 1;
        if (nextValueStoreRank >= 20) {
            nextValueStoreRank = 0;
        }
    }

    function ex2b_testDeclaredAnimal(uint animalNumber) public {
        // Checking a solution was submitted
        require(exerciceProgression[msg.sender][0], "No solution submitted");

        // Retrieve expected characteristics
        string memory name = readName(msg.sender);
        bool wings = readWings(msg.sender);
        uint legs = readLegs(msg.sender);
        uint sex = readSex(msg.sender);

        // Check animal belongs to Evaluator
        require(
            studentExerciceSolution[msg.sender].ownerOf(animalNumber) ==
                address(this),
            "Created animal doesn't belong to Evaluator"
        );

        // Check that properties are visible
        (
            string memory _name,
            bool _wings,
            uint _legs,
            uint _sex
        ) = studentExerciceSolution[msg.sender].getAnimalCharacteristics(
                animalNumber
            );
        require(
            _compareStrings(name, _name) &&
                (wings == _wings) &&
                (legs == _legs) &&
                (sex == _sex),
            "Created animal doesn't have correct characteristics"
        );

        // Crediting points
        if (!exerciceProgression[msg.sender][2]) {
            exerciceProgression[msg.sender][2] = true;
            pointsERC20.distributeTokens(msg.sender, 2);
        }
    }

    function ex3_testRegisterBreeder() public {
        // Checking a solution was submitted
        require(exerciceProgression[msg.sender][0], "No solution submitted");

        // Verify that contract is not a registeredBreeder yet
        require(
            !studentExerciceSolution[msg.sender].isBreeder(address(this)),
            "Evaluator is already breeder"
        );

        // Register as a breeder
        uint256 registrationPrice = studentExerciceSolution[msg.sender]
            .registrationPrice();
        require(
            address(this).balance >= registrationPrice,
            "Evaluator does not have enough ETH, plz giv eth"
        );
        studentExerciceSolution[msg.sender].registerMeAsBreeder{
            value: registrationPrice
        }();
        require(
            studentExerciceSolution[msg.sender].isBreeder(address(this)),
            "Evaluator is not a breeder"
        );
        // Crediting points
        if (!exerciceProgression[msg.sender][3]) {
            exerciceProgression[msg.sender][3] = true;
            pointsERC20.distributeTokens(msg.sender, 2);
        }
    }

    function ex4_testDeclareAnimal() public {
        // Checking a solution was submitted
        require(exerciceProgression[msg.sender][0], "No solution submitted");

        // Verify that contract is a registeredBreeder
        require(
            studentExerciceSolution[msg.sender].isBreeder(address(this)),
            "Evaluator is not a breeder"
        );
        uint256 initBalance = studentExerciceSolution[msg.sender].balanceOf(
            address(this)
        );
        string memory name = readName(msg.sender);
        bool wings = readWings(msg.sender);
        uint legs = readLegs(msg.sender);
        uint sex = readSex(msg.sender);
        // Declare an animal
        uint animalNumber = studentExerciceSolution[msg.sender].declareAnimal(
            sex,
            legs,
            wings,
            name
        );

        // Check animal belongs to Evaluator
        require(
            studentExerciceSolution[msg.sender].ownerOf(animalNumber) ==
                address(this),
            "Created animal doesn't belong to Evaluator"
        );
        require(
            studentExerciceSolution[msg.sender].balanceOf(address(this)) ==
                initBalance + 1,
            "Evaluator balance did not increase"
        );

        // Check that properties are visible
        (
            string memory _name,
            bool _wings,
            uint _legs,
            uint _sex
        ) = studentExerciceSolution[msg.sender].getAnimalCharacteristics(
                animalNumber
            );
        require(
            _compareStrings(name, _name) &&
                (wings == _wings) &&
                (legs == _legs) &&
                (sex == _sex),
            "Created animal doesn't have correct characteristics"
        );

        // Crediting points
        if (!exerciceProgression[msg.sender][4]) {
            exerciceProgression[msg.sender][4] = true;
            pointsERC20.distributeTokens(msg.sender, 2);
        }
    }

    function ex5_declareDeadAnimal() public {
        // Getting initial token balance. Must be at least 1
        uint256 initBalance = studentExerciceSolution[msg.sender].balanceOf(
            address(this)
        );

        // Getting an animal id of Evaluator
        uint animalNumber = studentExerciceSolution[msg.sender]
            .tokenOfOwnerByIndex(address(this), 0);

        // Declaring it as dead
        studentExerciceSolution[msg.sender].declareDeadAnimal(animalNumber);

        // Checking end balance
        uint256 endBalance = studentExerciceSolution[msg.sender].balanceOf(
            address(this)
        );
        require(
            initBalance - endBalance == 1,
            "Evaluator has the same amount of tokens as before"
        );

        // Check that properties are deleted
        (
            string memory _name,
            bool _wings,
            uint _legs,
            uint _sex
        ) = studentExerciceSolution[msg.sender].getAnimalCharacteristics(
                animalNumber
            );
        require(
            _compareStrings("", _name) &&
                (false == _wings) &&
                (0 == _legs) &&
                (0 == _sex),
            "Killed animal characteristics not reseted"
        );

        // Testing killing another person's animal. The caller has to hold an animal
        uint exerciceSolutionAnimalNumber = studentExerciceSolution[msg.sender]
            .tokenOfOwnerByIndex(msg.sender, 0);
        require(
            studentExerciceSolution[msg.sender].ownerOf(
                exerciceSolutionAnimalNumber
            ) == msg.sender,
            "You have to hold an animal"
        );

        // Evaluator tries to declare a dead animal that does not belong to him
        bool wasKillAccepted = false;
        try
            studentExerciceSolution[msg.sender].declareDeadAnimal(
                exerciceSolutionAnimalNumber
            )
        {
            wasKillAccepted = true;
        } catch {
            // This is executed in case revert() was used.
            wasKillAccepted = false;
        }

        require(!wasKillAccepted, "Evaluator was able to kill your animal");

        // Crediting points
        if (!exerciceProgression[msg.sender][5]) {
            exerciceProgression[msg.sender][5] = true;
            pointsERC20.distributeTokens(msg.sender, 2);
        }
    }

    function ex6a_auctionAnimal_offer() public {
        // Offer an animal for sale. Evaluator must hold at least one animal.
        // Getting an animal id of Evaluator
        uint animalNumber = studentExerciceSolution[msg.sender]
            .tokenOfOwnerByIndex(address(this), 0);

        // Testing that animal is not for sale yet
        require(
            !studentExerciceSolution[msg.sender].isAnimalForSale(animalNumber),
            "Animal not for sale yet"
        );
        require(
            studentExerciceSolution[msg.sender].animalPrice(animalNumber) == 0,
            "Animal as not been auctionned yet"
        );

        // Trying to buy animal not for sale
        bool wasBuyAccepted = false;
        try studentExerciceSolution[msg.sender].buyAnimal(animalNumber) {
            wasBuyAccepted = true;
        } catch {
            // This is executed in case revert() was used.
            wasBuyAccepted = false;
        }
        require(!wasBuyAccepted, "I was able to buy an animal not for sale");

        // Offering animal for sale
        studentExerciceSolution[msg.sender].offerForSale(
            animalNumber,
            0.0001 ether
        );

        // Checking it is for sale
        require(
            studentExerciceSolution[msg.sender].isAnimalForSale(animalNumber),
            "Animal not for sale"
        );
        require(
            studentExerciceSolution[msg.sender].animalPrice(animalNumber) ==
                0.0001 ether,
            "Animal price is incorrect"
        );

        // Crediting points
        if (!exerciceProgression[msg.sender][61]) {
            exerciceProgression[msg.sender][61] = true;
            pointsERC20.distributeTokens(msg.sender, 1);
        }
    }

    function ex6b_auctionAnimal_buy(uint animalForSale) public {
        // Buy an animal that is on sale.
        // Getting initial token balance
        uint256 initBalance = studentExerciceSolution[msg.sender].balanceOf(
            address(this)
        );

        // Verify the animal does not belong to evaluator
        require(
            studentExerciceSolution[msg.sender].ownerOf(animalForSale) !=
                address(this),
            "This animal already belongs to me"
        );

        // Verify that the animal is offered for sale
        require(
            studentExerciceSolution[msg.sender].isAnimalForSale(animalForSale),
            "This animal is not for sale"
        );

        // Check the price of animal
        uint animalPrice = studentExerciceSolution[msg.sender].animalPrice(
            animalForSale
        );
        require(
            address(this).balance >= animalPrice,
            "Your animal is too expensive for me"
        );

        // Buy the animal
        studentExerciceSolution[msg.sender].buyAnimal{value: animalPrice}(
            animalForSale
        );

        // Check that it is mine
        require(
            studentExerciceSolution[msg.sender].ownerOf(animalForSale) ==
                address(this),
            "This animal was not transferred to me"
        );
        require(
            studentExerciceSolution[msg.sender].balanceOf(address(this)) ==
                initBalance + 1,
            "Evaluator balance did not increase"
        );

        // Crediting points
        if (!exerciceProgression[msg.sender][62]) {
            exerciceProgression[msg.sender][62] = true;
            pointsERC20.distributeTokens(msg.sender, 2);
        }
    }

    /* Internal functions and modifiers */
    function submitExercice(IExerciceSolution studentExercice) public {
        // Checking this contract was not used by another group before
        require(!hasBeenPaired[address(studentExercice)]);

        // Assigning passed ERC20 as student ERC20
        studentExerciceSolution[msg.sender] = studentExercice;
        hasBeenPaired[address(studentExercice)] = true;

        if (!exerciceProgression[msg.sender][0]) {
            exerciceProgression[msg.sender][0] = true;
            // setup points
            pointsERC20.distributeTokens(msg.sender, 2);
            // Deploying contract points
            pointsERC20.distributeTokens(msg.sender, 2);
        }
    }

    modifier onlyTeachers() {
        require(pointsERC20.teachers(msg.sender));
        _;
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

    function readName(
        address studentAddres
    ) public view returns (string memory) {
        return randomNames[assignedRank[studentAddres]];
    }

    function readLegs(address studentAddres) public view returns (uint256) {
        return randomLegs[assignedRank[studentAddres]];
    }

    function readSex(address studentAddres) public view returns (uint256) {
        return randomSex[assignedRank[studentAddres]];
    }

    function readWings(address studentAddres) public view returns (bool) {
        return randomWings[assignedRank[studentAddres]];
    }

    function setRandomValuesStore(
        string[20] memory _randomNames,
        uint256[20] memory _randomLegs,
        uint256[20] memory _randomSex,
        bool[20] memory _randomWings
    ) public onlyTeachers {
        randomNames = _randomNames;
        randomLegs = _randomLegs;
        randomSex = _randomSex;
        randomWings = _randomWings;
        nextValueStoreRank = 0;
        for (uint i = 0; i < 20; i++) {
            emit newRandomAnimalAttributes(
                _randomNames[i],
                _randomLegs[i],
                _randomSex[i],
                _randomWings[i]
            );
        }
    }
}
