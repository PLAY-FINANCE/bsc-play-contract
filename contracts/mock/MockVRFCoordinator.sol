//SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "@chainlink/contracts/src/v0.6/tests/VRFCoordinatorMock.sol";

/**
 * @dev THIS CONTRACT IS FOR TESTING PURPOSES ONLY.
 */
contract MockVRFCoordinator is VRFCoordinatorMock {
    constructor(address _linkToken) public VRFCoordinatorMock(_linkToken) {}
}
