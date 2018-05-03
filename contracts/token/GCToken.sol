pragma solidity ^0.4.21;

import "../../node_modules/zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "../../node_modules/zeppelin-solidity/contracts/ownership/HasNoEther.sol";


contract GCToken is StandardToken, HasNoEther {

    string constant public name = "GlobeCas";
    string constant public symbol = "GCT";
    uint8 constant public decimals = 8;
    
    event Mint(address indexed to, uint256 amount);
    event Claim(address indexed from, uint256 amount);
    
    address constant public CROWDSALE_ACCOUNT    = 0x52e35C4FfFD6fcf550915C5eCafeE395860DDcD5;
    address constant public COMPANY_ACCOUNT      = 0x7862a8f56C450866B4859EF391A85c535Df18c87;
    address constant public PRIVATE_SALE_ACCOUNT = 0x66FA34A9c50873b344a24B662720B632ad8E1517;
    address constant public TEAM_ACCOUNT         = 0x492C8b81D22Ad46b19419Df3D88Fd77b6850A9E4;
    address constant public PROMOTION_ACCOUNT    = 0x067724fb3439B5c52267d1ddDb3047C037290756;

    // -------------------------------------------------- TOKENS  -----------------------------------------------------------------------------------------------------------------
    uint constant public CAPPED_SUPPLY       = 20000000000e8; // maximum of GCT token
    uint constant public TEAM_RESERVE        = 2000000000e8;  // total tokens team can claim
    uint constant public COMPANY_RESERVE     = 8000000000e8;  // total tokens company reserve for - lock for 6 months
    uint constant public PRIVATE_SALE        = 900000000e8;   // total tokens used for private sale - lock for 3 months when over invest Token
    uint constant public PROMOTION_PROGRAM   = 1000000000e8;  // total tokens used for promotion program -  405,000,000 for referral and  595,000,000 for bounty
    uint constant public CROWDSALE_SUPPLY    = 8100000000e8;  // total tokens for crowdsale
    // ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------
   
   // is company already claimed reserve pool
    bool public companyClaimed;

    // company reseved release minutes
    uint constant public COMPANY_RESERVE_FOR = 182 days; // this equivalent to 6 months
    
    // team can start claiming tokens N days after ICO
    uint constant public TEAM_CAN_CLAIM_AFTER = 120 days;// this equivalent to 4 months

    // period between each claim from team
    uint constant public CLAIM_STAGE = 30 days;

    // the amount of token each stage team can claim
    uint[] public teamReserve = [8658000e8, 17316000e8, 25974000e8, 34632000e8, 43290000e8, 51948000e8, 60606000e8, 69264000e8, 77922000e8, 86580000e8, 95238000e8, 103896000e8, 112554000e8, 121212000e8, 129870000e8, 138528000e8, 147186000e8, 155844000e8, 164502000e8, 173160000e8, 181820000e8];
        
    // Store the ico finish time 
    uint public icoEndTime = 1537487999; // 20-Sep-2018

    modifier canMint() {
        require(totalSupply_ < CAPPED_SUPPLY);
        _;
    }

    function GCToken() public {
        mint(PRIVATE_SALE_ACCOUNT, PRIVATE_SALE);
        mint(PROMOTION_ACCOUNT, PROMOTION_PROGRAM);
        mint(CROWDSALE_ACCOUNT, CROWDSALE_SUPPLY);
    }

    function claimCompanyReserve () external {
        require(!companyClaimed);
        require(msg.sender == COMPANY_ACCOUNT);        
        require(now >= icoEndTime.add(COMPANY_RESERVE_FOR));
        mint(COMPANY_ACCOUNT, COMPANY_RESERVE);
        companyClaimed = true;
    }

    function claimTeamToken() external {
        require(msg.sender == TEAM_ACCOUNT);
        require(now >= icoEndTime.add(TEAM_CAN_CLAIM_AFTER));
        require(teamReserve[20] > 0);

        // store time check for each claim stage
        uint claimableTime = icoEndTime.add(TEAM_CAN_CLAIM_AFTER);
        uint totalClaimable;

        for(uint i = 0; i < 21; i++){
            if(teamReserve[i] > 0){
                // each month can claim the next stage starts from TEAM_CAN_CLAIM_AFTER
                if(claimableTime.add(i.mul(CLAIM_STAGE)) < now){
                    totalClaimable = totalClaimable.add(teamReserve[i]);
                    teamReserve[i] = 0;
                }else{
                    break;
                }
            }
        }
        if(totalClaimable > 0){
            mint(TEAM_ACCOUNT, totalClaimable);
        }
    }
    
    
    /**
    * @dev Function to mint tokens referenced from https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/contracts/token/ERC20/CappedToken.sol
    * @param _to The address that will receive the minted tokens.
    * @param _amount The amount of tokens to mint.
    * @return A boolean that indicates if the operation was successful.
    */
    function mint(address _to, uint256 _amount) canMint internal returns (bool) {
        require(totalSupply_.add(_amount) <= CAPPED_SUPPLY);
        totalSupply_ = totalSupply_.add(_amount);
        balances[_to] = balances[_to].add(_amount);
        emit Mint (_to, _amount);
        return true;
    }

    /**
     * @dev Update the end of ICO time.
     * @param _icoEndTime Expected ICO end time
     */
    function setIcoEndTime(uint _icoEndTime) public onlyOwner {
        require(_icoEndTime >= now);
        icoEndTime = _icoEndTime;
    }
}