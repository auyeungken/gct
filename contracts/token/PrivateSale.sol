pragma solidity ^0.4.21;

import "./MintToken.sol";

contract PrivateSale is MintToken {

    event PrivateSale(address indexed to, uint256 amount);

    // address of the private sale account
    address public privateSaleAccount;

    mapping(address => uint) internal privateSaleInvest;

    // the amount of token that trigger's transfer lockout when traded in private sale
    uint public privateInvestLockToken;
    
     // The lockout time for account transfer that has traded in private sale with total amount of tokesn over PRIVATE_INVEST_LOCK
    uint public privateSaleReleaseTime;

    modifier allowTransfer () {
        // this will lock crowdsale/private sale account from transfer before ICO ends
        require (now >= icoEndTime); 

        // this will lock private sale account with token over certain amount from transfer
        require (now >= privateSaleReleaseTime || privateSaleInvest[msg.sender] < privateInvestLockToken);
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

    /**
    * @param _cap Maximum supply of GCT tokens
    * @param _icoEndTime End time of ICO
    * @param _privateSaleAccount Private sale account
    * @param _privateInvestLockToken Additional transfer restriction for private sale account holding over this amount of tokens
    * @param _privateSaleReleaseTime Allow account conducted in private sale over _privateInvestLockToken to make transfer after this timestamp
    */
    function init(uint _cap, uint _icoEndTime, address _privateSaleAccount, uint _privateInvestLockToken, uint _privateSaleReleaseTime) public onlyCrowdsale {
        super.init(_cap,_icoEndTime);
        
        require(_privateSaleAccount != address(0));
        require(_privateInvestLockToken > 0);

        privateSaleAccount = _privateSaleAccount;
        privateInvestLockToken = _privateInvestLockToken;
        privateSaleReleaseTime = _privateSaleReleaseTime; 
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