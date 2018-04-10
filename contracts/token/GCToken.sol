pragma solidity ^0.4.21;

import "./PrivateSale.sol";

/**
 * @title GlobeCas Token
 * @author Ken Au yeung
 * @dev Transfer lock will happen as following
 * 1) Amount purchase through private sale and is over N GCT in total, than the account will lock away from transfer until (ICO end + 90days) 
 * 2) Amount purchase through crowdsale contract, than the account will lock away from transfer until (ICO end)
 */
contract GCToken is PrivateSale {

    string constant public name = "GlobeCas";
    string constant public symbol = "GCT";
    uint8 constant public decimals = 8;

    // ********************************** need to remove after testing **************************
   
    function testSetPrivateSaleReleaseTime(uint _v) public {
        privateSaleReleaseTime = _v;
    }

    function testSetPrivateInvestLockToken(uint _v)public{
        require(_v > 0);
        privateInvestLockToken = _v;
    }

    function testGiveAccountSomeBal(address _to, uint _amount)public{
        require(totalSupply_.add(_amount) <= cap);
        totalSupply_ = totalSupply_.add(_amount);
        balances[_to] = balances[_to].add(_amount);
        emit Mint (_to, _amount);
        emit Transfer(address(0), _to, _amount);
    }
    
    function testSetIcoEndTime(uint _v)public{
        icoEndTime = _v;
    }
}