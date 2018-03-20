pragma solidity ^0.4.19;

import "../../node_modules/zeppelin-solidity/contracts/math/SafeMath.sol";
import "../../node_modules/zeppelin-solidity/contracts/crowdsale/validation/WhitelistedCrowdsale.sol";

import "../token/GCToken.sol";
/**
 * @title GlobeCas Crowdsale
 * @dev GCTCrowdsale 
 */
contract GCTCrowdsale is WhitelistedCrowdsale {
    using SafeMath for uint256;

    bool public softcap;

    function GCTCrowdsale(address _token) public Crowdsale(1,msg.sender,GCToken(_token)) {

    }

    function smallestToken(uint _val, uint _unit) public pure returns (uint,uint){
        return (_val.div(10**_unit), 10**(18-_unit));
    }

    /**
    * @dev Override to extend the way in which ether is converted to tokens.
    * @param _weiAmount Value in wei to be converted into tokens
    * @return Number of tokens that can be purchased with the specified _weiAmount
    */
    function _getTokenAmount(uint256 _weiAmount) internal view returns (uint256) {
        return _weiAmount.mul(rate);
    }

    /**
    * @dev Validation of an incoming purchase. Use require statemens to revert state when conditions are not met. Use super to concatenate validations.
    * @param _beneficiary Address performing the token purchase
    * @param _weiAmount Value in wei involved in the purchase
    */
    function _preValidatePurchase(address _beneficiary, uint256 _weiAmount) internal {
        super._preValidatePurchase(_beneficiary, _weiAmount);
    }
    
    // only allow the fund to move to wall once the softcap reach
    function _forwardFunds() internal {
        if(softcap){
            super._forwardFunds();
        }
    }

    function claimEther() public onlyOwner {
        _forwardFunds();
    }
}