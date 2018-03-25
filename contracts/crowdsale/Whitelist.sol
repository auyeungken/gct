pragma solidity ^0.4.21;

import "../../node_modules/zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./AccountAddress.sol";

contract Whitelist is Ownable, AccountAddress {

    mapping(address => bool) public whitelist;
     
    /**
    * @dev Throws if called by any account other than the owner.
    */
    modifier onlyOwnerAndAdmin() {
        require(msg.sender == owner || msg.sender == ADMIN_ACCOUNT);
        _;
    }

    /**
    * @dev Reverts if beneficiary is not whitelisted. Can be used when extending this contract.
    */
    modifier isWhitelisted(address _beneficiary) {
        require(whitelist[_beneficiary]);
        _;
    }

    /**
    * @dev Adds single address to whitelist.
    * @param _beneficiary Address to be added to the whitelist
    */
    function addToWhitelist(address _beneficiary) external onlyOwnerAndAdmin {
        whitelist[_beneficiary] = true;
    }

    /**
    * @dev Adds list of addresses to whitelist. Not overloaded due to limitations with truffle testing. 
    * @param _beneficiaries Addresses to be added to the whitelist
    */
    function addManyToWhitelist(address[] _beneficiaries) external onlyOwnerAndAdmin {
        for (uint256 i = 0; i < _beneficiaries.length; i++) {
            whitelist[_beneficiaries[i]] = true;
        }
    }

    /**
    * @dev Removes single address from whitelist. 
    * @param _beneficiary Address to be removed to the whitelist
    */
    function removeFromWhitelist(address _beneficiary) external onlyOwnerAndAdmin {
        whitelist[_beneficiary] = false;
    }    
}