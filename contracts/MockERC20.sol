// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) {}

    function mint(address _to, uint256 amount) external {
        require(_to != address(0), "Invalid address");
        _mint(_to, amount);
    }
}