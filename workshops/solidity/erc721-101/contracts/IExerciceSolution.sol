// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";


interface IExerciceSolution is IERC721
{
	// Breeding function
	function isBreeder(address account) external returns (bool);

	function registrationPrice() external returns (uint256);

	function registerMeAsBreeder() external payable;

	function declareAnimal(uint sex, uint legs, bool wings, string calldata name) external returns (uint256);

	function getAnimalCharacteristics(uint animalNumber) external returns (string memory _name, bool _wings, uint _legs, uint _sex);

	function declareDeadAnimal(uint animalNumber) external;

	function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256);

	// Selling functions
	function isAnimalForSale(uint animalNumber) external view returns (bool);

	function animalPrice(uint animalNumber) external view returns (uint256);

	function buyAnimal(uint animalNumber) external payable;

	function offerForSale(uint animalNumber, uint price) external;

	// Reproduction functions

	function declareAnimalWithParents(uint sex, uint legs, bool wings, string calldata name, uint parent1, uint parent2) external returns (uint256);

	function getParents(uint animalNumber) external returns (uint256, uint256);

	function canReproduce(uint animalNumber) external returns (bool);

	function reproductionPrice(uint animalNumber) external view returns (uint256);

	function offerForReproduction(uint animalNumber, uint priceOfReproduction) external returns (uint256);

	function authorizedBreederToReproduce(uint animalNumber) external returns (address);

	function payForReproduction(uint animalNumber) external payable;
}
