// SPDX-License-Identifier: MIT
pragma solidity 0.6.6;

interface ILocker {
    function lock(
        address user,
        uint256 playAmount,
        uint256 lockupBlock
    ) external;
}
