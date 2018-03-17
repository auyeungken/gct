pragma solidity ^0.4.21;

import "../../node_modules/zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "../../node_modules/zeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title Lockup tokens from owner
 * @author Ken Au yeung
 * @dev This allow tokens to be lock away from owner balance. Those token can be release after the specific
 * time given during locking.
 */
contract TokenLocker is StandardToken, Ownable {
    
    event LockupToken(uint amount, uint lockUntil);
    event ReleaseToken(uint amount);

    
    // the lockup time must at least N minutes from now
    uint public constant LOCKUP_AT_LEAST_MIN = 1;

    uint public tokenLockupUntil;
    uint public totalLockupToken;

    function tokenLockup(uint _lockupAmount, uint _lockupMinute) public onlyOwner {
        require(_lockupAmount > 0 && (balances[owner] >= _lockupAmount));
        require(_lockupMinute >= LOCKUP_AT_LEAST_MIN);

        balances[owner] -= _lockupAmount;
        totalLockupToken += _lockupAmount;
        tokenLockupUntil = now + (_lockupMinute * 1 minutes);
        
        emit LockupToken(totalLockupToken,lockupUntil);
        emit Transfer(owner,address(0),_lockupAmount);
    }

    function tokenRelease() public onlyOwner {
        require(totalLockupToken > 0 && now >= lockupUntil);
        
        balances[owner] += totalLockupToken;
        totalLockupToken = 0;
        
        emit ReleaseToken(totalLockupToken);
        emit Transfer(address(0),owner,totalLockupToken);
    }
}