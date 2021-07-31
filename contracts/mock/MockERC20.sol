// SPDX-License-Identifier: MIT
pragma solidity 0.6.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20, Ownable {
    receive() external payable {
        _mint(msg.sender, msg.value);
    }

    constructor(string memory _name, string memory _symbol) public ERC20(_name, _symbol) {}

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function burn(address _from, uint256 _amount) public onlyOwner {
        _burn(_from, _amount);
    }

    /**
     * @dev This function is only here to accommodate nested Link token
     *      functionality required in mocking the random number calls.
     */
    function transferAndCall(
        address,
        uint256,
        bytes calldata
    ) external pure returns (bool success) {
        return true;
    }
}
