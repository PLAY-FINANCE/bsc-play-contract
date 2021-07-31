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
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@pancakeswap-libs/pancake-swap-core/contracts/interfaces/IPancakeFactory.sol";
import "@pancakeswap-libs/pancake-swap-core/contracts/interfaces/IPancakePair.sol";

// utils
import "../utils/SafeToken.sol";

// interfaces
import "../interfaces/IPancake.sol";
import "../interfaces/IWETH.sol";
import "../interfaces/IVault.sol";
import "../interfaces/IConfig.sol";

contract Fund is Ownable {
    /// @notice Libraries
    using SafeToken for address;
    using SafeMath for uint256;

    /// @dev Attributes for Fund
    // Storing of the config
    IConfig private _config;

    /// @dev PlayToTheMoonFund flag
    bool private _isPlayToTheMoon;

    /// @notice Events
    event Deposit(address indexed _vault, uint256 _amount);
    event Withdraw(address indexed _vault, uint256 _amount);
    event Transfer(address indexed _token, address indexed _to, uint256 _amount);
    event Swap(
        address indexed _token0,
        address indexed _token1,
        uint256 _amountIn,
        uint256 _amountOutMin,
        uint256 _deadline
    );
    event AddLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        uint256 deadline
    );
    event RemoveLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        uint256 deadline
    );

    constructor(address config_, bool isPlayToTheMoon_) public {
        require(config_ != address(0), "config_ cant be zero");

        _config = IConfig(config_);
        _isPlayToTheMoon = isPlayToTheMoon_;
    }

    function deposit(address vault_, uint256 amount_) external onlyOwner {
        require(vault_ != address(0), "vault cant be zero");

        address token_ = IVault(vault_).getToken();
        address _wbnbAddress = _config.getWbnb();

        if (token_ == _wbnbAddress) {
            if (IERC20(token_).balanceOf(address(this)) < amount_) {
                uint256 amount = amount_.sub(IERC20(token_).balanceOf(address(this)));
                IWETH(_wbnbAddress).deposit{ value: amount }();
            }
        }

        require(IERC20(token_).balanceOf(address(this)) >= amount_, "balance not enough");

        SafeToken.safeApprove(token_, vault_, uint256(-1));
        IVault(vault_).deposit(amount_);
        SafeToken.safeApprove(token_, vault_, uint256(0));

        emit Deposit(vault_, amount_);
    }

    function withdraw(address vault_, uint256 amount_) external onlyOwner {
        require(vault_ != address(0), "vault cant be zero");
        require(IERC20(vault_).balanceOf(address(this)) >= amount_, "balance not enough");

        IVault(vault_).withdraw(amount_);

        emit Withdraw(vault_, amount_);
    }

    function transfer(
        address token_,
        address to_,
        uint256 amount_
    ) external onlyOwner {
        require(!_isPlayToTheMoon, "PlayToTheMoonFund cant transfer anything");
        require(token_ != address(0), "token address not valid");
        require(to_ != address(0), "to address not valid");
        require(amount_ > 0, "amount should be larger than zero");

        address _wbnbAddress = _config.getWbnb();
        if (token_ == _wbnbAddress) {
            if (address(this).balance < amount_) {
                uint256 amount = amount_.sub(address(this).balance);
                IWETH(_wbnbAddress).withdraw(amount);
            }
            require(address(this).balance >= amount_, "balance not enough");
            SafeToken.safeTransferETH(to_, amount_);
        } else {
            require(IERC20(token_).balanceOf(address(this)) >= amount_, "balance not enough");
            SafeToken.safeTransfer(token_, to_, amount_);
        }

        emit Transfer(token_, to_, amount_);
    }

    function swap(
        address token0_,
        address token1_,
        uint256 amountIn_,
        uint256 amountOutMin_,
        uint256 deadline_
    ) external onlyOwner returns (uint256[] memory amountOuts) {
        require(token0_ != address(0), "address cant be zero");
        require(token1_ != address(0), "address cant be zero");
        require(token0_ != token1_, "cant swap");
        require(amountIn_ > 0, "amountIn should be larger than zero");
        require(_config.getSwapWhiteList(token0_), "token0_ cannot trade");
        require(_config.getSwapWhiteList(token1_), "token1_ cannot trade");

        address _wbnbAddress = _config.getWbnb();

        if (token0_ == _wbnbAddress) {
            if (IERC20(token0_).balanceOf(address(this)) < amountIn_) {
                uint256 amount = amountIn_.sub(IERC20(token0_).balanceOf(address(this)));
                IWETH(_wbnbAddress).deposit{ value: amount }();
            }
        }

        require(IERC20(token0_).balanceOf(address(this)) >= amountIn_, "balance not enough");

        address _router = _config.getRouter();
        // set approval
        SafeToken.safeApprove(token0_, _router, uint256(-1));

        address[] memory path = new address[](2);
        (path[0], path[1]) = (token0_, token1_);

        amountOuts = IPancakeRouterV2(_router).swapExactTokensForTokens(
            amountIn_,
            amountOutMin_,
            path,
            address(this),
            deadline_
        );

        // reset approval
        SafeToken.safeApprove(token0_, _router, uint256(0));

        if (token0_ == _wbnbAddress || token1_ == _wbnbAddress) {
            uint256 wbnbBal = IERC20(_wbnbAddress).balanceOf(address(this));
            IWETH(_wbnbAddress).withdraw(wbnbBal);
        }

        emit Swap(token0_, token1_, amountIn_, amountOutMin_, deadline_);
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        uint256 deadline
    )
        external
        onlyOwner
        returns (
            uint256 amountA,
            uint256 amountB,
            uint256 liquidity
        )
    {
        require(tokenA != address(0), "address cant be zero");
        require(tokenB != address(0), "address cant be zero");
        require(tokenA != tokenB, "cant add liquidity");
        require(amountADesired > 0, "amountADesired should be larger than zero");
        require(amountBDesired > 0, "amountBDesired should be larger than zero");

        address _wbnbAddress = _config.getWbnb();
        if (tokenA == _wbnbAddress) {
            if (IERC20(tokenA).balanceOf(address(this)) < amountADesired) {
                uint256 amount = amountADesired.sub(IERC20(tokenA).balanceOf(address(this)));
                IWETH(_wbnbAddress).deposit{ value: amount }();
            }
        }

        require(IERC20(tokenA).balanceOf(address(this)) >= amountADesired, "balance not enough");

        if (tokenB == _wbnbAddress) {
            if (IERC20(tokenB).balanceOf(address(this)) < amountBDesired) {
                uint256 amount = amountBDesired.sub(IERC20(tokenB).balanceOf(address(this)));
                IWETH(_wbnbAddress).deposit{ value: amount }();
            }
        }

        require(IERC20(tokenB).balanceOf(address(this)) >= amountBDesired, "balance not enough");

        address _router = _config.getRouter();

        // set approval
        SafeToken.safeApprove(tokenA, _router, uint256(-1));
        SafeToken.safeApprove(tokenB, _router, uint256(-1));

        (amountA, amountB, liquidity) = IPancakeRouterV2(_router).addLiquidity(
            tokenA,
            tokenB,
            amountADesired,
            amountBDesired,
            amountAMin,
            amountBMin,
            address(this),
            deadline
        );

        // reset approval
        SafeToken.safeApprove(tokenA, _router, uint256(0));
        SafeToken.safeApprove(tokenB, _router, uint256(0));

        emit AddLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin, deadline);
    }

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        uint256 deadline
    ) external onlyOwner returns (uint256 amountA, uint256 amountB) {
        require(tokenA != address(0), "address cant be zero");
        require(tokenB != address(0), "address cant be zero");
        require(tokenA != tokenB, "cant remove liquidity");
        require(liquidity > 0, "liquidity should be larger than zero");

        address _factory = _config.getFactory();

        IPancakePair lpToken = IPancakePair(IPancakeFactory(_factory).getPair(tokenA, tokenB));

        require(lpToken.balanceOf(address(this)) >= liquidity, "balance not enough");

        address _router = _config.getRouter();
        // set approval
        SafeToken.safeApprove(address(lpToken), _router, uint256(-1));

        (amountA, amountB) = IPancakeRouterV2(_router).removeLiquidity(
            tokenA,
            tokenB,
            liquidity,
            amountAMin,
            amountBMin,
            address(this),
            deadline
        );

        // reset approval
        SafeToken.safeApprove(address(lpToken), _router, uint256(0));

        address _wbnbAddress = _config.getWbnb();
        if (tokenA == _wbnbAddress || tokenB == _wbnbAddress) {
            uint256 wbnbBal = IERC20(_wbnbAddress).balanceOf(address(this));
            IWETH(_wbnbAddress).withdraw(wbnbBal);
        }

        emit RemoveLiquidity(tokenA, tokenB, liquidity, amountAMin, amountBMin, deadline);
    }

    function wrapBNB() external onlyOwner {
        uint256 bnbBal = address(this).balance;
        if (bnbBal > 0) {
            address _wbnbAddress = _config.getWbnb();
            IWETH(_wbnbAddress).deposit{ value: bnbBal }();
        }
    }

    function unwrapBNB() external onlyOwner {
        address _wbnbAddress = _config.getWbnb();
        uint256 wbnbBal = IERC20(_wbnbAddress).balanceOf(address(this));
        if (wbnbBal > 0) {
            IWETH(_wbnbAddress).withdraw(wbnbBal);
        }
    }

    /// @dev Fallback function to accept BNB.
    receive() external payable {}
}
