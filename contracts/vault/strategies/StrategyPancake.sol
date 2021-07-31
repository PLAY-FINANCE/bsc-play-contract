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
import "../../interfaces/IPancake.sol";
import "../../interfaces/IWETH.sol";
import "../../interfaces/IConfig.sol";

// utils
import "../../utils/SafeToken.sol";

// single asset strategy (LP not supported!)
contract StrategyPancake is Ownable {
    using SafeMath for uint256;
    using SafeToken for address;

    // cake token address
    address private _cakeAddress;

    // pancake masterchef address
    address private _masterChefAddress;

    // token address
    address private _tokenAddress;

    // masterchef pool id
    uint256 private _poolId;

    // cake to token swap path
    address[] private _cakeToTokenPath;

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
        address tokenAddress_,
        uint256 poolId_,
        address[] memory cakeToTokenPath_,
        address config_,
        address cakeAddress_,
        address masterChefAddress_,
        address safuAddress_
    ) public {
        require(tokenAddress_ != address(0), "address cant be zero");
        require(config_ != address(0), "address cant be zero");
        require(cakeAddress_ != address(0), "address cant be zero");
        require(masterChefAddress_ != address(0), "address cant be zero");
        require(safuAddress_ != address(0), "address cant be zero");

        _tokenAddress = tokenAddress_;
        _config = IConfig(config_);
        _poolId = poolId_;
        _cakeToTokenPath = cakeToTokenPath_;
        _cakeAddress = cakeAddress_;
        _masterChefAddress = masterChefAddress_;
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
        pendingAmount = IMasterChef(_masterChefAddress).pendingCake(_poolId, address(this));
        if (_cakeAddress != _tokenAddress) {
            if (pendingAmount > 0) {
                address router = _config.getRouter();
                uint256[] memory pendingAmounts = IPancakeRouterV2(router).getAmountsOut(
                    pendingAmount,
                    _cakeToTokenPath
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
        if (amount > _tokenLocked()) _withdraw(amount.sub(_tokenLocked()));
        SafeToken.safeTransfer(_tokenAddress, msg.sender, amount);
        emit Withdraw(amount);
    }

    function reinvest() external onlyOwner {
        if (_stakedTokens() > 0) {
            if (_poolId == 0) IMasterChef(_masterChefAddress).leaveStaking(0);
            else IMasterChef(_masterChefAddress).withdraw(_poolId, 0);
        }

        uint256 earnedAmount = IERC20(_cakeAddress).balanceOf(address(this));
        if (_cakeAddress != _tokenAddress) {
            if (earnedAmount > 0) {
                address router = _config.getRouter();
                SafeToken.safeApprove(_cakeAddress, router, earnedAmount);
                IPancakeRouterV2(router).swapExactTokensForTokens(
                    earnedAmount,
                    0,
                    _cakeToTokenPath,
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
        SafeToken.safeApprove(_tokenAddress, _masterChefAddress, amount);
        if (_poolId == 0) IMasterChef(_masterChefAddress).enterStaking(amount);
        else IMasterChef(_masterChefAddress).deposit(_poolId, amount);
    }

    function _withdraw(uint256 amount) internal {
        uint256 totalToken = _stakedTokens();
        require(totalToken >= amount, "invalid input amount");

        if (_poolId == 0) IMasterChef(_masterChefAddress).leaveStaking(amount);
        else IMasterChef(_masterChefAddress).withdraw(_poolId, amount);
    }

    function _stakedTokens() internal view returns (uint256 amount) {
        (amount, ) = IMasterChef(_masterChefAddress).userInfo(_poolId, address(this));
    }

    function _tokenLocked() internal view returns (uint256) {
        return IERC20(_tokenAddress).balanceOf(address(this));
    }

    /// @dev This function is only used for 3rd party strategy compenstation plan for worst case (e.g. hacking).
    // If compensation is received with a token that is not used in this contract, the token can only be transferred to SAFU.
    // We desperately hope we never have to use this function.
    function transferCompenstationToken(address token_, uint256 amount_) external {
        require(msg.sender == _govAddress, "permission denied");
        require(token_ != _cakeAddress, "permission denied");
        require(token_ != _tokenAddress, "permission denied");

        SafeToken.safeTransfer(token_, _safuAddress, amount_);

        emit TransferCompensationToken(token_, _safuAddress, amount_);
    }
}
