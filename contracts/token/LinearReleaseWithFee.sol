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
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

// interfaces
import "../interfaces/ILocker.sol";

// utils
import "../utils/SafeToken.sol";

contract LinearReleaseWithFee is ILocker, Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeToken for address;

    // Lock info
    struct LockInfo {
        uint256 amount;
        uint256 lastUnlockBlock;
        uint256 endReleaseBlock;
    }

    address public token;
    address public feeToken;
    uint256 public feeAmount;
    address public operator;

    mapping(address => LockInfo[]) private _locks;

    event Lock(address indexed to, uint256 value, uint256 lockupBlock);
    event Claim(address indexed to, uint256 value);

    constructor(
        address _token,
        address _feeToken,
        uint256 _feeAmount,
        address _operator
    ) public {
        require(_token != address(0), "wrong address");
        if (_feeAmount > 0) {
            require(_feeToken != address(0), "wrong address");
            require(_operator != address(0), "wrong address");
        }
        token = _token;
        feeToken = _feeToken;
        feeAmount = _feeAmount;
        operator = _operator;
    }

    /// @dev view functions
    function lockOf(address _user) external view returns (uint256 lockedAmount) {
        LockInfo[] memory locks = _locks[_user];
        for (uint256 i; i < locks.length; ++i) {
            lockedAmount = lockedAmount + locks[i].amount;
        }
    }

    function pending(address _user) external view returns (uint256 pendingAmount) {
        LockInfo[] memory locks = _locks[_user];

        for (uint256 i; i < locks.length; ++i) {
            LockInfo memory _lock = locks[i];
            if (block.number >= _lock.endReleaseBlock) {
                pendingAmount = pendingAmount.add(_lock.amount);
            } else {
                uint256 releasedBlock = block.number.sub(_lock.lastUnlockBlock);
                uint256 blockLeft = _lock.endReleaseBlock.sub(_lock.lastUnlockBlock);
                pendingAmount = pendingAmount.add(_lock.amount.mul(releasedBlock).div(blockLeft));
            }
        }
    }

    /// @dev state modifying functions
    function lock(
        address _user,
        uint256 _amount,
        uint256 _lockupBlock
    ) external override onlyOwner {
        require(_user != address(0), "lock: no address(0)");
        require(_amount > 0, "lock: no amount(0)");

        SafeToken.safeTransferFrom(token, msg.sender, address(this), _amount);

        LockInfo memory _lock = LockInfo(_amount, block.number, block.number.add(_lockupBlock));
        _locks[_user].push(_lock);

        emit Lock(_user, _amount, _lockupBlock);
    }

    function claim() external nonReentrant {
        if (feeAmount > 0) {
            SafeToken.safeTransferFrom(feeToken, msg.sender, address(this), feeAmount);
            SafeToken.safeTransfer(feeToken, operator, feeAmount);
        }

        LockInfo[] storage locks = _locks[msg.sender];

        uint256 pendingAmount;
        for (uint256 i; i < locks.length; ++i) {
            LockInfo storage _lock = locks[i];
            if (_lock.amount == 0) {
                continue;
            }

            if (block.number >= _lock.endReleaseBlock) {
                pendingAmount = pendingAmount.add(_lock.amount);

                _lock.amount = 0;
            } else {
                uint256 releasedBlock = block.number.sub(_lock.lastUnlockBlock);
                uint256 blockLeft = _lock.endReleaseBlock.sub(_lock.lastUnlockBlock);
                uint256 amount = _lock.amount.mul(releasedBlock).div(blockLeft);
                pendingAmount = pendingAmount.add(amount);
                _lock.amount = _lock.amount.sub(amount);
            }
            _lock.lastUnlockBlock = block.number;
        }

        require(pendingAmount > 0, "lieanr release: no locked");
        SafeToken.safeTransfer(token, msg.sender, pendingAmount);

        emit Claim(msg.sender, pendingAmount);
    }
}
