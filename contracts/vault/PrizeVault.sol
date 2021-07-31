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
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/Math.sol";

// interfaces
import "../interfaces/IVault.sol";

contract PrizeVault is IVault, Ownable {
    /// @notice Libraries
    using SafeMath for uint256;

    /// @notice Events
    event SetLotteryType(uint256 lotteryType);
    event SetPrizePerBlock(uint256 prizePerBlock);
    event SetLastRewardBlock(uint256 lastRewardBlock);
    event Harvest(uint256 amount);

    /// @dev Attributes for PrizeVault
    // play address
    address private _play;

    // lottery address
    address public _lottery;

    // lottery type
    uint256 private _lotteryType;

    // prize per block
    uint256 private _prizePerBlock;

    // last reward block
    uint256 private _lastRewardBlock;

    /// @dev modifier
    modifier onlyLottery() {
        require(msg.sender == _lottery, "Only Lottery can call function");
        _;
    }

    /// @dev constructor
    constructor(
        address lottery_,
        address play_,
        uint256 startBlock_,
        uint256 prizePerBlock_
    ) public {
        require(play_ != address(0), "address can not be zero");
        require(lottery_ != address(0), "address can not be zero");

        _play = play_;
        _lottery = lottery_;
        _lastRewardBlock = block.number > startBlock_ ? block.number : startBlock_;
        _prizePerBlock = prizePerBlock_;
    }

    /// @dev setter
    function setLotteryType(uint256 lotteryType_) external override onlyLottery {
        _lotteryType = lotteryType_;

        emit SetLotteryType(_lotteryType);
    }

    function setPrizePerBlock(uint256 prizePerBlock_) external onlyOwner {
        _prizePerBlock = prizePerBlock_;

        emit SetPrizePerBlock(_prizePerBlock);
    }

    function setLastRewardBlock(uint256 lastRewardBlock_) external onlyOwner {
        _lastRewardBlock = lastRewardBlock_;

        emit SetLastRewardBlock(_lastRewardBlock);
    }

    /// @dev getter
    /// @dev return the play token address.
    function getToken() external view override returns (address) {
        return _play;
    }

    /// @dev return the isPrizeVault.
    function isPrizeVault() external pure override returns (bool) {
        return true;
    }

    /// @dev Harvest prize. only lottery can access.
    function pending() external view override returns (uint256 prize) {
        if (block.number > _lastRewardBlock) {
            uint256 blocks = block.number.sub(_lastRewardBlock);

            prize = blocks.mul(_prizePerBlock);
        }
    }

    /// @dev Harvest prize. only lottery can access.
    function harvest() external override onlyLottery() returns (uint256 prize) {
        if (block.number > _lastRewardBlock) {
            uint256 blocks = block.number.sub(_lastRewardBlock);

            prize = blocks.mul(_prizePerBlock);

            _lastRewardBlock = block.number;
        }

        emit Harvest(prize);
    }

    function deposit(uint256) external payable override {
        require(false, "Prize vault doesnt provide any functionality.");
    }

    function withdraw(uint256) external override {
        require(false, "Prize vault doesnt provide any functionality.");
    }

    function setPoolId(uint256) external override {
        require(false, "Prize vault doesnt provide any functionality.");
    }

    function getPoolId() external view override returns (uint256) {
        require(false, "Prize vault doesnt provide any functionality.");
    }

    function getUserBalance(address) external view override returns (uint256) {
        require(false, "Prize vault doesnt provide any functionality.");
    }
}
