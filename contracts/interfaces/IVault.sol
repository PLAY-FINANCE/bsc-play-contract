// SPDX-License-Identifier: MIT
pragma solidity 0.6.6;

interface IVault {
    /// @dev Add more ERC20 to the bank. Hope to get some good returns.
    function deposit(uint256 amountToken) external payable;

    /// @dev Withdraw ERC20 from the bank by burning the share tokens.
    function withdraw(uint256 share) external;

    /// @dev Harvest
    function harvest() external returns (uint256);

    /// @dev Set Pool id
    function setPoolId(uint256 poolId_) external;

    /// @dev Set lottery type
    function setLotteryType(uint256 lotteryType_) external;

    /// @dev Return the user balance.
    function getUserBalance(address user) external view returns (uint256);

    /// @dev Get Pool id
    function getPoolId() external view returns (uint256);

    /// @dev Get token address
    function getToken() external view returns (address);

    /// @dev isPrizeVault
    function isPrizeVault() external pure returns (bool);

    /// @dev pending
    function pending() external view returns (uint256 totalEarned);
}
