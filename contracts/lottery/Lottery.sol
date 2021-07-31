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
pragma solidity >0.6.0;
pragma experimental ABIEncoderV2;
// Imported OZ helper contracts
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/proxy/Initializable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
// Inherited allowing for ownership of contract
import "@openzeppelin/contracts/access/Ownable.sol";
// Allows for time manipulation. Set to 0x address on test/mainnet deploy
import "../utils/Testable.sol";
// Safe math
import "@openzeppelin/contracts/math/SafeMath.sol";
import "../utils/SafeMath8.sol";
// interfaces
import "../interfaces/IPlayDistributor.sol";
import "../interfaces/IVault.sol";
import "../interfaces/IPriceOracle.sol";
import "../interfaces/IConfig.sol";
import "../interfaces/ILocker.sol";
// Allows for intergration with ChainLink VRF
import "../interfaces/IRandomNumberGenerator.sol";

contract Lottery is Ownable, Initializable, ReentrancyGuard, Testable {
    // Libraries
    // Safe math
    using SafeMath for uint256;
    // Address functionality
    using Address for address;

    // State variables
    // Storing of the randomness generator
    IRandomNumberGenerator private _randomGenerator;
    // Storing of the play distributor
    IPlayDistributor private _playDistributor;
    // Storing of the config
    IConfig private _config;

    // bool flags
    bool _refreshPrizeOn;
    bool _cleanupDepositListOn;
    bool _getNumUsersOn;

    // Represents the status of the lottery
    enum Status {
        Open, // The lottery is open for ticket purchases
        Closed, // The lottery is no longer open for ticket purchases
        Completed, // The lottery has been closed and the numbers drawn
        Done // Prize distribution is done.
    }

    // Lotto config
    struct LottoConfig {
        bool canCreateNewLotto;
        uint256 timeInterval; // Interval of lottery time
        uint256 maxValidRange; // Max range for numbers (starting at 0)
        address prizeLocker; // prize locker
        uint256 prizeLockupBlock; // prize lokcup block
    }

    // All the needed info around a lottery
    struct LottoInfo {
        uint256 lotteryID; // ID for lotto
        uint256 lotteryType; // Type for lotto
        Status lotteryStatus; // Status for lotto
        uint256 prize; // The amount of prize
        uint256 startingTimestamp; // Block timestamp for star of lotto
        uint256 closingTimestamp; // Block timestamp for end of entries
        uint256 winningNumber; // The winning number
        address winnerAddress; // The winner address
        uint256 maxValidRange; // Max range for numbers (starting at 0)
        IConfig.FeeInfo feeInfo; // fee info
        address prizeLocker; // prize locker
        uint256 prizeLockupBlock; // prize lokcup block
    }

    // All the needed info a vault
    struct VaultInfo {
        IVault vault; // vault
        uint256 earned; // total earned
    }

    // Request IDs for random number
    mapping(uint256 => bytes32) private _requestIds;
    // Counters for lottery ID
    mapping(uint256 => uint256) private _lotteryIdCounters;
    // lottery type's to (Lottery ID's to info)
    mapping(uint256 => mapping(uint256 => LottoInfo)) private allLotteries_;
    // Lotto type's to Lotto Config
    mapping(uint256 => LottoConfig) private _lottoConfigs;
    // Lotto type's to vaults
    mapping(uint256 => VaultInfo[]) private vaults;
    // Lottery type list of vaults
    uint256[] private _vaultsTypes;

    //-------------------------------------------------------------------------
    // EVENTS
    //-------------------------------------------------------------------------

    event LotteryOpen(uint256 lotteryType, uint256 lotteryId);
    event RequestNumbers(uint256 lotteryType, uint256 lotteryId, bytes32 requestId);
    event LotteryClose(uint256 lotteryType, uint256 lotteryId, uint256 winningNumber);
    event RefreshPrize(uint256 lotteryType, uint256 sumEarned);
    event PrizeDistribution(uint256 lotteryType, uint256 lotteryId, address winnerAddress, uint256 prize);

    event SetRefreshPrizeOn(bool refreshPrizeOn);
    event SetCleanupDepositListOn(bool cleanupDepositListOn);
    event SetGetNumUsersOn(bool getNumUsersOn);

    event AddVault(address vault, uint256 lotteryType);
    event UpdateVault(address vault, uint256 lotteryType);

    event SetLottoConfig(
        uint256 lotteryType,
        bool canCreateNewLotto,
        uint256 timeInterval,
        uint256 maxValidRange,
        uint256 feePlayToTheMoon,
        uint256 feeSafu,
        uint256 feeNextLottery,
        uint256 feeOperator,
        uint256 feeDenominator,
        address prizeLocker,
        uint256 prizeLockupBlock
    );

    event GetNumUsers(uint256 lotteryType, uint256 numUsers);
    event CleanupDepositList(uint256 lotteryType, uint256 start, uint256 end);

    //-------------------------------------------------------------------------
    // CONSTRUCTOR
    //-------------------------------------------------------------------------

    constructor(address timer_) public Testable(timer_) {}

    function initialize(
        address IRandomNumberGenerator_,
        address IPlayDistributor_,
        address config_
    ) external initializer onlyOwner {
        require(IRandomNumberGenerator_ != address(0), "address cannot be 0");
        require(IPlayDistributor_ != address(0), "address cannot be 0");
        require(config_ != address(0), "address cannot be 0");

        _randomGenerator = IRandomNumberGenerator(IRandomNumberGenerator_);
        _playDistributor = IPlayDistributor(IPlayDistributor_);
        _config = IConfig(config_);

        _refreshPrizeOn = true;
        _cleanupDepositListOn = true;
        _getNumUsersOn = true;
    }

    //-------------------------------------------------------------------------
    // VIEW FUNCTIONS
    //-------------------------------------------------------------------------

    function getBasicLottoInfo(uint256 _lotteryType, uint256 _lotteryId) external view returns (LottoInfo memory) {
        return allLotteries_[_lotteryType][_lotteryId];
    }

    function getLotteryIdCounter(uint256 lotteryType_) external view returns (uint256) {
        return _lotteryIdCounters[lotteryType_];
    }

    function getPrize(uint256 lotteryType_) external view returns (uint256 sumEarned) {
        VaultInfo[] memory vaultInfos = vaults[lotteryType_];
        IPriceOracle _priceOracle = IPriceOracle(_config.getPriceOracle());
        address _referencePriceToken = _config.getRefPriceToken();

        for (uint256 i; i < vaultInfos.length; ++i) {
            VaultInfo memory _vaultInfo = vaultInfos[i];
            if (_vaultInfo.earned == 0) continue;

            (uint256 price, ) = _priceOracle.getPrice(_vaultInfo.vault.getToken(), _referencePriceToken);
            sumEarned = sumEarned.add(_vaultInfo.earned.mul(price).div(1e18));
        }
    }

    function getExpectedPrize(uint256 lotteryType_) external view returns (uint256 sumEarned) {
        VaultInfo[] memory vaultInfos = vaults[lotteryType_];
        IPriceOracle _priceOracle = IPriceOracle(_config.getPriceOracle());
        address _referencePriceToken = _config.getRefPriceToken();

        for (uint256 i; i < vaultInfos.length; ++i) {
            VaultInfo memory _vaultInfo = vaultInfos[i];
            IVault _vault = _vaultInfo.vault;
            uint256 earned = _vaultInfo.earned.add(_vault.pending());
            if (earned == 0) continue;

            (uint256 price, ) = _priceOracle.getPrice(_vault.getToken(), _referencePriceToken);
            sumEarned = sumEarned.add(earned.mul(price).div(1e18));
        }
    }

    function getNumTickets(uint256 lotteryType_) external view returns (uint256 numTickets) {
        VaultInfo[] memory vaultInfos = vaults[lotteryType_];

        for (uint256 i; i < vaultInfos.length; ++i) {
            IVault _vault = vaultInfos[i].vault;
            if (!_vault.isPrizeVault()) {
                numTickets = numTickets.add(
                    _playDistributor.getNumTickets(
                        _vault.getPoolId(),
                        msg.sender,
                        allLotteries_[lotteryType_][_lotteryIdCounters[lotteryType_]].startingTimestamp
                    )
                );
            }
        }
    }

    //-------------------------------------------------------------------------
    // STATE MODIFYING FUNCTIONS
    //-------------------------------------------------------------------------

    //-------------------------------------------------------------------------
    // Restricted Access Functions (onlyOwner)

    /// @dev set refreshPrizeOn. Must be called by owner.
    function setRefreshPrizeOn(bool refreshPrizeOn_) external onlyOwner {
        _refreshPrizeOn = refreshPrizeOn_;
        emit SetRefreshPrizeOn(_refreshPrizeOn);
    }

    /// @dev set cleanupDepositListOn. Must be called by owner.
    function setCleanupDepositListOn(bool cleanupDepositListOn_) external onlyOwner {
        _cleanupDepositListOn = cleanupDepositListOn_;
        emit SetCleanupDepositListOn(_cleanupDepositListOn);
    }

    /// @dev set getNumUsersOn. Must be called by owner.
    function setGetNumUsersOn(bool getNumUsersOn_) external onlyOwner {
        _getNumUsersOn = getNumUsersOn_;
        emit SetGetNumUsersOn(_getNumUsersOn);
    }

    /// @dev Set lotto configurations. Must be called by owner.
    function setLottoConfig(
        uint256 lotteryType_,
        bool canCreateNewLotto_,
        uint256 timeInterval_,
        uint256 maxValidRange_,
        uint256 feePlayToTheMoon_,
        uint256 feeSafu_,
        uint256 feeOperator_,
        uint256 feeNextLottery_,
        uint256 feeDenominator_,
        address prizeLocker_,
        uint256 prizeLockupBlock_
    ) external onlyOwner {
        require(timeInterval_ > 0, "timeInterval cannot be 0");
        require(maxValidRange_ > 0, "Lottery setup cannot be 0");
        require(feeDenominator_ > 0, "denominator cannot be 0");

        _config.setFeeInfo(lotteryType_, feePlayToTheMoon_, feeSafu_, feeOperator_, feeNextLottery_, feeDenominator_);
        LottoConfig memory newLottoConfig = LottoConfig(
            canCreateNewLotto_,
            timeInterval_,
            maxValidRange_,
            prizeLocker_,
            prizeLockupBlock_
        );

        _lottoConfigs[lotteryType_] = newLottoConfig;

        emit SetLottoConfig(
            lotteryType_,
            newLottoConfig.canCreateNewLotto,
            newLottoConfig.timeInterval,
            newLottoConfig.maxValidRange,
            feePlayToTheMoon_,
            feeSafu_,
            feeOperator_,
            feeNextLottery_,
            feeDenominator_,
            prizeLocker_,
            prizeLockupBlock_
        );
    }

    /// @dev Add a new vault. Must be called by owner.
    function addVault(
        address vault_,
        uint256 lotteryType_,
        uint256 allocPoint_,
        uint256 startBlock_,
        uint256 multiplier_,
        uint256 fixedPrice_,
        bool isFixedPrice_
    ) external onlyOwner {
        require(vault_ != address(0), "wrong address");

        bool newLotteryType = true;
        for (uint256 i; i < _vaultsTypes.length; ++i) {
            if (_vaultsTypes[i] == lotteryType_) {
                newLotteryType = false;
                break;
            }
        }

        if (newLotteryType) {
            _vaultsTypes.push(lotteryType_);
        }

        bool duplicated;
        for (uint256 i; i < _vaultsTypes.length; ++i) {
            uint256 _type = _vaultsTypes[i];

            for (uint256 j; j < vaults[_type].length; ++j) {
                if (vault_ == address(vaults[_type][j].vault)) {
                    duplicated = true;
                    break;
                }
            }

            if (duplicated) break;
        }

        require(!duplicated, "this vault is already added");

        if (!IVault(vault_).isPrizeVault())
            _playDistributor.addPool(allocPoint_, vault_, startBlock_, multiplier_, fixedPrice_, isFixedPrice_);

        vaults[lotteryType_].push(VaultInfo({ vault: IVault(vault_), earned: 0 }));

        IVault(vault_).setLotteryType(lotteryType_);

        emit AddVault(vault_, lotteryType_);
    }

    /// @dev Update a vault. Must be called by owner.
    function updateVault(
        address vault_,
        uint256 lotteryType_,
        uint256 allocPoint_,
        uint256 multiplier_,
        uint256 fixedPrice_,
        bool isFixedPrice_
    ) external onlyOwner {
        require(vault_ != address(0), "wrong address");

        bool duplicated;
        uint256 prevEarned = uint256(-1);
        for (uint256 i; i < _vaultsTypes.length; ++i) {
            uint256 _type = _vaultsTypes[i];

            for (uint256 j; j < vaults[_type].length; ++j) {
                if (vault_ == address(vaults[_type][j].vault)) {
                    prevEarned = vaults[_type][j].earned;
                    vaults[_type][j] = vaults[_type][vaults[_type].length - 1];
                    vaults[_type].pop();

                    duplicated = true;
                    break;
                }
            }

            if (duplicated) break;
        }

        require(duplicated, "this vault is not existed");
        require(prevEarned != uint256(-1), "prev earned is wrong value");

        if (!IVault(vault_).isPrizeVault())
            _playDistributor.setPool(IVault(vault_).getPoolId(), allocPoint_, multiplier_, fixedPrice_, isFixedPrice_);

        bool newLotteryType = true;
        for (uint256 i; i < _vaultsTypes.length; ++i) {
            if (_vaultsTypes[i] == lotteryType_) {
                newLotteryType = false;
                break;
            }
        }

        if (newLotteryType) {
            _vaultsTypes.push(lotteryType_);
        }

        vaults[lotteryType_].push(VaultInfo({ vault: IVault(vault_), earned: prevEarned }));

        IVault(vault_).setLotteryType(lotteryType_);

        emit UpdateVault(vault_, lotteryType_);
    }

    /// @dev numbersDrawn. Must be called by randomGenerator
    function numberDrawn(
        uint256 lotteryType_,
        bytes32 requestId_,
        uint256 randomNumber_
    ) external {
        require(msg.sender == address(_randomGenerator), "Only random generator");

        uint256 lotteryId = _lotteryIdCounters[lotteryType_];
        // Checks that the lottery is existed
        require(lotteryId != 0, "lottery is not existed.");

        LottoInfo storage lottoInfo = allLotteries_[lotteryType_][lotteryId];
        // Checks lottery status is closed
        require(lottoInfo.lotteryStatus == Status.Closed, "Draw numbers first");

        if (requestId_ == _requestIds[lotteryType_]) {
            lottoInfo.lotteryStatus = Status.Completed;
            // Sets the winning number position to a uint256 of random number
            lottoInfo.winningNumber = randomNumber_.mod(lottoInfo.maxValidRange);
        }

        emit LotteryClose(lotteryType_, lotteryId, lottoInfo.winningNumber);
    }

    //-------------------------------------------------------------------------
    // Access Functions

    /// @dev Create new lotto.
    function createNewLotto(uint256 lotteryType_) external nonReentrant returns (uint256 lotteryId) {
        if (_lotteryIdCounters[lotteryType_] != 0) {
            require(
                allLotteries_[lotteryType_][_lotteryIdCounters[lotteryType_]].lotteryStatus == Status.Done,
                "latest lottery is not completed yet"
            );
        }

        LottoConfig memory lottoConfig = _lottoConfigs[lotteryType_];
        require(lottoConfig.canCreateNewLotto, "cant create new lotto");

        // Incrementing lottery ID
        _lotteryIdCounters[lotteryType_] = _lotteryIdCounters[lotteryType_].add(1);
        lotteryId = _lotteryIdCounters[lotteryType_];

        (uint256 playToTheMoon, uint256 safu, uint256 operator, uint256 nextLottery, uint256 denominator) = _config
        .getFeeInfo(lotteryType_);

        // Saving data in struct
        LottoInfo memory newLottery = LottoInfo(
            lotteryId,
            lotteryType_,
            Status.Open,
            0,
            now,
            now.add(lottoConfig.timeInterval),
            uint256(-1),
            address(0),
            lottoConfig.maxValidRange,
            IConfig.FeeInfo(playToTheMoon, safu, operator, nextLottery, denominator),
            lottoConfig.prizeLocker,
            lottoConfig.prizeLockupBlock
        );
        allLotteries_[lotteryType_][lotteryId] = newLottery;

        // Emitting important information around new lottery.
        emit LotteryOpen(lotteryType_, lotteryId);
    }

    /// @dev Draw winning number specific lottery type.
    function drawWinningNumbers(uint256 lotteryType_) external nonReentrant {
        uint256 lotteryId = _lotteryIdCounters[lotteryType_];
        // Checks that the lottery is existed
        require(lotteryId != 0, "lottery is not existed.");

        LottoInfo storage lottoInfo = allLotteries_[lotteryType_][lotteryId];

        // Checks that the lottery is past the closing block
        require(lottoInfo.closingTimestamp <= getCurrentTime(), "Cannot set winning number during lottery");
        // Checks lottery numbers have not already been drawn
        require(lottoInfo.lotteryStatus == Status.Open, "Lottery State incorrect for draw");

        // Sets lottery status to closed
        lottoInfo.lotteryStatus = Status.Closed;

        // Requests a random number from the generator
        _requestIds[lotteryType_] = _randomGenerator.getRandomNumber(lotteryType_);

        // Emits that random number has been requested
        emit RequestNumbers(lotteryType_, lotteryId, _requestIds[lotteryType_]);
    }

    /// @dev Prize distribution.
    function prizeDistribution(uint256 lotteryType_) external nonReentrant {
        uint256 lotteryId = _lotteryIdCounters[lotteryType_];
        // Checks that the lottery is existed
        require(lotteryId != 0, "lottery is not existed.");

        LottoInfo storage lottoInfo = allLotteries_[lotteryType_][lotteryId];
        // Checks lottery status is closed
        require(lottoInfo.lotteryStatus == Status.Completed, "numberDrawn first");

        lottoInfo.lotteryStatus = Status.Done;

        uint256 prize = _refreshPrize(lotteryType_);

        IConfig.FeeInfo memory feeInfo = lottoInfo.feeInfo;
        uint256 playToTheMoonAmount = prize.mul(feeInfo.playToTheMoon).div(feeInfo.denominator);
        uint256 safuAmount = prize.mul(feeInfo.safu).div(feeInfo.denominator);
        uint256 operatorAmount = prize.mul(feeInfo.operator).div(feeInfo.denominator);
        uint256 nextLotteryAmount = prize.mul(feeInfo.nextLottery).div(feeInfo.denominator);

        if (playToTheMoonAmount.add(safuAmount).add(operatorAmount).add(nextLotteryAmount) < prize) {
            lottoInfo.prize = prize;
            prize = prize.sub(playToTheMoonAmount).sub(safuAmount).sub(operatorAmount).sub(nextLotteryAmount);

            // note: The following order must be observed. clearPrizePools -> setPrizePoolStatus: Clear -> addPrizePool ->
            // setPrizePoolStatus: Added -> transferPrize -> setPrizePoolStatus:Finished
            _playDistributor.clearPrizePools();
            // it's not a good design pattern. how can we imporve further?
            _playDistributor.setPrizePoolStatus(IPlayDistributor.PrizePoolStatus.Clear);

            // note: If the prize pool ids are passed as an array parameter, a problem arises in the test code.
            // So I made addPrizePool multiple times like this:
            VaultInfo[] memory _vaultInfos = vaults[lotteryType_];
            for (uint256 i; i < _vaultInfos.length; ++i) {
                IVault _vault = _vaultInfos[i].vault;
                if (!_vault.isPrizeVault()) {
                    _playDistributor.addPrizePool(_vault.getPoolId());
                }
            }
            _playDistributor.setPrizePoolStatus(IPlayDistributor.PrizePoolStatus.Added);

            lottoInfo.winnerAddress = _playDistributor.findWinner(lottoInfo.winningNumber, lottoInfo.startingTimestamp);
            _playDistributor.setPrizePoolStatus(IPlayDistributor.PrizePoolStatus.Finished);

            if (lottoInfo.winnerAddress != address(0)) {
                _playDistributor.transferPrize(
                    lottoInfo.winnerAddress,
                    prize,
                    playToTheMoonAmount,
                    lottoInfo.prizeLocker,
                    lottoInfo.prizeLockupBlock
                );

                VaultInfo[] storage vaultInfos = vaults[lotteryType_];
                for (uint256 i; i < vaultInfos.length; ++i) {
                    vaultInfos[i].earned = vaultInfos[i].earned.mul(feeInfo.nextLottery).div(feeInfo.denominator);
                }
            }
        }

        emit PrizeDistribution(lotteryType_, lotteryId, lottoInfo.winnerAddress, lottoInfo.prize);
    }

    /// @dev Refresh the prize of specific lottery type.
    function refreshPrize(uint256 lotteryType_) external nonReentrant returns (uint256 sumEarned) {
        require(_refreshPrizeOn, "refreshPrize off");
        sumEarned = _refreshPrize(lotteryType_);
    }

    function _refreshPrize(uint256 lotteryType_) internal returns (uint256 sumEarned) {
        VaultInfo[] storage vaultInfos = vaults[lotteryType_];
        IPriceOracle _priceOracle = IPriceOracle(_config.getPriceOracle());
        address _referencePriceToken = _config.getRefPriceToken();

        for (uint256 i; i < vaultInfos.length; ++i) {
            IVault _vault = vaultInfos[i].vault;
            vaultInfos[i].earned = vaultInfos[i].earned.add(_vault.harvest());

            if (vaultInfos[i].earned == 0) continue;

            (uint256 price, ) = _priceOracle.getPrice(_vault.getToken(), _referencePriceToken);
            sumEarned = sumEarned.add(vaultInfos[i].earned.mul(price).div(1e18));
        }
    }

    /// @dev This is a function to lower the cost of findWinner.
    /// We can reduce the length of depositTimestampList by calling this function periodically.
    function cleanupDepositList(
        uint256 lotteryType,
        uint256 start,
        uint256 end
    ) external nonReentrant {
        require(_cleanupDepositListOn, "cleanupDepositList off");
        uint256 lotteryId = _lotteryIdCounters[lotteryType];
        // Checks that the lottery is existed
        require(lotteryId != 0, "lottery is not existed.");

        LottoInfo memory lottoInfo = allLotteries_[lotteryType][lotteryId];

        uint256 timestamp = (lottoInfo.lotteryStatus == Status.Done)
            ? lottoInfo.closingTimestamp
            : lottoInfo.startingTimestamp;

        // note: The following order must be observed. clearPrizePools -> setPrizePoolStatus: Clear -> addPrizePool ->
        // setPrizePoolStatus: Added -> cleanupDepositList -> setPrizePoolStatus:Finished
        _playDistributor.clearPrizePools();
        // it's not a good design pattern. how can we imporve further?
        _playDistributor.setPrizePoolStatus(IPlayDistributor.PrizePoolStatus.Clear);

        // note: If the prize pool ids are passed as an array parameter, a problem arises in the test code.
        // So I made addPrizePool multiple times like this:
        VaultInfo[] memory vaultInfos = vaults[lotteryType];
        for (uint256 i; i < vaultInfos.length; ++i) {
            IVault _vault = vaultInfos[i].vault;
            if (!_vault.isPrizeVault()) {
                _playDistributor.addPrizePool(_vault.getPoolId());
            }
        }
        _playDistributor.setPrizePoolStatus(IPlayDistributor.PrizePoolStatus.Added);

        _playDistributor.cleanupDepositList(timestamp, start, end);
        _playDistributor.setPrizePoolStatus(IPlayDistributor.PrizePoolStatus.Finished);

        emit CleanupDepositList(lotteryType, start, end);
    }

    function getNumUsers(uint256 lotteryType_) external nonReentrant returns (uint256 numUsers) {
        require(_getNumUsersOn, "getNumUsers off");
        uint256 lotteryId = _lotteryIdCounters[lotteryType_];
        // Checks that the lottery is existed
        require(lotteryId != 0, "lottery is not existed.");

        // note: The following order must be observed. clearUserCountPoolId -> setUserCountStatus: Clear -> addUserCountPoolId ->
        // setUserCountStatus: Added -> getNumUsers -> setUserCountStatus:Finished
        _playDistributor.clearUserCountPoolId();
        // it's not a good design pattern. how can we imporve further?
        _playDistributor.setUserCountStatus(IPlayDistributor.UserCountStatus.Clear);

        // note: If the user count ids are passed as an array parameter, a problem arises in the test code.
        // So I made addUserCountPoolId multiple times like this:
        VaultInfo[] memory vaultInfos = vaults[lotteryType_];
        for (uint256 i; i < vaultInfos.length; ++i) {
            IVault _vault = vaultInfos[i].vault;
            if (!_vault.isPrizeVault()) {
                _playDistributor.addUserCountPoolId(_vault.getPoolId());
            }
        }
        _playDistributor.setUserCountStatus(IPlayDistributor.UserCountStatus.Added);

        numUsers = _playDistributor.getNumUsers();
        _playDistributor.setUserCountStatus(IPlayDistributor.UserCountStatus.Finished);

        emit GetNumUsers(lotteryType_, numUsers);
    }
}
