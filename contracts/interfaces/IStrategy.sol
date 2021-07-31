// SPDX-License-Identifier: MIT
pragma solidity 0.6.6;

interface IStrategy {
    function getTotalBalance() external view returns (uint256);

    function pending() external view returns (uint256 pendingAmount);

    function deposit(uint256 amount) external;

    function withdraw(uint256 amount) external;

    function reinvest() external;
}
