// SPDX-License-Identifier: BUSL-1.1
/*
 _______   __         ______   __      __        ________  __                                                   
/       \ /  |       /      \ /  \    /  |      /        |/  |                                                  
$$$$$$$  |$$ |      /$$$$$$  |$$  \  /$$/       $$$$$$$$/ $$/  _______    ______   _______    _______   ______  
$$ |__$$ |$$ |      $$ |__$$ | $$  \/$$/        $$ |__    /  |/       \  /      \ /       \  /       | /      \ 
$$    $$/ $$ |      $$    $$ |  $$  $$/         $$    |   $$ |$$$$$$$  | $$$$$$  |$$$$$$$  |/$$$$$$$/ /$$$$$$  |
$$$$$$$/  $$ |      $$$$$$$$ |   $$$$/          $$$$$/    $$ |$$ |  $$ | /    $$ |$$ |  $$ |$$ |      $$    $$ |
$$ |      $$ |_____ $$ |  $$ |    $$ |          $$ |      $$ |$$ |  $$ |/$$$$$$$ |$$ |  $$ |$$ \_____ $$$$$$$$/ 
$$ |      $$       |$$ |  $$ |    $$ |          $$ |      $$ |$$ |  $$ |$$    $$ |$$ |  $$ |$$       |$$       |
$$/       $$$$$$$$/ $$/   $$/     $$/           $$/       $$/ $$/   $$/  $$$$$$$/ $$/   $$/  $$$$$$$/  $$$$$$$/ 
                                                                                                                
*/
pragma solidity 0.6.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

// interfaces
import "../interfaces/IConfig.sol";

contract Config is IConfig, Ownable {
    /// @notice Libraries
    // Safe math
    using SafeMath for uint256;
    // Address functionality
    using Address for address;

    /// @dev Attributes for Config

    /// @dev lottery address
    address private _lottery;

    /// @dev swap router address
    address private _router;

    /// @dev swap factory address
    address private _factory;

    /// @dev wbnb address
    address private _wbnb;

    /// @dev price oracle address
    address private _priceOracle;

    /// @dev reference price token address
    address private _refPriceToken;

    /// @dev max fee
    uint256 private _maxFee;

    /// @dev fee information of each lottery type
    mapping(uint256 => FeeInfo) private _feeInfos;

    /// @dev white list of fund swap
    mapping(address => bool) private _swapWhiteLists;

    /// @notice Events
    event SetRouter(address router);
    event SetFactory(address factory);
    event SetWbnb(address wbnb);
    event SetPriceOracle(address priceOracle);
    event SetRefPriceToken(address refPriceToken);
    event SetFeeInfo(
        uint256 lotteryType,
        uint256 playToTheMoon,
        uint256 safu,
        uint256 operator,
        uint256 nextLottery,
        uint256 denominator
    );
    event SetSwapWhiteList(address token, bool canSwap);

    /// @dev modifier
    modifier onlyLottery() {
        require(msg.sender == _lottery, "Only Lottery can call function");
        _;
    }

    constructor(
        address lottery_,
        address router_,
        address factory_,
        address wbnb_,
        address priceOracle_,
        address refPriceToken_,
        uint256 maxFee_
    ) public {
        require(lottery_ != address(0), "lottery_ cant be zero");
        require(router_ != address(0), "router_ cant be zero");
        require(factory_ != address(0), "factory_ cant be zero");
        require(wbnb_ != address(0), "wbnb_ cant be zero");
        require(priceOracle_ != address(0), "priceOracle_ cant be zero");
        require(refPriceToken_ != address(0), "refPriceToken_ cant be zero");
        require(maxFee_ > 0, "maxFee_ cant be zero");

        _lottery = lottery_;
        _router = router_;
        _factory = factory_;
        _wbnb = wbnb_;
        _priceOracle = priceOracle_;
        _refPriceToken = refPriceToken_;
        _maxFee = maxFee_;
    }

    function setRouter(address router) external onlyOwner {
        require(router != address(0), "address cannt be zero");
        _router = router;
        emit SetRouter(_router);
    }

    function getRouter() external view override returns (address) {
        return _router;
    }

    function setFactory(address factory) external onlyOwner {
        require(factory != address(0), "address cannt be zero");
        _factory = factory;
        emit SetFactory(_factory);
    }

    function getFactory() external view override returns (address) {
        return _factory;
    }

    function setWbnb(address wbnb) external onlyOwner {
        require(wbnb != address(0), "address cannt be zero");
        _wbnb = wbnb;
        emit SetWbnb(_wbnb);
    }

    function getWbnb() external view override returns (address) {
        return _wbnb;
    }

    function setPriceOracle(address priceOracle) external onlyOwner {
        require(priceOracle != address(0), "address cannt be zero");
        _priceOracle = priceOracle;
        emit SetPriceOracle(_priceOracle);
    }

    function getPriceOracle() external view override returns (address) {
        return _priceOracle;
    }

    function setRefPriceToken(address refPriceToken) external onlyOwner {
        require(refPriceToken != address(0), "address cannt be zero");
        _refPriceToken = refPriceToken;
        emit SetRefPriceToken(_refPriceToken);
    }

    function getRefPriceToken() external view override returns (address) {
        return _refPriceToken;
    }

    function setSwapWhiteList(address token, bool canSwap) external onlyOwner {
        require(token != address(0), "token cannt be zero");
        _swapWhiteLists[token] = canSwap;

        emit SetSwapWhiteList(token, canSwap);
    }

    function getSwapWhiteList(address token) external view override returns (bool) {
        return _swapWhiteLists[token];
    }

    function setFeeInfo(
        uint256 lotteryType,
        uint256 playToTheMoon,
        uint256 safu,
        uint256 operator,
        uint256 nextLottery,
        uint256 denominator
    ) external override onlyLottery {
        require(denominator > 0, "denominator cannt be zero");
        require(
            denominator.div(_maxFee) >= playToTheMoon.add(safu).add(operator).add(nextLottery),
            "The total fee must be less than maxFee%."
        );

        FeeInfo memory feeInfo = FeeInfo(playToTheMoon, safu, operator, nextLottery, denominator);

        _feeInfos[lotteryType] = feeInfo;

        emit SetFeeInfo(lotteryType, playToTheMoon, safu, operator, nextLottery, denominator);
    }

    function getFeeInfo(uint256 lotteryType)
        external
        view
        override
        returns (
            uint256,
            uint256,
            uint256,
            uint256,
            uint256
        )
    {
        FeeInfo memory feeInfo = _feeInfos[lotteryType];
        return (feeInfo.playToTheMoon, feeInfo.safu, feeInfo.operator, feeInfo.nextLottery, feeInfo.denominator);
    }
}
