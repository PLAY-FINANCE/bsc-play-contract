// SPDX-License-Identifier: MIT
pragma solidity 0.6.6;

interface IConfig {
    // Fee info
    struct FeeInfo {
        uint256 playToTheMoon;
        uint256 safu;
        uint256 operator;
        uint256 nextLottery;
        uint256 denominator;
    }

    function getRouter() external view returns (address);

    function getFactory() external view returns (address);

    function getWbnb() external view returns (address);

    function getPriceOracle() external view returns (address);

    function getRefPriceToken() external view returns (address);

    function setFeeInfo(
        uint256 lotteryType,
        uint256 playToTheMoon,
        uint256 safu,
        uint256 operator,
        uint256 nextLottery,
        uint256 denominator
    ) external;

    function getFeeInfo(uint256 lotteryType)
        external
        view
        returns (
            uint256,
            uint256,
            uint256,
            uint256,
            uint256
        );

    function getSwapWhiteList(address token) external view returns (bool);
}
