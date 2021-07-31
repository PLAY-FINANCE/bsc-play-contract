// SPDX-License-Identifier: MIT
pragma solidity 0.6.6;

import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/Math.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";

import "../utils/SafeToken.sol";
import "../interfaces/IWETH.sol";

contract MockAlpacaVault is ERC20UpgradeSafe, ReentrancyGuardUpgradeSafe, OwnableUpgradeSafe {
    /// @notice Libraries
    using SafeToken for address;
    using SafeMath for uint256;

    /// @dev Attributes for Vault
    /// token - address of the token to be deposited in this pool
    address public token;

    // address for wrapped native eg WBNB, WETH
    address public wrappedNativeAddr;

    /// @dev Get token from msg.sender
    modifier transferTokenToVault(uint256 value) {
        if (msg.value != 0) {
            require(token == wrappedNativeAddr, "Vault::transferTokenToVault:: baseToken is not wNative");
            require(value == msg.value, "Vault::transferTokenToVault:: value != msg.value");
            IWETH(wrappedNativeAddr).deposit{ value: msg.value }();
        } else {
            SafeToken.safeTransferFrom(token, msg.sender, address(this), value);
        }
        _;
    }

    function initialize(
        address _token,
        string calldata _name,
        string calldata _symbol,
        uint8 _decimals,
        address _wrappedNativeAddr
    ) external initializer {
        OwnableUpgradeSafe.__Ownable_init();
        ReentrancyGuardUpgradeSafe.__ReentrancyGuard_init();
        ERC20UpgradeSafe.__ERC20_init(_name, _symbol);
        _setupDecimals(_decimals);

        token = _token;

        wrappedNativeAddr = _wrappedNativeAddr;
    }

    /// @dev for test purposes only.
    function transferToken(address to_, uint256 amount_) external {
        SafeToken.safeTransfer(token, to_, amount_);
    }

    /// @dev Return the total token entitled to the token holders. Be careful of unaccrued interests.
    function totalToken() public view returns (uint256) {
        return SafeToken.myBalance(token);
    }

    /// @dev Add more token to the lending pool. Hope to get some good returns.
    function deposit(uint256 amountToken) external payable transferTokenToVault(amountToken) nonReentrant {
        _deposit(amountToken);
    }

    function _deposit(uint256 amountToken) internal {
        uint256 total = totalToken().sub(amountToken);
        uint256 share = total == 0 ? amountToken : amountToken.mul(totalSupply()).div(total);
        _mint(msg.sender, share);
        // comment out for test purpose only.
        // require(totalSupply() > 1e17, "Vault::deposit:: no tiny shares");
    }

    /// @dev Withdraw token from the lending and burning ibToken.
    function withdraw(uint256 share) external nonReentrant {
        uint256 amount = share.mul(totalToken()).div(totalSupply());
        _burn(msg.sender, share);
        if (token == wrappedNativeAddr) {
            IWETH(wrappedNativeAddr).withdraw(amount);
            SafeToken.safeTransferETH(msg.sender, amount);
        } else {
            SafeToken.safeTransfer(token, msg.sender, amount);
        }
        // comment out for test purpose only.
        //require(totalSupply() > 1e17, "Vault::withdraw:: no tiny shares");
    }

    /// @dev Fallback function to accept ETH. Workers will send ETH back the pool.
    receive() external payable {}
}
