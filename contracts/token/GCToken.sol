pragma solidity ^0.4.21;

import "./TokenSale.sol";

/**
 * @title GlobeCas Token
 * @author Ken Au yeung
 * @dev Transfer lock will happen as following
 * 1) Amount purchase through private sale and is over N GCT in total, than the account will lock away from transfer until (ICO end + 90days) 
 * 2) Amount purchase through crowdsale contract, than the account will lock away from transfer until (ICO end)
 */

 // 1561540177,"0x9af32a8087a1cc8afb5d2b0d7dab358cbd677564"
contract GCToken is TokenSale {

    string constant public name = "GlobeCas";
	string constant public symbol = "GCT";
    uint8 constant public decimals = 8;

    // private sale account lockout minutes from end of ICO
    uint constant public PRIVATE_TRANSFER_LOCK_MINUTE = 5;

    // when exceed this amount of token if account conducted in private sale, additional transfer restriction applies
    uint constant public PRIVATE_INVEST_LOCK_TOKEN =  20000000 * 10 ** uint(decimals);

    // maximum of GCT token
    uint constant public CAPPED_SUPPLY =  20000000000 * 10 ** uint(decimals);
    

    /**
    * @dev GCToken Constructor
    * @param _icoEnd End time of ICO
    */
    function GCToken(uint _icoEnd) public 
        TokenSale(CAPPED_SUPPLY, _icoEnd, PRIVATE_INVEST_LOCK_TOKEN,PRIVATE_TRANSFER_LOCK_MINUTE) 
    {}
    
    modifier allowTransfer () {
        // this will lock crowdsale/private sale account from transfer before ICO ends
        require (now > icoEnd); 

        // this will lock private sale account with token over certain amount from transfer
        require (now > privateSaleTransferRelease || privateSaleInvest[msg.sender] < privateInvestLockToken);
        _;
    }
    
    function transfer(address _to, uint256 _value) public allowTransfer returns (bool) {
        return super.transfer(_to, _value); 
    }

    function transferFrom(address _from, address _to, uint256 _value) public allowTransfer returns (bool) {
        return super.transferFrom(_from,_to,_value);
    }
}