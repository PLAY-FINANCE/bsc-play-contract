// SPDX-License-Identifier: MIT
pragma solidity 0.6.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IAlpacaVault {
    function balanceOf(address account) external view returns (uint256);

    function totalToken() external view returns (uint256);

    function totalSupply() external view returns (uint256);

    function deposit(uint256 amountToken) external payable;

    function withdraw(uint256 share) external;
}

interface IFairLaunch {
    function deposit(
        address _for,
        uint256 _pid,
        uint256 _amount
    ) external; // staking

    function withdraw(
        address _for,
        uint256 _pid,
        uint256 _amount
    ) external; // unstaking

    function harvest(uint256 _pid) external;

    function pendingAlpaca(uint256 _pid, address _user) external view returns (uint256);

    function userInfo(uint256, address)
        external
        view
        returns (
            uint256 amount,
            uint256 rewardDebt,
            uint256 fundedBy
        );
}

interface IAlpacaToken is IERC20 {}
