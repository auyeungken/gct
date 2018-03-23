pragma solidity ^0.4.21;

import "../../node_modules/zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "../../node_modules/zeppelin-solidity/contracts/ownership/HasNoEther.sol";

/**
 * @title Token Sale
 * @author Ken Au yeung
 * @dev This contract provide some feature that can be used by crowdsale for minting tokens.
 * minting function reference from https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/contracts/token/ERC20/CappedToken.sol
 */
contract MintToken is StandardToken, HasNoEther {
    
    event Mint(address indexed to, uint256 amount);
    
    // Store the ico finish time 
    uint public icoEndTime;

    // address of the private sale account
    address public privateSaleAccount;

    mapping(address => uint) internal privateSaleInvest;

    // the amount of token that trigger's transfer lockout when traded in private sale
    uint public privateInvestLockToken;
    
     // The lockout time for account transfer that has traded in private sale with total amount of tokesn over PRIVATE_INVEST_LOCK
    uint public privateSaleTransferRelease;
    
    address public crowdsaleAccount;

    uint256 public cap;

    bool public hasInit; 

    /**
    * @dev Throws if called by any account other than the owner or crowdsale account.
    */
    modifier onlyCrowdsale() {
        require(msg.sender == crowdsaleAccount);
        _;
    }

    modifier canMint() {
        require(totalSupply_ < cap);
        _;
    }
    
    function setCrowdsaleAccount(address _crowdsaleAccount) onlyOwner external {
        require(_crowdsaleAccount != address(0));
        crowdsaleAccount = _crowdsaleAccount;
    }

    /**
    * @param _cap Maximum supply of GCT tokens
    * @param _icoEndTime End time of ICO
    * @param _privateInvestLockToken Additional transfer restriction for private sale account holding over this amount of tokens
    * @param _privateSaleTransferRelease Allow account conducted in private sale over _privateInvestLockToken to make transfer after this timestamp
    */
    function init(uint _cap, uint _icoEndTime, address _privateSaleAccount, uint _privateInvestLockToken, uint _privateSaleTransferRelease) external onlyCrowdsale {
        require(!hasInit);
        require(now < _icoEndTime);
        require(_cap > 0);
        require(_privateSaleAccount != address(0));

        hasInit = true;
        icoEndTime = _icoEndTime;
        cap = _cap;
        privateSaleAccount = _privateSaleAccount;
        privateInvestLockToken = _privateInvestLockToken;
        privateSaleTransferRelease = _privateSaleTransferRelease; 
    }


    /**
    * @dev Function to mint tokens referenced from https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/contracts/token/ERC20/CappedToken.sol
    * @param _to The address that will receive the minted tokens.
    * @param _amount The amount of tokens to mint.
    * @return A boolean that indicates if the operation was successful.
    */
    function mint(address _to, uint256 _amount) onlyCrowdsale canMint public returns (bool) {
        require(totalSupply_.add(_amount) <= cap);
        totalSupply_ = totalSupply_.add(_amount);
        balances[_to] = balances[_to].add(_amount);
        emit Mint (_to, _amount);
        emit Transfer(address(0), _to, _amount);
        return true;
    }

    function setIcoEndTime(uint _icoEndTime) external onlyOwner {
        require(_icoEndTime >= now);
        icoEndTime = _icoEndTime;
    }
}