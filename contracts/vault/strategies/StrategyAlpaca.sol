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
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

// interfaces
import "../../interfaces/IAlpaca.sol";
import "../../interfaces/IPancake.sol";
import "../../interfaces/IWETH.sol";
import "../../interfaces/IConfig.sol";

// utils
import "../../utils/SafeToken.sol";

// single asset strategy (LP not supported!)
contract StrategyAlpaca is Ownable {
    using SafeMath for uint256;
    using SafeToken for address;

    // alpaca token address
    address private _alpacaAddress;

    // alpaca fair launch address
    address private _fairLaunchAddress;

    // alpaca vault address
    address private _alpacaVaultAddress;

    // is bnb flag
    bool private _isWbnb;

    // token address
    address private _tokenAddress;

    // alpaca vault's fairlaunch pool id
    uint256 private _poolId;

    // alpaca to token swap path
    address[] private _alpacaToTokenPath;

    // Storing of the config
    IConfig private _config;

    // gov address for pause
    address private _govAddress;

    // safu address
    address private _safuAddress;

    /// @notice Events
    event Deposit(uint256 amount);
    event Withdraw(uint256 amount);
    event Reinvest();
    event SetGovAddress(address _govAddress);
    event TransferCompensationToken(address token, address safuAddress, uint256 amount);

    /// @dev constructor
    constructor(
        address alpacaVaultAddress_,
        address tokenAddress_,
        uint256 poolId_,
        address[] memory alpacaToTokenPath_,
        address config_,
        address alpacaAddress_,
        address fairLaunchAddress_,
        address safuAddress_
    ) public {
        require(alpacaVaultAddress_ != address(0), "address cant be zero");
        require(tokenAddress_ != address(0), "address cant be zero");
        require(config_ != address(0), "address cant be zero");
        require(alpacaAddress_ != address(0), "address cant be zero");
        require(fairLaunchAddress_ != address(0), "address cant be zero");
        require(safuAddress_ != address(0), "address cant be zero");

        _alpacaVaultAddress = alpacaVaultAddress_;
        _tokenAddress = tokenAddress_;
        _config = IConfig(config_);
        _poolId = poolId_;
        _isWbnb = _tokenAddress == _config.getWbnb();
        _alpacaToTokenPath = alpacaToTokenPath_;
        _alpacaAddress = alpacaAddress_;
        _fairLaunchAddress = fairLaunchAddress_;
        _safuAddress = safuAddress_;
        _govAddress = msg.sender;
    }

    /// @dev setter
    function setGovAddress(address govAddress_) external {
        require(msg.sender == _govAddress, "permission denied");
        require(govAddress_ != address(0), "address cant be zero");
        _govAddress = govAddress_;

        emit SetGovAddress(_govAddress);
    }

    /// @dev View functions
    function getTotalBalance() external view returns (uint256) {
        return _tokenLocked().add(_stakedTokens());
    }

    function pending() external view returns (uint256 pendingAmount) {
        pendingAmount = IFairLaunch(_fairLaunchAddress).pendingAlpaca(_poolId, address(this));
        if (_alpacaAddress != _tokenAddress) {
            if (pendingAmount > 0) {
                address router = _config.getRouter();
                uint256[] memory pendingAmounts = IPancakeRouterV2(router).getAmountsOut(
                    pendingAmount,
                    _alpacaToTokenPath
                );
                pendingAmount = pendingAmounts[pendingAmounts.length - 1];
            }
        }
    }

    /// @dev  Restricted Access Functions (onlyOwner)
    function deposit(uint256 amount) external onlyOwner {
        SafeToken.safeTransferFrom(_tokenAddress, msg.sender, address(this), amount);
        _deposit(amount);
        emit Deposit(amount);
    }

    function withdraw(uint256 amount) external onlyOwner {
        if (amount > _tokenLocked()) {
            _withdraw(amount.sub(_tokenLocked()));
            if (_isWbnb) _wrapBNB();
        }
        SafeToken.safeTransfer(_tokenAddress, msg.sender, amount);
        emit Withdraw(amount);
    }

    function reinvest() external onlyOwner {
        (uint256 amount, , ) = IFairLaunch(_fairLaunchAddress).userInfo(_poolId, address(this));
        if (amount > 0) IFairLaunch(_fairLaunchAddress).harvest(_poolId);

        uint256 earnedAmount = IAlpacaToken(_alpacaAddress).balanceOf(address(this));
        if (_alpacaAddress != _tokenAddress) {
            if (earnedAmount > 0) {
                address router = _config.getRouter();
                SafeToken.safeApprove(_alpacaAddress, router, earnedAmount);
                IPancakeRouterV2(router).swapExactTokensForTokens(
                    earnedAmount,
                    0,
                    _alpacaToTokenPath,
                    address(this),
                    now.add(600)
                );
            }
            earnedAmount = IERC20(_tokenAddress).balanceOf(address(this));
        }

        if (earnedAmount > 0) _deposit(earnedAmount);

        emit Reinvest();
    }

    /// @dev internal functions

    function _deposit(uint256 amount) internal {
        if (_isWbnb) {
            _unwrapBNB();
            IAlpacaVault(_alpacaVaultAddress).deposit{ value: amount }(amount);
        } else {
            SafeToken.safeApprove(_tokenAddress, _alpacaVaultAddress, amount);
            IAlpacaVault(_alpacaVaultAddress).deposit(amount);
        }

        uint256 _amount = IAlpacaVault(_alpacaVaultAddress).balanceOf(address(this));
        SafeToken.safeApprove(_alpacaVaultAddress, _fairLaunchAddress, _amount);
        IFairLaunch(_fairLaunchAddress).deposit(address(this), _poolId, _amount);
    }

    function _withdraw(uint256 amount) internal {
        uint256 totalSupply = IAlpacaVault(_alpacaVaultAddress).totalSupply();
        uint256 totalToken = IAlpacaVault(_alpacaVaultAddress).totalToken();

        uint256 _amount = amount.mul(totalSupply).div(totalToken);
        IFairLaunch(_fairLaunchAddress).withdraw(address(this), _poolId, _amount);
        IAlpacaVault(_alpacaVaultAddress).withdraw(IAlpacaVault(_alpacaVaultAddress).balanceOf(address(this)));
    }

    function _stakedTokens() internal view returns (uint256) {
        uint256 totalSupply = IAlpacaVault(_alpacaVaultAddress).totalSupply();
        uint256 totalToken = IAlpacaVault(_alpacaVaultAddress).totalToken();
        if (totalSupply == 0 || totalToken == 0) return 0;

        (uint256 _amount, , ) = IFairLaunch(_fairLaunchAddress).userInfo(_poolId, address(this));
        return _amount.mul(totalToken).div(totalSupply);
    }

    function _tokenLocked() internal view returns (uint256) {
        return IERC20(_tokenAddress).balanceOf(address(this));
    }

    function _wrapBNB() internal {
        uint256 bnbBal = address(this).balance;
        if (bnbBal > 0) IWETH(_config.getWbnb()).deposit{ value: bnbBal }();
    }

    function _unwrapBNB() internal {
        address _wbnbAddress = _config.getWbnb();
        uint256 wbnbBal = IERC20(_wbnbAddress).balanceOf(address(this));
        if (wbnbBal > 0) IWETH(_wbnbAddress).withdraw(wbnbBal);
    }

    /// @dev This function is only used for 3rd party strategy compenstation plan for worst case (e.g. hacking).
    // If compensation is received with a token that is not used in this contract, the token can only be transferred to SAFU.
    // We desperately hope we never have to use this function.
    function transferCompenstationToken(address token_, uint256 amount_) external {
        require(msg.sender == _govAddress, "permission denied");
        require(token_ != _alpacaAddress, "permission denied");
        require(token_ != _tokenAddress, "permission denied");
        require(token_ != _alpacaVaultAddress, "permission denied");

        SafeToken.safeTransfer(token_, _safuAddress, amount_);

        emit TransferCompensationToken(token_, _safuAddress, amount_);
    }

    /// @dev Fallback function to accept BNB.
    receive() external payable {}
}
