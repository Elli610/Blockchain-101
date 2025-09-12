// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;
pragma experimental ABIEncoderV2;

import "./ERC20Points.sol";
import "./IExerciceSolution.sol";

contract Evaluator2 {
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

    constructor(ERC20Points _pointsERC20) {
        pointsERC20 = _pointsERC20;
        emit constructedCorrectly(address(pointsERC20));
    }

    fallback() external payable {}

    receive() external payable {}

    function ex2a_getAnimalToCreateAttributes() public {
        assignedRank[msg.sender] = nextValueStoreRank;
        nextValueStoreRank += 1;
        if (nextValueStoreRank >= 20) {
            nextValueStoreRank = 0;
        }
    }

    function ex7a_breedAnimalWithParents(uint parent1, uint parent2) public {
        // Declare animal with parents

        // Verify that contract is a registeredBreeder
        uint256 initBalance = studentExerciceSolution[msg.sender].balanceOf(
            address(this)
        );
        string memory name = readName(msg.sender);
        bool wings = readWings(msg.sender);
        uint legs = readLegs(msg.sender);
        uint sex = readSex(msg.sender);

        // Check if parents exist
        require(
            studentExerciceSolution[msg.sender].ownerOf(parent1) != address(0),
            "Parent1 has no owner"
        );
        require(
            studentExerciceSolution[msg.sender].ownerOf(parent2) != address(0),
            "Parent2 has no owner"
        );

        // Declare an animal with parents
        uint animalNumber = studentExerciceSolution[msg.sender]
            .declareAnimalWithParents(sex, legs, wings, name, parent1, parent2);

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
        (uint parent1_, uint parent2_) = studentExerciceSolution[msg.sender]
            .getParents(animalNumber);
        require(
            (parent1_ == parent1) && (parent2_ == parent2),
            "Parents are not retrieved correctly"
        );

        // Crediting points
        if (!exerciceProgression[msg.sender][71]) {
            exerciceProgression[msg.sender][71] = true;
            pointsERC20.distributeTokens(msg.sender, 1);
        }
    }

    function ex7b_offerAnimalForReproduction() public {
        // Offer an animal for reproduction. Evaluator must hold at least one animal.
        // Getting an animal id of Evaluator
        uint animalNumber = studentExerciceSolution[msg.sender]
            .tokenOfOwnerByIndex(address(this), 0);

        // Testing that animal is not for reproduction yet
        require(
            !studentExerciceSolution[msg.sender].canReproduce(animalNumber),
            "Animal not for available for reproduction yet"
        );
        require(
            studentExerciceSolution[msg.sender].reproductionPrice(
                animalNumber
            ) == 0,
            "Animal not selling his ass yet"
        );

        // Offering animal for reproduction
        studentExerciceSolution[msg.sender].offerForReproduction(
            animalNumber,
            0.0001 ether
        );

        // Checking it is for reproduction
        require(
            studentExerciceSolution[msg.sender].canReproduce(animalNumber),
            "Animal reproduction not offered"
        );
        require(
            studentExerciceSolution[msg.sender].reproductionPrice(
                animalNumber
            ) == 0.0001 ether,
            "Animal reproduction price is incorrect"
        );

        // Try to set a reproduction for animals that's not ours. Sender should have an animal
        uint animalNumber2 = studentExerciceSolution[msg.sender]
            .tokenOfOwnerByIndex(msg.sender, 0);

        bool wasFeinteAccepted = false;
        try
            studentExerciceSolution[msg.sender].offerForReproduction(
                animalNumber2,
                0.0001 ether
            )
        {
            wasFeinteAccepted = true;
        } catch {
            // This is executed in case revert() was used.
            wasFeinteAccepted = false;
        }
        require(
            !wasFeinteAccepted,
            "I was able to set a price for an animal which is not mine"
        );

        // Crediting points
        if (!exerciceProgression[msg.sender][72]) {
            exerciceProgression[msg.sender][72] = true;
            pointsERC20.distributeTokens(msg.sender, 1);
        }
    }

    function ex7c_payForReproduction(
        uint animalAvailableForReproduction
    ) public {
        // Check animal is available for reproduction
        require(
            studentExerciceSolution[msg.sender].canReproduce(
                animalAvailableForReproduction
            ),
            "Offered animal not available for reproduction yet"
        );

        // Checking animal is not ours
        require(
            studentExerciceSolution[msg.sender].ownerOf(
                animalAvailableForReproduction
            ) != address(this),
            "Offered animal shouldn't belong to Evaluator"
        );

        // Selecting one of our animal for reproduction
        uint animalNumber = studentExerciceSolution[msg.sender]
            .tokenOfOwnerByIndex(address(this), 0);

        // Check we are not able to reproduce yet
        require(
            studentExerciceSolution[msg.sender].authorizedBreederToReproduce(
                animalAvailableForReproduction
            ) != address(this),
            "I am already allowed to reproduce"
        );
        uint reproductionPrice = studentExerciceSolution[msg.sender]
            .reproductionPrice(animalAvailableForReproduction);

        // Try to reproduce without paying
        string memory name = readName(msg.sender);
        bool wings = readWings(msg.sender);
        uint legs = readLegs(msg.sender);
        uint sex = readSex(msg.sender);

        bool wasReproductionAccepted = false;
        try
            studentExerciceSolution[msg.sender].declareAnimalWithParents(
                sex,
                legs,
                wings,
                name,
                animalNumber,
                animalAvailableForReproduction
            )
        {
            wasReproductionAccepted = true;
        } catch {
            // This is executed in case revert() was used.
            wasReproductionAccepted = false;
        }
        require(
            !wasReproductionAccepted,
            "I was able to reproduce an unavailable animal"
        );

        // Pay for reproduction
        require(
            address(this).balance >= reproductionPrice,
            "Your reproduction is too expensive for me"
        );
        studentExerciceSolution[msg.sender].payForReproduction{
            value: reproductionPrice
        }(animalAvailableForReproduction);
        require(
            studentExerciceSolution[msg.sender].authorizedBreederToReproduce(
                animalAvailableForReproduction
            ) == address(this),
            "I am not allowed to reproduce"
        );

        // Reproduce
        ex7a_breedAnimalWithParents(
            animalNumber,
            animalAvailableForReproduction
        );
        require(
            studentExerciceSolution[msg.sender].authorizedBreederToReproduce(
                animalAvailableForReproduction
            ) != address(this),
            "I should not be able to reproduce"
        );

        // Crediting points
        if (!exerciceProgression[msg.sender][73]) {
            exerciceProgression[msg.sender][73] = true;
            pointsERC20.distributeTokens(msg.sender, 1);
        }
    }

    /* Internal functions and modifiers */
    function submitExercice(IExerciceSolution studentExercice) public {
        // Checking this contract was not used by another group before
        require(!hasBeenPaired[address(studentExercice)]);

        // Assigning passed ERC20 as student ERC20
        studentExerciceSolution[msg.sender] = studentExercice;
        hasBeenPaired[address(studentExercice)] = true;
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
