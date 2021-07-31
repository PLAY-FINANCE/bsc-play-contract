// SPDX-License-Identifier: MIT
pragma solidity 0.6.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockVault is ERC20, Ownable {
    address private _token;
    uint256 private _playDistributorPoolId;
    bool private _isSetPoolId;
    address private _playDistributor;

    receive() external payable {
        _mint(msg.sender, msg.value);
    }

    constructor(
        address playDistributor_,
        address token_,
        string memory _name,
        string memory _symbol
    ) public ERC20(_name, _symbol) {
        _playDistributor = playDistributor_;
        _token = token_;
        _isSetPoolId = false;
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function getToken() external view returns (address) {
        return _token;
    }

    function setPoolId(uint256 poolId_) external {
        require(msg.sender == _playDistributor, "only playDistributor");
        require(!_isSetPoolId, "set already");

        _playDistributorPoolId = poolId_;
        _isSetPoolId = true;
    }

    function getPoolId() external view returns (uint256) {
        require(_isSetPoolId, "pool id must be set");
        return _playDistributorPoolId;
    }
}
