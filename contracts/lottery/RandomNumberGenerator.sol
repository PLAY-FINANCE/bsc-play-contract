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

// Inherited allowing for ownership of contract
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.6/VRFConsumerBase.sol";

// interfaces
import "../interfaces/ILottery.sol";

contract RandomNumberGenerator is VRFConsumerBase, Ownable {
    bytes32 private _keyHash;
    uint256 private _fee;

    struct RequestInfo {
        address requester;
        uint256 lotteryType;
    }

    mapping(bytes32 => RequestInfo) private _requestInfos;

    address private _lottery;

    modifier onlyLottery() {
        require(msg.sender == _lottery, "Only Lottery can call function");
        _;
    }

    constructor(
        address vrfCoordinator_,
        address linkToken_,
        address lottery_,
        bytes32 keyHash_,
        uint256 fee_
    ) public VRFConsumerBase(vrfCoordinator_, linkToken_) {
        require(vrfCoordinator_ != address(0), "address cannot be zero");
        require(linkToken_ != address(0), "address cannot be zero");
        require(lottery_ != address(0), "address cannot be zero");
        require(keyHash_ != bytes32(0), "invalid key hash");

        _keyHash = keyHash_;
        _fee = fee_;
        _lottery = lottery_;
    }

    // setter
    function setFee(uint256 fee_) external onlyOwner {
        _fee = fee_;
    }

    function setKeyHash(bytes32 keyHash_) external onlyOwner {
        require(keyHash_ != bytes32(0), "invalid key hash");
        _keyHash = keyHash_;
    }

    // getter
    function getFee() external view returns (uint256) {
        return _fee;
    }

    function getKeyHash() external view returns (bytes32) {
        return _keyHash;
    }

    /**
     * Requests randomness from a user-provided seed
     */
    function getRandomNumber(uint256 lotteryType_) public onlyLottery() returns (bytes32 requestId) {
        require(LINK.balanceOf(address(this)) >= _fee, "Not enough LINK");
        requestId = requestRandomness(_keyHash, _fee, 0);
        _requestInfos[requestId].requester = msg.sender;
        _requestInfos[requestId].lotteryType = lotteryType_;
    }

    /**
     * Callback function used by VRF Coordinator
     */
    function fulfillRandomness(bytes32 requestId_, uint256 randomness_) internal override {
        ILottery(_requestInfos[requestId_].requester).numberDrawn(
            _requestInfos[requestId_].lotteryType,
            requestId_,
            randomness_
        );
    }
}
