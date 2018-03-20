pragma solidity ^0.4.21;

import "../../node_modules/zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "../../node_modules/zeppelin-solidity/contracts/ownership/HasNoEther.sol";

/**
 * @title Token Sale
 * @author Ken Au yeung
 * @dev This contract provide some feature that can be used by crowdsale for minting tokens.
 * minting function reference from https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/contracts/token/ERC20/CappedToken.sol
 */
contract TokenSale is StandardToken, HasNoEther {
    
    event Mint(address indexed to, uint256 amount);
    
    // Store the ico finish time 
    uint public icoEnd;

    // address of the private sale account
    address public privateSaleAccount;

    mapping(address => uint) internal privateSaleInvest;

    // the amount of token that trigger's transfer lockout when traded in private sale
    uint public privateInvestLockToken;
    
     // The lockout time for account transfer that has traded in private sale with total amount of tokesn over PRIVATE_INVEST_LOCK
    uint public privateSaleTransferRelease;
    
    address public crowdsaleAccount;

    uint256 public cap;

    /**
    * @dev TokenSale Constructor
    * @param _cap Maximum supply of GCT tokens
    * @param _icoEnd End time of ICO
    * @param _privateInvestLockToken Additional transfer restriction for private sale account holding over this amount of tokens
    */
    function TokenSale (uint _cap, uint _icoEnd, uint _privateInvestLockToken, uint _privateSaleTransferRelease) {
        require (now < _icoEnd);

        icoEnd = _icoEnd;
        cap = _cap;
        privateInvestLockToken = _privateInvestLockToken;
        privateSaleTransferRelease = icoEnd + (_privateSaleTransferRelease * 1 minutes);
    }

    /**
    * @dev Throws if called by any account other than the owner or crowdsale account.
    */
    modifier onlyOwnerAndCrowdsale() {
        require(msg.sender == owner || msg.sender == crowdsaleAccount);
        _;
    }

    modifier canMint() {
        require(totalSupply_ < cap);
        _;
    }
    
    /**
    * @dev Token transfer from private sale account to target
    * @param _to transfer balance to target address
    * @param _amount amount will be transfered to target address
    */
    function privateSaleTransfer(address _to, uint _amount) internal{
        require(now < icoEnd);
        require(msg.sender == privateSaleAccount && _to != privateSaleAccount);
        require(balances[privateSaleAccount] >= _amount);    
        
        balances[privateSaleAccount] = balances[privateSaleAccount].sub(_amount);
        balances[_to] = balances[_to].add(_amount);
        privateSaleInvest[_to] = privateSaleInvest[_to].add(_amount); 

        emit Transfer(privateSaleAccount, _to, _amount);
    }

    function setCrowdsaleAccount(address _crowdsaleAccount) onlyOwner external {
        require(_crowdsaleAccount != address(0));
        crowdsaleAccount = _crowdsaleAccount;
    }

    function setPrivatesaleAccount(address _privateSaleAccount) onlyOwner external {
        require(_privateSaleAccount != address(0));
        privateSaleAccount = _privateSaleAccount;
    }

    /**
   * @dev Function to mint tokens referenced from https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/contracts/token/ERC20/CappedToken.sol
   * @param _to The address that will receive the minted tokens.
   * @param _amount The amount of tokens to mint.
   * @return A boolean that indicates if the operation was successful.
   */
    function mint(address _to, uint256 _amount) onlyOwnerAndCrowdsale canMint public returns (bool) {
        require(totalSupply_.add(_amount) <= cap);
        totalSupply_ = totalSupply_.add(_amount);
        balances[_to] = balances[_to].add(_amount);
        emit Mint(_to, _amount);
        emit Transfer(address(0), _to, _amount);
        return true;
    }
}