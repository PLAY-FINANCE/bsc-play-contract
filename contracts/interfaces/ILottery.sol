//SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

interface ILottery {
    /**
     * draw the random number
     */
    function numberDrawn(
        uint256 _lotteryId,
        bytes32 _requestId,
        uint256 _randomNumber
    ) external;
}
