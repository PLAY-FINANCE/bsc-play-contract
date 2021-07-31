//SPDX-License-Identifier: MIT
pragma solidity 0.6.6;

interface IRandomNumberGenerator {
    /**
     * Requests randomness
     */
    function getRandomNumber(uint256 lotteryType) external returns (bytes32 requestId);
}
