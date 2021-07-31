// SPDX-License-Identifier: MIT
pragma solidity 0.6.6;

interface IPlayDistributor {
    // Represents the status of the prize pool
    enum PrizePoolStatus {
        Clear, // The prize pools is initialized.
        Added, // The prize pool addition is completed.
        Finished // The find winner is done.
    }

    // Represents the status of the user count
    enum UserCountStatus {
        Clear, // The user count is initialized.
        Added, // The user count pool addition is completed.
        Finished // The user count is done.
    }

    function deposit(
        address _for,
        uint256 pid,
        uint256 amount
    ) external;

    function withdraw(
        address _for,
        uint256 pid,
        uint256 amount
    ) external;

    function getUserBalance(uint256 pid_, address user_) external view returns (uint256);

    function getNumTickets(
        uint256 poolId,
        address userAddress,
        uint256 startingTimestamp_
    ) external view returns (uint256 tickets);

    function setPrizePoolStatus(PrizePoolStatus prizePoolStatus) external;

    function clearPrizePools() external;

    function addPrizePool(uint256 prizePoolId_) external;

    function findWinner(uint256 winningNumber_, uint256 startingTimestamp_) external view returns (address);

    function setUserCountStatus(UserCountStatus userCountStatus) external;

    function clearUserCountPoolId() external;

    function addUserCountPoolId(uint256 poolId) external;

    function getNumUsers() external returns (uint256 numUsers);

    function transferPrize(
        address winner_,
        uint256 prize_,
        uint256 playToTheMoonAmount_,
        address prizeLocker_,
        uint256 prizeLockupBlock_
    ) external;

    function addPool(
        uint256 allocPoint,
        address _stakeToken,
        uint256 _startBlock,
        uint256 multiplier_,
        uint256 fixedPrice_,
        bool isFixedPrice_
    ) external;

    function setPool(
        uint256 _pid,
        uint256 _allocPoint,
        uint256 multiplier_,
        uint256 fixedPrice_,
        bool isFixedPrice_
    ) external;

    /// @notice This is a function to lower the cost of findWinner.
    /// We can reduce the length of depositTimestampList by calling this function periodically.
    function cleanupDepositList(
        uint256 timestamp,
        uint256 start,
        uint256 end
    ) external;
}
