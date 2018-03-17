pragma solidity ^0.4.21;

import "../../node_modules/zeppelin-solidity/contracts/ownership/HasNoEther.sol";
import "./TokenLocker.sol";

contract GCToken is TokenLocker, HasNoEther {

    string public name = "GlobeCas";
	string public symbol = "GCT";
    uint8 public  decimals = 8;

    function GCToken() public {
        totalSupply_ = 20000000000 * 10 ** uint(decimals);
        balances[owner] = totalSupply_;
        emit Transfer(address(0), owner, totalSupply_);
    }

    function tokenLockup(uint _lockupAmount, uint _lockupMinute) public onlyOwner {
        super.tokenLockup(_lockupAmount * 10 ** uint(decimals), _lockupMinute);
    }
}