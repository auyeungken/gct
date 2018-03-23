pragma solidity ^0.4.21;

import "./MintToken.sol";

/**
 * @title GlobeCas Token
 * @author Ken Au yeung
 * @dev Transfer lock will happen as following
 * 1) Amount purchase through private sale and is over N GCT in total, than the account will lock away from transfer until (ICO end + 90days) 
 * 2) Amount purchase through crowdsale contract, than the account will lock away from transfer until (ICO end)
 */
contract GCToken is MintToken {

    event PrivateSale(address indexed to, uint256 amount);

    string constant public name = "GlobeCas";
    string constant public symbol = "GCT";
    uint8 constant public decimals = 8;
    
    modifier allowTransfer () {
        // this will lock crowdsale/private sale account from transfer before ICO ends
        require (now > icoEndTime); 

        // this will lock private sale account with token over certain amount from transfer
        require (now > privateSaleTransferRelease || privateSaleInvest[msg.sender] < privateInvestLockToken);
        _;
    }

    modifier onlyPrivateSale () {
        // this will lock private sale account with token over certain amount from transfer
        require (msg.sender == privateSaleAccount);
        _;
    }

    modifier onlyOwnerAndPrivateSale () {
        // this will lock private sale account with token over certain amount from transfer
        require (msg.sender == owner || msg.sender == privateSaleAccount);
        _;
    }
    
    function transfer(address _to, uint256 _value) public allowTransfer returns (bool) {
        return super.transfer(_to, _value); 
    }

    function transferFrom(address _from, address _to, uint256 _value) public allowTransfer returns (bool) {
        return super.transferFrom(_from,_to,_value);
    }

    /**
    * @dev Token transfer from private sale account to target
    * @param _to transfer balance to target address
    * @param _amount amount will be transfered to target address
    * @return A boolean that indicates if the operation was successful.
    */
    function privateSaleTransfer(address _to, uint _amount) external onlyPrivateSale returns (bool){
        require(balances[privateSaleAccount] >= _amount);    
        
        balances[privateSaleAccount] = balances[privateSaleAccount].sub(_amount);
        balances[_to] = balances[_to].add(_amount);
        privateSaleInvest[_to] = privateSaleInvest[_to].add(_amount); 

        emit PrivateSale(_to, _amount);

        return true;
    }

    
    function getPrivateSaleInvested(address _account) onlyOwnerAndPrivateSale external view returns(uint){
        return privateSaleInvest[_account];
    }
}