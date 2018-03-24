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

}