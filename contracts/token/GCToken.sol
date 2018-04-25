pragma solidity ^0.4.21;

import "../../node_modules/zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "../../node_modules/zeppelin-solidity/contracts/ownership/HasNoEther.sol";


contract GCToken is StandardToken, HasNoEther {

    string constant public name = "GlobeCas";
    string constant public symbol = "GCT";
    uint8 constant public decimals = 8;
    
    event Mint(address indexed to, uint256 amount);
    event Claim(address indexed from, uint256 amount);
    event IcoTransfer(address indexed from, address indexed to, uint256 amount);
    
    // Address where funds are collected
    address constant public WALLET = 0x452ABab9d7C079529f24b5dD0A93c1c858a03d56;
    address constant public CROWDSALE_ACCOUNT = 0x80e2afe33144ee746ac4dcEdCF5D788A4692feBB;
    address constant public COMPANY_ACCOUNT = 0x29FB4d844B996ce31E3B12D4348AD168abe4AE1c;
    address constant public PRIVATE_SALE_ACCOUNT = 0x227F269Db91111D7c7f5e42bc8960C3A0391E217;
    address constant public TEAM_ACCOUNT = 0x3c3ec1ed78afB52aC1C4BE901D064E2C8AeA3C6f;
    address constant public PROMOTION_ACCOUNT = 0xc19340a9F7E883355f150D3d4955c8AEBc5C64f5;

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
    uint public icoEndTime;

    modifier allowTransfer () {
        // this will lock crowdsale/private sale account from transfer before ICO ends
        require (now >= icoEndTime); 
        _;
    }

    modifier canMint() {
        require(totalSupply_ < CAPPED_SUPPLY);
        _;
    }

    function GCToken(uint _icoEndTime) public {
        setIcoEndTime(_icoEndTime);
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

    /**
     * @dev Transfer token from crowdsale account to target account
     * @param _to The address that will receive the gct tokens.
     * @param _amount The amount of tokens to transfer.
     * @return A boolean that indicates if the operation was successful.
     */
    function crowdsaleTransfer(address _to, uint _amount) external returns (bool){
        require(msg.sender == CROWDSALE_ACCOUNT);
        return icoTransfer(CROWDSALE_ACCOUNT, _to, _amount);
    }

    /**
     * @dev Transfer token from private sale account to target account
     * @param _to The address that will receive the gct tokens.
     * @param _amount The amount of tokens to transfer.
     * @return A boolean that indicates if the operation was successful.
     */
    function privateSaleTransfer(address _to, uint _amount) external returns (bool){
        require (msg.sender == PRIVATE_SALE_ACCOUNT);
        return icoTransfer(PRIVATE_SALE_ACCOUNT, _to, _amount);
    }

    /**
     * @dev The actual transfer function that will used for transfer token from either crowdsale or private sale account
     * @param _from The address that will send the gct tokens.
     * @param _to The address that will receive the gct tokens.
     * @param _amount The amount of tokens to transfer.
     * @return A boolean that indicates if the operation was successful.
     */
    function icoTransfer(address _from, address _to, uint _amount) internal returns (bool){        
        require(balances[_from] >= _amount);    
        
        balances[_from] = balances[_from].sub(_amount);
        balances[_to] = balances[_to].add(_amount);

        emit IcoTransfer(_from, _to, _amount);
        return true;
    }

    function transfer(address _to, uint256 _value) public allowTransfer returns (bool) {
        return super.transfer(_to, _value); 
    }

    function transferFrom(address _from, address _to, uint256 _value) public allowTransfer returns (bool) {
        return super.transferFrom(_from,_to,_value);
    }
}