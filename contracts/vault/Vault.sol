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
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

// interfaces
import "../interfaces/IWETH.sol";
import "../interfaces/IPlayDistributor.sol";
import "../interfaces/IStrategy.sol";
import "../interfaces/IVault.sol";
import "../interfaces/IConfig.sol";

// utils
import "../utils/SafeToken.sol";

contract Vault is IVault, ERC20, ReentrancyGuard, Ownable, Pausable {
    /// @notice Libraries
    using SafeToken for address;
    using SafeMath for uint256;

    /// @notice Events
    event SetPoolId(uint256 poolId);
    event SetLotteryType(uint256 lotteryType);
    event SetMinDepositAmount(uint256 minDepositAmount);
    event SetWithdrawFee(uint256 withdrawFee);
    event SetGovAddress(address govAddress);
    event Deposit(uint256 amount);
    event Withdraw(uint256 amount);
    event Harvest(uint256 amount);
    event Pause();
    event Unpause();

    /// @dev Attributes for Vault
    /// token - address of the token to be deposited in this pool
    address private _token;

    // strategy address
    address private _strategy;

    // lottery address
    address public _lottery;

    // funds addressf
    address private _playToTheMoon;
    address private _safu;
    address private _operator;

    // only updated when deposit / withdraw is called
    uint256 private balanceSnapshot;

    // play distributor address
    address private _playDistributor;

    // pool id
    uint256 private _playDistributorPoolId;

    // lottery type
    uint256 private _lotteryType;

    // pool id set flag
    bool private _isSetPoolId;

    // config address
    IConfig private _config;

    // gov address for pause
    address private _govAddress;

    // minimum deposit amount
    uint256 private _minDepositAmount;

    // withdraw fee token
    address private immutable _withdrawFeeToken;

    // withdraw fee
    uint256 private _withdrawFee;

    /// @dev modifier
    modifier onlyLottery() {
        require(msg.sender == _lottery, "Only Lottery can call function");
        _;
    }

    /// @dev Get token from msg.sender
    modifier transferTokenToVault(uint256 value) {
        if (msg.value != 0) {
            address _wbnbAddress = _config.getWbnb();
            require(_token == _wbnbAddress, "Vault::transferTokenToVault:: baseToken is not wNative");
            require(value == msg.value, "Vault::transferTokenToVault:: value != msg.value");
            IWETH(_wbnbAddress).deposit{ value: msg.value }();
        } else {
            SafeToken.safeTransferFrom(_token, msg.sender, address(this), value);
        }
        _;
    }

    /// @dev constructor
    constructor(
        address playDistributor_,
        address token_,
        address strategy_,
        address lottery_,
        address playToTheMoon_,
        address safu_,
        address operator_,
        address config_,
        address withdrawFeeToken_,
        string memory name_,
        string memory symbol_,
        uint8 decimals_
    ) public ERC20(name_, symbol_) {
        _setupDecimals(decimals_);

        require(playDistributor_ != address(0), "address can not be zero");
        require(token_ != address(0), "address can not be zero");
        require(lottery_ != address(0), "address can not be zero");
        require(playToTheMoon_ != address(0), "address can not be zero");
        require(safu_ != address(0), "address can not be zero");
        require(operator_ != address(0), "address can not be zero");
        require(config_ != address(0), "address can not be zero");
        require(withdrawFeeToken_ != address(0), "address can not be zero");

        _playDistributor = playDistributor_;
        _token = token_;
        _strategy = strategy_;

        _playToTheMoon = playToTheMoon_;
        _safu = safu_;
        _operator = operator_;

        _lottery = lottery_;
        _config = IConfig(config_);

        _govAddress = msg.sender;

        _withdrawFeeToken = withdrawFeeToken_;
    }

    /// @dev setter
    function setPoolId(uint256 poolId_) external override {
        require(msg.sender == _playDistributor, "only playDistributor");
        require(!_isSetPoolId, "set already");

        _playDistributorPoolId = poolId_;
        _isSetPoolId = true;

        emit SetPoolId(_playDistributorPoolId);
    }

    function setLotteryType(uint256 lotteryType_) external override onlyLottery {
        _lotteryType = lotteryType_;

        emit SetLotteryType(_lotteryType);
    }

    function setMinDepositAmount(uint256 minDepositAmount_) external onlyOwner {
        _minDepositAmount = minDepositAmount_;

        emit SetMinDepositAmount(_minDepositAmount);
    }

    function setWithdrawFee(uint256 withdrawFee_) external onlyOwner {
        _withdrawFee = withdrawFee_;

        emit SetWithdrawFee(withdrawFee_);
    }

    function setGovAddress(address govAddress_) external {
        require(msg.sender == _govAddress, "permission denied");
        require(govAddress_ != address(0), "address cant be zero");
        _govAddress = govAddress_;

        emit SetGovAddress(_govAddress);
    }

    /// @dev getter
    function getPoolId() external view override returns (uint256) {
        require(_isSetPoolId, "pool id must be set");

        return _playDistributorPoolId;
    }

    /// @dev Return the token address.
    function getToken() external view override returns (address) {
        return _token;
    }

    /// @dev Return the user balance.
    function getUserBalance(address user) external view override returns (uint256) {
        require(_isSetPoolId, "pool id must be set");
        require(user != address(0), "address cannt be zero");

        return IPlayDistributor(_playDistributor).getUserBalance(_playDistributorPoolId, user);
    }

    /// @dev Return balance snapshot.
    function getBalanceSnapshot() external view returns (uint256) {
        return balanceSnapshot;
    }

    /// @dev return the isPrizeVault.
    function isPrizeVault() external pure override returns (bool) {
        return false;
    }

    /// @dev return pending amount.
    function pending() external view override returns (uint256 totalEarned) {
        if (_strategy != address(0)) {
            totalEarned = IStrategy(_strategy).pending();
        }
    }

    /// @dev Add more token.
    function deposit(uint256 amountToken)
        external
        payable
        override
        transferTokenToVault(amountToken)
        nonReentrant
        whenNotPaused
    {
        require(_minDepositAmount <= amountToken, "invalid input amount");

        if (_strategy != address(0)) {
            uint256 totalAmount = IStrategy(_strategy).getTotalBalance();
            require(totalAmount >= balanceSnapshot, "worst case (ex. strategy has been hacked)");

            SafeToken.safeApprove(_token, _strategy, amountToken);
            IStrategy(_strategy).deposit(amountToken);
        }

        if (msg.sender != _playToTheMoon && msg.sender != _safu && msg.sender != _operator) {
            require(_isSetPoolId, "pool id must be set");

            _mint(address(this), amountToken);
            SafeToken.safeApprove(address(this), _playDistributor, amountToken);
            IPlayDistributor(_playDistributor).deposit(msg.sender, _playDistributorPoolId, amountToken);
        } else {
            _mint(msg.sender, amountToken);
        }

        balanceSnapshot = balanceSnapshot.add(amountToken);

        emit Deposit(amountToken);
    }

    /// @dev Withdraw token.
    function withdraw(uint256 amountToken) external override nonReentrant {
        if (_withdrawFee > 0) {
            SafeToken.safeTransferFrom(_withdrawFeeToken, msg.sender, address(this), _withdrawFee);
            SafeToken.safeTransfer(_withdrawFeeToken, _operator, _withdrawFee);
        }
        _withdraw(msg.sender, amountToken);
    }

    /// @dev Harvest token. only lottery can access.
    function harvest() external override onlyLottery() whenNotPaused returns (uint256 totalEarned) {
        if (_strategy != address(0)) {
            if (IStrategy(_strategy).getTotalBalance() < balanceSnapshot) return 0; // worst case (ex. strategy has been hakced)

            IStrategy(_strategy).reinvest();

            uint256 totalAmount = IStrategy(_strategy).getTotalBalance();
            totalEarned = totalAmount.sub(balanceSnapshot);

            (, uint256 safuFee, uint256 operatorFee, , uint256 denominatorFee) = _config.getFeeInfo(_lotteryType);

            uint256 safuAmount = totalEarned.mul(safuFee).div(denominatorFee);
            uint256 operatorAmount = totalEarned.mul(operatorFee).div(denominatorFee);
            uint256 playToTheMoonAmount = totalEarned.sub(operatorAmount).sub(safuAmount);

            if (safuAmount > 0 && safuAmount <= totalEarned) {
                _mint(_safu, safuAmount);
            }

            if (operatorAmount > 0 && operatorAmount <= totalEarned.sub(safuAmount)) {
                _mint(_operator, operatorAmount);
            }

            if (playToTheMoonAmount > 0 && playToTheMoonAmount <= totalEarned.sub(safuAmount).sub(operatorAmount)) {
                _mint(_playToTheMoon, playToTheMoonAmount);
            }

            balanceSnapshot = balanceSnapshot.add(totalEarned);

            emit Harvest(totalEarned);
        }
    }

    /// @dev Emergency withdraw token.
    function emergencyWithdraw(address for_, uint256 amountToken) external whenPaused {
        require(msg.sender == _govAddress, "permission denied");
        _withdraw(for_, amountToken);
    }

    function pause() external {
        require(msg.sender == _govAddress, "permission denied");
        _pause();
        emit Pause();
    }

    function unpause() external {
        require(msg.sender == _govAddress, "permission denied");
        _unpause();
        emit Unpause();
    }

    // internal functions
    function _withdraw(address for_, uint256 amountToken) internal {
        uint256 _amount = amountToken;

        if (_strategy != address(0)) {
            uint256 totalAmount = IStrategy(_strategy).getTotalBalance();
            if (totalAmount < balanceSnapshot) {
                // worst case (ex. strategy has been hakced)
                // In case of a loss in principal due to a critical problem in the strategy of the 3rd party,
                // the remaining amount should be distributed to users as reasonably as possible.
                // We don't want people who withdraw first to benefit and those who withdraw later to lose money.
                _amount = _amount.mul(totalAmount).div(balanceSnapshot);
            }

            IStrategy(_strategy).withdraw(_amount);
        }

        if (for_ != _playToTheMoon && for_ != _safu && for_ != _operator) {
            require(_isSetPoolId, "pool id must be set");

            IPlayDistributor(_playDistributor).withdraw(for_, _playDistributorPoolId, amountToken);
            _burn(address(this), amountToken);
        } else {
            _burn(for_, amountToken);
        }

        require(IERC20(_token).balanceOf(address(this)) >= _amount, "balance not enough");

        address _wbnbAddress = _config.getWbnb();
        if (_token == _wbnbAddress) {
            uint256 wbnbBal = IERC20(_wbnbAddress).balanceOf(address(this));
            if (wbnbBal > 0) {
                IWETH(_wbnbAddress).withdraw(wbnbBal);
            }

            SafeToken.safeTransferETH(for_, _amount);
        } else {
            SafeToken.safeTransfer(_token, for_, _amount);
        }

        require(balanceSnapshot >= amountToken, "balanceSnapshot value error");
        balanceSnapshot = balanceSnapshot.sub(amountToken);

        emit Withdraw(amountToken);
    }

    /// @dev Fallback function to accept BNB.
    receive() external payable {}
}
