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
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// interfaces
import "./PlayToken.sol";
import "../interfaces/IPlayDistributor.sol";
import "../interfaces/ILocker.sol";
import "../interfaces/IPriceOracle.sol";
import "../interfaces/IVault.sol";
import "../interfaces/IConfig.sol";

// utils
import "../utils/SafeToken.sol";

// PlayDistributor is a smart contract for distributing PLAY by asking user to stake the ERC20-based token.
contract PlayDistributor is IPlayDistributor, Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeToken for address;

    struct DepositTimestamp {
        uint256 timestamp;
        uint256 amount;
    }

    // Info of each user.
    struct UserInfo {
        uint256 amount; // How many Staking tokens the user has provided.
        uint256 rewardDebt; // Reward debt. See explanation below.
        address fundedBy; // Funded by who?
        //
        // We do some fancy math here. Basically, any point in time, the amount of PLAYs
        // entitled to a user but is pending to be distributed is:
        //
        //   pending reward = (user.amount * pool.accAlpacaPerShare) - user.rewardDebt
        //
        // Whenever a user deposits or withdraws Staking tokens to a pool. Here's what happens:
        //   1. The pool's `accAlpacaPerShare` (and `lastRewardBlock`) gets updated.
        //   2. User receives the pending reward sent to his/her address.
        //   3. User's `amount` gets updated.
        //   4. User's `rewardDebt` gets updated.
        DepositTimestamp[] depositTimestamps; // list of depositTimestamp keys so we can look them up. LIFO
    }

    // Info of each pool.
    struct PoolInfo {
        uint256 allocPoint; // How many allocation points assigned to this pool. PLAYs to distribute per block.
        uint256 lastRewardBlock; // Last block number that PLAYs distribution occurs.
        uint256 accPlayPerShare; // Accumulated PLAYs per share, times 1e12. See below.
        uint256 totalBalance;
        uint256 multiplier;
        uint256 fixedPrice;
        bool isFixedPrice;
    }

    // The Play TOKEN!
    PlayToken public play;
    // PLAY tokens created per block.
    uint256 public playPerBlock;

    /// @notice Info of each pool.
    PoolInfo[] public poolInfo;
    uint256[] private _prizePools;
    PrizePoolStatus private _prizePoolStatus;

    /// @notice Address of the ERC-20 for each Pool.
    address[] public stakeTokens;

    /// @notice Info of each user that stakes tokens.
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;

    /// @notice Total allocation points. Must be the sum of all allocation points in all pools.
    uint256 totalAllocPoint;

    // multiplier denominator
    uint256 private _multiplierDenominator;

    // lottery address
    address private _lottery;

    // play to the moon address
    address private _playToTheMoon;

    // address of config contract
    IConfig private _config;

    // maximum transfer prize
    uint256 private _maxTransferPrize;

    // black lists
    mapping(address => bool) _blackLists;

    struct Entry {
        uint256 index; // index start 1 to keyList.length
        bool counted;
    }
    mapping(address => Entry) internal users;
    address[] internal userKeyList;

    // for getNumUsers
    uint256[] private _userCountPoolIds;
    UserCountStatus private _userCountStatus;

    uint256 private constant ACC_PLAY_PRECISION = 1e12;

    event Deposit(address indexed user, uint256 indexed pid, uint256 amount, address indexed to);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount, address indexed to);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount, address indexed to);
    event Harvest(address indexed user, uint256 indexed pid, uint256 amount);
    event SetPlayPerBlock(uint256 indexed _playPerBlock);
    event MintWarchest(address indexed _to, uint256 _amount);
    event MintPrize(address indexed _to, uint256 _amount);
    event AddPool(
        uint256 indexed pid,
        uint256 allocPoint,
        address indexed lpToken,
        uint256 multiplier,
        uint256 fixedPrice,
        bool isFixedPrice
    );
    event SetPool(uint256 indexed pid, uint256 allocPoint, uint256 multiplier, uint256 fixedPrice, bool isFixedPrice);
    event UpdatePool(uint256 indexed pid, uint256 lastRewardBlock, uint256 lpSupply, uint256 accPlayPerShare);
    event TransferPrize(
        address indexed winner,
        uint256 prize,
        address indexed playToTheMoon,
        uint256 playToTheMoonAmount,
        address prizeLocker,
        uint256 prizeLockupBlock
    );
    event AddBlackList(address target);
    event SetMaxTransferPrize(uint256 maxTransferPrize_);
    event GetNumUsers(uint256 numUsers);
    event CleanupDepositList(uint256 timestamp, uint256 start, uint256 end);

    //-------------------------------------------------------------------------
    // MODIFIERS
    //-------------------------------------------------------------------------

    modifier onlyLottery() {
        require(msg.sender == _lottery, "Only Lottery can call function");
        _;
    }

    //-------------------------------------------------------------------------
    // CONSTRUCTOR
    //-------------------------------------------------------------------------
    constructor(
        PlayToken _play,
        uint256 _playPerBlock,
        address lottery_,
        address playToTheMoon_,
        address config_
    ) public {
        require(address(_play) != address(0), "play address can not be zero");
        require(lottery_ != address(0), "lottery address can not be zero");
        require(playToTheMoon_ != address(0), "playToTheMoon address can not be zero");
        require(config_ != address(0), "config_ address can not be zero");

        play = _play;
        playPerBlock = _playPerBlock;
        _lottery = lottery_;
        _playToTheMoon = playToTheMoon_;
        _multiplierDenominator = 10000;
        _config = IConfig(config_);
        _prizePoolStatus = PrizePoolStatus.Finished;
        _maxTransferPrize = uint256(-1);
        _userCountStatus = UserCountStatus.Finished;
    }

    /// @notice Set multiplier denominator. Must be called by owner.
    function setMultiplierDenominator(uint256 multiplierDenominator_) external onlyOwner {
        require(multiplierDenominator_ > 0, "denominator must greater than zero");
        _multiplierDenominator = multiplierDenominator_;
    }

    /// @notice Set play per block. Must be called by owner.
    function setPlayPerBlock(uint256 _playPerBlock) external onlyOwner {
        playPerBlock = _playPerBlock;
        emit SetPlayPerBlock(_playPerBlock);
    }

    /// @notice Set prize pool status. Must be called by lottery.
    function setPrizePoolStatus(PrizePoolStatus prizePoolStatus) external override onlyLottery() {
        _prizePoolStatus = prizePoolStatus;
    }

    /// @notice Set user count status. Must be called by lottery.
    function setUserCountStatus(UserCountStatus userCountStatus) external override onlyLottery() {
        _userCountStatus = userCountStatus;
    }

    /// @notice Set max transfer prize amount. Must be called by owner.
    function setMaxTransferPrize(uint256 maxTransferPrize_) external onlyOwner {
        _maxTransferPrize = maxTransferPrize_;
        emit SetMaxTransferPrize(maxTransferPrize_);
    }

    /// @notice Returns the number of pools.
    function poolLength() external view returns (uint256) {
        return poolInfo.length;
    }

    /// @notice Returns the number of users.
    function userLength() external view returns (uint256) {
        return userKeyList.length;
    }

    /// @notice Returns the number of users of specific pool.
    function getNumUsersOf(uint256 poolId) external view returns (uint256 numUsers) {
        require(poolId < poolInfo.length);

        for (uint256 i; i < userKeyList.length; ++i) {
            address userAddress = userKeyList[i];
            if (userInfo[poolId][userAddress].amount > 0) numUsers = numUsers.add(1);
        }
    }

    /// @notice Returns the user balance.
    function getUserBalance(uint256 pid_, address user_) external view override returns (uint256) {
        return userInfo[pid_][user_].amount;
    }

    /// @notice Add black list
    function addBlackList(address target) external onlyOwner {
        _blackLists[target] = true;

        emit AddBlackList(target);
    }

    /// @notice Returns if stakeToken is duplicated
    function isDuplicatedPool(address _stakeToken) public view returns (bool) {
        uint256 length = poolInfo.length;
        for (uint256 _pid; _pid < length; _pid++) {
            if (stakeTokens[_pid] == _stakeToken) return true;
        }
        return false;
    }

    /// @notice Maunally mint PLAY warchest portion.
    /// @param _to Mint to which address
    /// @param _amount Amount to be minted
    function mintWarchest(address _to, uint256 _amount) external onlyOwner {
        play.manualMint(_to, _amount);
        emit MintWarchest(_to, _amount);
    }

    /// @notice Add a new lp to the pool. Can only be called by the lottery.
    /// DO NOT add the same LP token more than once. Rewards will be messed up if you do.
    /// @param allocPoint AP of the new pool
    /// @param _stakeToken address of the LP token
    function addPool(
        uint256 allocPoint,
        address _stakeToken,
        uint256 _startBlock,
        uint256 multiplier_,
        uint256 fixedPrice_,
        bool isFixedPrice_
    ) external override onlyLottery() {
        require(_stakeToken != address(0), "PlayDistributor::addPool:: stakeToken cant be zero");
        require(!isDuplicatedPool(_stakeToken), "PlayDistributor::addPool:: stakeToken dup");

        uint256 lastRewardBlock = block.number > _startBlock ? block.number : _startBlock;
        totalAllocPoint = totalAllocPoint.add(allocPoint);

        stakeTokens.push(_stakeToken);

        uint256 poolId = poolInfo.length;
        IVault(_stakeToken).setPoolId(poolId);

        poolInfo.push(
            PoolInfo({
                allocPoint: allocPoint,
                lastRewardBlock: lastRewardBlock,
                accPlayPerShare: 0,
                totalBalance: 0,
                multiplier: multiplier_,
                fixedPrice: fixedPrice_,
                isFixedPrice: isFixedPrice_
            })
        );
        emit AddPool(stakeTokens.length.sub(1), allocPoint, _stakeToken, multiplier_, fixedPrice_, isFixedPrice_);
    }

    /// @notice Update the given pool's PLAY allocation point. Can only be called by the lottery.
    /// @param _pid The index of the pool. See `poolInfo`.
    /// @param _allocPoint new AP of the pool
    function setPool(
        uint256 _pid,
        uint256 _allocPoint,
        uint256 multiplier_,
        uint256 fixedPrice_,
        bool isFixedPrice_
    ) external override onlyLottery() {
        updatePool(_pid);
        totalAllocPoint = totalAllocPoint.sub(poolInfo[_pid].allocPoint).add(_allocPoint);
        poolInfo[_pid].allocPoint = _allocPoint;
        poolInfo[_pid].multiplier = multiplier_;
        poolInfo[_pid].fixedPrice = fixedPrice_;
        poolInfo[_pid].isFixedPrice = isFixedPrice_;
        emit SetPool(_pid, _allocPoint, multiplier_, fixedPrice_, isFixedPrice_);
    }

    /// @notice View function to see pending PLAYs on frontend.
    /// @param _pid The index of the pool. See `poolInfo`.
    /// @param _user address of user
    function pendingPlay(uint256 _pid, address _user) external view returns (uint256) {
        PoolInfo memory pool = poolInfo[_pid];
        UserInfo memory user = userInfo[_pid][_user];
        uint256 accPlayPerShare = pool.accPlayPerShare;
        uint256 stakeTokenSupply = IERC20(stakeTokens[_pid]).balanceOf(address(this));
        if (block.number > pool.lastRewardBlock && stakeTokenSupply != 0) {
            uint256 blocks = block.number.sub(pool.lastRewardBlock);
            uint256 playReward = blocks.mul(playPerBlock).mul(pool.allocPoint).div(totalAllocPoint);
            accPlayPerShare = accPlayPerShare.add(playReward.mul(ACC_PLAY_PRECISION).div(stakeTokenSupply));
        }
        uint256 _pendingPlay = (user.amount.mul(accPlayPerShare).div(ACC_PLAY_PRECISION)).sub(user.rewardDebt);
        return _pendingPlay;
    }

    /// @notice Update reward variables for all pools. Be careful of gas spending!
    /// @param pids pool IDs of all to be updated, make sure to update all active pools
    function massUpdatePools(uint256[] calldata pids) external {
        uint256 len = pids.length;
        for (uint256 i; i < len; ++i) {
            updatePool(pids[i]);
        }
    }

    /// @notice Update reward variables of the given pool.
    /// @param pid The index of the pool. See `poolInfo`.
    /// @return pool returns the Pool that was updated
    function updatePool(uint256 pid) public returns (PoolInfo memory pool) {
        pool = poolInfo[pid];
        if (block.number > pool.lastRewardBlock) {
            uint256 stakeTokenSupply = IERC20(stakeTokens[pid]).balanceOf(address(this));
            if (stakeTokenSupply > 0 && totalAllocPoint > 0) {
                uint256 blocks = block.number.sub(pool.lastRewardBlock);
                uint256 playReward = blocks.mul(playPerBlock).mul(pool.allocPoint).div(totalAllocPoint);
                play.mint(address(this), playReward);
                pool.accPlayPerShare = pool.accPlayPerShare.add(
                    (playReward.mul(ACC_PLAY_PRECISION).div(stakeTokenSupply))
                );
            }
            pool.lastRewardBlock = block.number;
            poolInfo[pid] = pool;
            emit UpdatePool(pid, pool.lastRewardBlock, stakeTokenSupply, pool.accPlayPerShare);
        }
    }

    /// @notice Deposit LP tokens to PlayDistributor for PLAY allocation.
    /// @param _for The address that will get yield
    /// @param pid The index of the pool. See `poolInfo`.
    /// @param amount to deposit.
    function deposit(
        address _for,
        uint256 pid,
        uint256 amount
    ) external override nonReentrant {
        require(!_blackLists[_for], "black list cannot deposit.");

        PoolInfo memory pool = updatePool(pid);
        UserInfo storage user = userInfo[pid][_for];

        // Validation
        if (user.fundedBy != address(0)) require(user.fundedBy == msg.sender, "PlayDistributor::deposit:: bad sof");

        // Effects
        if (user.amount > 0) _harvest(_for, pid);

        user.amount = user.amount.add(amount);
        user.rewardDebt = user.rewardDebt.add(amount.mul(pool.accPlayPerShare).div(ACC_PLAY_PRECISION));
        if (user.fundedBy == address(0)) user.fundedBy = msg.sender;

        // Interactions
        SafeToken.safeTransferFrom(stakeTokens[pid], msg.sender, address(this), amount);

        poolInfo[pid].totalBalance = poolInfo[pid].totalBalance.add(amount);
        _addUser(_for);

        // Saving data in struct
        DepositTimestamp memory depositTImestamp = DepositTimestamp(block.timestamp, amount);
        user.depositTimestamps.push(depositTImestamp);

        emit Deposit(msg.sender, pid, amount, _for);
    }

    /// @notice Withdraw LP tokens from PlayDistributor.
    /// @param _for Receiver of yield
    /// @param pid The index of the pool. See `poolInfo`.
    /// @param amount of lp tokens to withdraw.
    function withdraw(
        address _for,
        uint256 pid,
        uint256 amount
    ) external override nonReentrant {
        PoolInfo memory pool = updatePool(pid);
        UserInfo storage user = userInfo[pid][_for];

        require(user.fundedBy == msg.sender, "PlayDistributor::withdraw:: only funder");
        require(user.amount >= amount, "PlayDistributor::withdraw:: not good");
        require(poolInfo[pid].totalBalance >= amount, "PlayDistributor::withdraw:: not good2");

        // Effects
        _harvest(_for, pid);

        user.rewardDebt = user.rewardDebt.sub(amount.mul(pool.accPlayPerShare).div(ACC_PLAY_PRECISION));
        user.amount = user.amount.sub(amount);
        if (user.amount == 0) user.fundedBy = address(0);

        // Interactions
        SafeToken.safeTransfer(stakeTokens[pid], msg.sender, amount);

        poolInfo[pid].totalBalance = poolInfo[pid].totalBalance.sub(amount);

        uint256 sumPoolBalance;
        for (uint256 i; i < uint256(poolInfo.length); ++i) {
            sumPoolBalance = sumPoolBalance.add(userInfo[i][_for].amount);
        }

        if (sumPoolBalance == 0) {
            _removeUser(_for);
        }

        uint256 amountTemp = amount;
        DepositTimestamp[] storage depositTimestamps = user.depositTimestamps;
        while (depositTimestamps.length > 0 && amountTemp > 0) {
            uint256 _idx = depositTimestamps.length - 1;
            uint256 depositAmount = depositTimestamps[_idx].amount;

            if (depositAmount > amountTemp) {
                depositTimestamps[_idx].amount = depositAmount.sub(amountTemp);
                break;
            }

            depositTimestamps.pop();

            amountTemp = amountTemp.sub(depositAmount);
        }

        emit Withdraw(msg.sender, pid, amount, _for);
    }

    // Harvest PLAYs earn from the pool.
    function harvest(uint256 _pid) external nonReentrant {
        updatePool(_pid);
        _harvest(msg.sender, _pid);
    }

    /// @notice Harvest proceeds for transaction sender to `to`.
    /// @param pid The index of the pool. See `poolInfo`.
    /// @param to Receiver of PLAY rewards.
    function _harvest(address to, uint256 pid) internal {
        PoolInfo memory pool = poolInfo[pid];
        UserInfo storage user = userInfo[pid][to];
        uint256 accumulatedPlay = user.amount.mul(pool.accPlayPerShare).div(ACC_PLAY_PRECISION);
        uint256 _pendingPlay = accumulatedPlay.sub(user.rewardDebt);
        if (_pendingPlay == 0) {
            return;
        }

        require(_pendingPlay <= play.balanceOf(address(this)), "PlayDistributor::_harvest:: wtf not enough play");

        // Effects
        user.rewardDebt = accumulatedPlay;

        // Interactions

        _safePlayTransfer(to, _pendingPlay);

        emit Harvest(msg.sender, pid, _pendingPlay);
    }

    function clearPrizePools() external override onlyLottery() {
        require(_prizePoolStatus == PrizePoolStatus.Finished, "prizePoolStatus is not finished");

        delete _prizePools;
    }

    function addPrizePool(uint256 prizePoolId_) external override onlyLottery() {
        require(_prizePoolStatus == PrizePoolStatus.Clear, "prizePoolStatus is not clear");
        require(prizePoolId_ < poolInfo.length, "invalid poolInfo index");

        bool duplicate = false;
        for (uint256 i; i < _prizePools.length; ++i) {
            if (_prizePools[i] == prizePoolId_) {
                duplicate = true;
                break;
            }
        }

        require(!duplicate, "duplicated pool id");

        _prizePools.push(prizePoolId_);
    }

    function findWinner(uint256 winningNumber_, uint256 startingTimestamp_)
        external
        view
        override
        onlyLottery()
        returns (address winner)
    {
        require(_prizePoolStatus == PrizePoolStatus.Added, "prizePoolStatus is not added");

        IPriceOracle oracle = IPriceOracle(_config.getPriceOracle());
        address _referencePriceToken = _config.getRefPriceToken();
        uint256 totalBalance;
        for (uint256 i; i < _prizePools.length; ++i) {
            uint256 prizePoolId = _prizePools[i];
            if (poolInfo[prizePoolId].totalBalance == 0) continue;

            uint256 price;
            if (poolInfo[prizePoolId].isFixedPrice) {
                price = poolInfo[prizePoolId].fixedPrice;
            } else {
                (price, ) = oracle.getPrice(IVault(stakeTokens[prizePoolId]).getToken(), _referencePriceToken);
            }

            totalBalance = totalBalance.add(
                poolInfo[prizePoolId].totalBalance.mul(price).div(1e18).mul(poolInfo[prizePoolId].multiplier).div(
                    _multiplierDenominator
                )
            );
        }

        if (totalBalance.div(1e18) > winningNumber_) {
            uint256 idx;

            for (uint256 i; i < userKeyList.length; ++i) {
                address userAddress = userKeyList[i];
                if (_blackLists[userAddress]) continue;

                uint256 userTotalBalance;
                for (uint256 j; j < _prizePools.length; ++j) {
                    uint256 prizePoolId = _prizePools[j];
                    DepositTimestamp[] memory _depositTimestamps = userInfo[prizePoolId][userAddress].depositTimestamps;
                    uint256 sum;
                    for (uint256 k; k < _depositTimestamps.length; ++k) {
                        DepositTimestamp memory _depositTimestamp = _depositTimestamps[k];

                        if (_depositTimestamp.timestamp <= startingTimestamp_) {
                            sum = sum.add(_depositTimestamp.amount);
                        } else {
                            break;
                        }
                    }

                    uint256 price;
                    if (poolInfo[prizePoolId].isFixedPrice) {
                        price = poolInfo[prizePoolId].fixedPrice;
                    } else {
                        (price, ) = oracle.getPrice(IVault(stakeTokens[prizePoolId]).getToken(), _referencePriceToken);
                    }
                    userTotalBalance = userTotalBalance.add(
                        sum.mul(price).div(1e18).mul(poolInfo[prizePoolId].multiplier).div(_multiplierDenominator)
                    );
                }

                idx = idx.add(userTotalBalance.div(1e18)); // we asuume that referencePriceToken's decimal is 18!

                if (idx > winningNumber_) {
                    winner = userAddress;
                    break;
                }
            }
        }
    }

    function transferPrize(
        address winner_,
        uint256 prize_,
        uint256 playToTheMoonAmount_,
        address prizeLocker_,
        uint256 prizeLockupBlock_
    ) external override onlyLottery() {
        require(winner_ != address(0), "wrong winner address");

        IPriceOracle oracle = IPriceOracle(_config.getPriceOracle());
        address _referencePriceToken = _config.getRefPriceToken();
        (uint256 price, ) = oracle.getPrice(address(play), _referencePriceToken);

        uint256 winnerPrize = prize_.div(price).mul(1e18);
        if (_maxTransferPrize < winnerPrize) winnerPrize = _maxTransferPrize;
        if (winnerPrize > 0) {
            if (prizeLocker_ == address(0)) {
                _mintPrize(winner_, winnerPrize);
            } else {
                _mintPrize(address(this), winnerPrize);

                SafeToken.safeApprove(address(play), prizeLocker_, winnerPrize);
                ILocker(prizeLocker_).lock(winner_, winnerPrize, prizeLockupBlock_);
            }
        }

        playToTheMoonAmount_ = playToTheMoonAmount_.div(price).mul(1e18);
        if (playToTheMoonAmount_ > 0) {
            _mintPrize(_playToTheMoon, playToTheMoonAmount_);
        }

        emit TransferPrize(winner_, winnerPrize, _playToTheMoon, playToTheMoonAmount_, prizeLocker_, prizeLockupBlock_);
    }

    function getNumTickets(
        uint256 poolId,
        address userAddress,
        uint256 startingTimestamp_
    ) external view override onlyLottery() returns (uint256 tickets) {
        require(poolId < poolInfo.length);

        DepositTimestamp[] memory _depositTimestamps = userInfo[poolId][userAddress].depositTimestamps;
        for (uint256 k; k < _depositTimestamps.length; ++k) {
            DepositTimestamp memory _depositTimestamp = _depositTimestamps[k];
            if (_depositTimestamp.timestamp <= startingTimestamp_) {
                tickets = tickets.add(_depositTimestamp.amount);
            } else {
                break;
            }
        }

        if (tickets > 0) {
            IPriceOracle oracle = IPriceOracle(_config.getPriceOracle());
            address _referencePriceToken = _config.getRefPriceToken();

            uint256 price;
            if (poolInfo[poolId].isFixedPrice) {
                price = poolInfo[poolId].fixedPrice;
            } else {
                (price, ) = oracle.getPrice(IVault(stakeTokens[poolId]).getToken(), _referencePriceToken);
            }
            tickets = tickets.mul(price).div(1e18).mul(poolInfo[poolId].multiplier).div(_multiplierDenominator);
            tickets = tickets.div(1e18);
        }
    }

    function clearUserCountPoolId() external override onlyLottery() {
        require(_userCountStatus == UserCountStatus.Finished, "userCountStatus is not finished");

        for (uint256 i; i < userKeyList.length; ++i) users[userKeyList[i]].counted = false;

        delete _userCountPoolIds;
    }

    function addUserCountPoolId(uint256 poolId_) external override onlyLottery() {
        require(_userCountStatus == UserCountStatus.Clear, "userCountStatus is not clear");
        require(poolId_ < poolInfo.length, "invalid poolInfo index");

        bool duplicate = false;
        for (uint256 i; i < _userCountPoolIds.length; ++i) {
            if (_userCountPoolIds[i] == poolId_) {
                duplicate = true;
                break;
            }
        }

        require(!duplicate, "duplicated pool id");

        _userCountPoolIds.push(poolId_);
    }

    function getNumUsers() external override onlyLottery() returns (uint256 numUsers) {
        require(_userCountStatus == UserCountStatus.Added, "userCountStatus is not added");

        for (uint256 i; i < _userCountPoolIds.length; ++i) {
            uint256 poolId = _userCountPoolIds[i];

            for (uint256 j; j < userKeyList.length; ++j) {
                address userAddress = userKeyList[j];

                if (users[userAddress].counted) continue;

                if (userInfo[poolId][userAddress].amount > 0) {
                    numUsers = numUsers.add(1);
                    users[userAddress].counted = true;
                }
            }
        }

        emit GetNumUsers(numUsers);
    }

    /// @notice This is a function to lower the cost of findWinner.
    /// We can reduce the length of depositTimestamps by calling this function periodically.
    function cleanupDepositList(
        uint256 timestamp,
        uint256 start,
        uint256 end
    ) external override onlyLottery() {
        require(_prizePoolStatus == PrizePoolStatus.Added, "prizePoolStatus is not added");

        if (end > userKeyList.length) end = userKeyList.length;
        for (uint256 i = start; i < end; ++i) {
            address userAddress = userKeyList[i];
            if (_blackLists[userAddress]) continue;

            for (uint256 j; j < _prizePools.length; ++j) {
                uint256 prizePoolId = _prizePools[j];
                UserInfo memory _user = userInfo[prizePoolId][userAddress];

                uint256 _length = _user.depositTimestamps.length;
                if (_length <= 1) continue;

                uint256 sum;
                uint256 idx;
                uint256 prev;
                for (uint256 k; k < _length; ++k) {
                    DepositTimestamp memory _depositTimestamp = _user.depositTimestamps[k];

                    require(prev <= _depositTimestamp.timestamp, "somthing wrong 0");
                    prev = _depositTimestamp.timestamp;

                    if (prev <= timestamp) {
                        uint256 _amount = _depositTimestamp.amount;
                        require(_amount > 0, "somthing wrong 1");
                        sum = sum.add(_amount);
                        idx = k;
                    } else {
                        break;
                    }
                }

                if (idx == 0) continue;

                require(sum > 0, "somthing wrong 2");
                require(_length > idx, "somthing wrong 3");

                DepositTimestamp[] storage _depositTimestamps = userInfo[prizePoolId][userAddress].depositTimestamps;

                _depositTimestamps[0].amount = sum;
                _depositTimestamps[0].timestamp = timestamp;

                for (uint256 k = 1; k < _length - idx; ++k) {
                    _depositTimestamps[k] = _depositTimestamps[idx + k];

                    uint256 _amount = _depositTimestamps[k].amount;
                    require(_amount > 0, "somthing wrong 4");

                    sum = sum.add(_amount);
                }

                for (uint256 k = 1; k <= idx; ++k) _depositTimestamps.pop();

                require(_user.amount == sum, "somthing wrong 5");
                require(_length.sub(idx) == _depositTimestamps.length, "somthing wrong 6");
            }
        }

        emit CleanupDepositList(timestamp, start, end);
    }

    function _addUser(address _key) internal {
        Entry storage entry = users[_key];
        if (entry.index == 0) {
            userKeyList.push(_key); // new entry
            entry.index = userKeyList.length;
        }
    }

    function _removeUser(address _key) internal {
        Entry memory entry = users[_key];
        require(entry.index != 0); // entry not exist
        require(entry.index <= userKeyList.length); // invalid index value

        // Move an last element of array into the vacated key slot.
        uint256 keyListLastIndex = userKeyList.length - 1;
        users[userKeyList[keyListLastIndex]].index = entry.index;
        userKeyList[entry.index - 1] = userKeyList[keyListLastIndex];
        userKeyList.pop();
        delete users[_key];
    }

    // Safe play transfer function, just in case if rounding error causes pool to not have enough PLAYs.
    function _safePlayTransfer(address _to, uint256 _amount) internal {
        uint256 playBal = play.balanceOf(address(this));
        if (_amount > playBal) {
            SafeToken.safeTransfer(address(play), _to, playBal);
        } else {
            SafeToken.safeTransfer(address(play), _to, _amount);
        }
    }

    /// @dev Mint PLAY prize.
    /// @param _to Mint to which address
    /// @param _amount Amount to be minted
    function _mintPrize(address _to, uint256 _amount) private {
        play.mint(_to, _amount);
        emit MintPrize(_to, _amount);
    }
}
