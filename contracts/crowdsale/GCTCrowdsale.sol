pragma solidity ^0.4.21;

import "../../node_modules/zeppelin-solidity/contracts/math/SafeMath.sol";
import "../../node_modules/zeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "../token/GCToken.sol";
import "./Whitelist.sol";
import "./AccountAddress.sol";

/**
 * @title GlobeCas Crowdsale
 * @dev GCTCrowdsale contract that reference 
 * https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/contracts/crowdsale/Crowdsale.sol
 * https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/contracts/crowdsale/validation/WhitelistedCrowdsale.sol
 *
 * Total GCT Token  20,000,000,000 * 10 ** 8(decimal place)
 * 
 *
 * Usage
 * Company Reserve   : 8,000,000,000 * 10 ** 8(decimal place)
 * Team Reserve      : 2,000,000,000 * 10 ** 8(decimal place)
 * Promotion Program : 1,000,000,000 * 10 ** 8(decimal place)
 * Private Sale      :   900,000,000 * 10 ** 8(decimal place)
 * Crowdsale         : 8,100,000,000 * 10 ** 8(decimal place)
 * 
 * Crowdsale Breakup (8,100,000,000)
 * Total purchasable tokens : 6,659,027,273 * 10 ** 8(decimal place)
 * Total tokens for bonus   : 1,440,972,727 * 10 ** 8(decimal place)
 *
 * Team Reserve breakup (2,000,000,000) - Token release N months after ICO Ended
 * +04 :   8,658,000 * 10 ** 8(decimal place)
 * +05 :  17,316,000 * 10 ** 8(decimal place)
 * +06 :  25,974,000 * 10 ** 8(decimal place)
 * +07 :  34,632,000 * 10 ** 8(decimal place)
 * +08 :  43,290,000 * 10 ** 8(decimal place)
 * +09 :  51,948,000 * 10 ** 8(decimal place)
 * +10 :  60,606,000 * 10 ** 8(decimal place)
 * +11 :  69,264,000 * 10 ** 8(decimal place)
 * +12 :  77,922,000 * 10 ** 8(decimal place)
 * +13 :  86,580,000 * 10 ** 8(decimal place)
 * +14 :  95,238,000 * 10 ** 8(decimal place)
 * +15 : 103,896,000 * 10 ** 8(decimal place)
 * +16 : 112,554,000 * 10 ** 8(decimal place)
 * +17 : 121,212,000 * 10 ** 8(decimal place)
 * +18 : 129,870,000 * 10 ** 8(decimal place)
 * +19 : 138,528,000 * 10 ** 8(decimal place)
 * +20 : 147,186,000 * 10 ** 8(decimal place)
 * +21 : 155,844,000 * 10 ** 8(decimal place)
 * +22 : 164,502,000 * 10 ** 8(decimal place)
 * +23 : 173,160,000 * 10 ** 8(decimal place)
 * +24 : 181,820,000 * 10 ** 8(decimal place)
 */
contract GCTCrowdsale is AccountAddress, Pausable, Whitelist {
    using SafeMath for uint256;


    /**
    * Event for token purchase logging
    * @param purchaser who paid for the tokens
    * @param beneficiary who got the tokens
    * @param value weis paid for purchase
    * @param amount amount of tokens purchased
    */
    event TokenPurchase(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);
    event Refund(address indexed holder, uint256 etherAmount);

    uint8 constant public decimals = 8;
    
    // -------------------------------------------------- TOKENS  -------------------------------------------------------------  
    uint constant public CAPPED_SUPPLY       = 20000000000e8; // maximum of GCT token
    uint constant public TEAM_RESERVE        = 2000000000e8;  // total tokens team can claim
    uint constant public COMPANY_RESERVE     = 8000000000e8;  // total tokens company reserve for - lock for 6 months
    uint constant public PRIVATE_SALE        = 900000000e8;   // total tokens used for private sale - lock for 3 months when over invest Token
    uint constant public PROMOTION_PROGRAM   = 1000000000e8;  // total tokens used for promotion program
    uint constant public CROWDSALE_SUPPLY    = 8100000000e8;  // total tokens for crowdsale
    // ------------------------------------------------------------------------------------------------------------------------
    
    uint constant public SOFTCAP             = 5000 ether;   
    uint constant public WEI_PER_TOKEN       = 0.00001 ether;  // 1 ETH = 10,0000 GCT
    uint constant public MIN_WEI_TO_PURCHASE = 0.001 ether; 
    
    // private sale account lockout from end of ICO
    uint constant public PRIVATE_TRANSFER_LOCKOUT = 90 days;

    // when exceed this amount of token if account conducted in private sale, additional transfer restriction applies
    uint constant public PRIVATE_INVEST_LOCK_TOKEN =  20000000e8;

    // company reseved release minutes
    uint constant public COMPANY_RESERVE_FOR = 182 days; // this equivalent to 6 months

    //Total wei sum an address has invested
    mapping(address => uint) public investedSum;

    //Total GCT an address is allocated
    mapping(address => uint) public tokensAllocated;

    // The token being sold
    GCToken public token;
    
    // Amount of wei raised
    uint public weiRaised;

    // is token and crowdsale contract initialized
    bool public hasInit;

    // is company already claimed reserve pool
    bool public companyClaimed;

    // is crowdsale close
    bool public crowdsaleClosed;

    // ico close time
    uint public icoEndTime;

    // number of tokens minted for crowdsale
    uint public crowdsaleMinted;

    // wei already refund
    uint public refundedWei;
    
    // team can start claiming tokens N days after ICO
    uint constant public TEAM_CAN_CLAIM_AFTER = 120 days;// this equivalent to 4 months

    // period between each claim from team
    uint constant public CLAIM_STAGE = 30 days;

    // the amount of token each stage team can claim
    uint[] public teamReserve = [8658000e8, 17316000e8, 25974000e8, 34632000e8, 43290000e8, 51948000e8, 60606000e8, 69264000e8, 77922000e8, 86580000e8, 95238000e8, 103896000e8, 112554000e8, 121212000e8, 129870000e8, 138528000e8, 147186000e8, 155844000e8, 164502000e8, 173160000e8, 181820000e8];
    
    // current crowdsale stage
    uint8 public currentStage = 0;

    // token can be purchase each for each crowdsale stage
    uint[] public stageTokenSupply = [900000000e8, 934600000e8, 1296000000e8, 1687500000e8, 1840927273e8];
    //uint[] public stageBonusSupply = [31500000000000000, 28038000000000000,  32400000000000000,  33750000000000000,  18409272700000000];
    
    // amount of token minted for each stage
    uint[5] public stageBonusAllocated;

    // bonus % for each stage (35 means 35%)
    uint[] public bonusRate = [35, 30, 25, 20, 10];    
    

    /**
    * @param _token Address of the token being sold
    */
    function GCTCrowdsale(address _token) public {
        require(_token != address(0));
        token = GCToken(_token);        
        paused = true;
    }

  
    function init(uint _icoEndTime) public onlyOwner {
        require (!hasInit && !token.hasInit());
        
        icoEndTime = _icoEndTime;
        token.init(CAPPED_SUPPLY, icoEndTime, PRIVATE_SALE_ACCOUNT, PRIVATE_INVEST_LOCK_TOKEN, icoEndTime.add(PRIVATE_TRANSFER_LOCKOUT));

        token.mint(PRIVATE_SALE_ACCOUNT, PRIVATE_SALE);
        token.mint(PROMOTION_ACCOUNT, PROMOTION_PROGRAM);
        hasInit = true;
        paused = false;
    }

    function claimCompanyReserve () external {
        require(msg.sender == COMPANY_ACCOUNT);
        require(!companyClaimed);
        require(now >= icoEndTime.add(COMPANY_RESERVE_FOR));
        
        token.mint(COMPANY_ACCOUNT, COMPANY_RESERVE);
        companyClaimed = true;
    }

    function claimTeamToken() external {
        require(msg.sender == TEAM_ACCOUNT);
        require(now >= icoEndTime.add(TEAM_CAN_CLAIM_AFTER));
        require(teamReserve[20] > 0);

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
            token.mint(TEAM_ACCOUNT, totalClaimable);
        }
    }

    function getBalance() external onlyOwner view returns (uint){
        return address(this).balance;
    }

    
    function closeCrowdsale() external onlyOwner{
        require(!crowdsaleClosed);
        crowdsaleClosed = true;
        icoEndTime = now;
        
        if(CROWDSALE_SUPPLY > crowdsaleMinted) {
            token.mint(COMPANY_ACCOUNT, CROWDSALE_SUPPLY.sub(crowdsaleMinted));
        }
        token.setIcoEndTime(icoEndTime);
        _forwardFunds();        
    }

    function refund() external {
        require(crowdsaleClosed && weiRaised < SOFTCAP);
        require(investedSum[msg.sender] > 0);

        uint invested = investedSum[msg.sender];
        investedSum[msg.sender] = 0;
        refundedWei = refundedWei.add(invested);

        msg.sender.transfer(invested);        
        emit Refund(msg.sender, invested);
    }

    /**
    * @dev fallback function ***DO NOT OVERRIDE***
    */
    function () external payable {
        buyTokens(msg.sender);
    }

    /**
    * @param _beneficiary Address performing the token purchase
    */
    function buyTokens(address _beneficiary) public isWhitelisted(_beneficiary) whenNotPaused payable {
        require(!crowdsaleClosed);
        require(_beneficiary != address(0));
        require(msg.value >= MIN_WEI_TO_PURCHASE);
        require(crowdsaleMinted < CROWDSALE_SUPPLY);

        uint weiAmount = msg.value;
        uint tokenSold;
        uint refundWei;

        // calculate token amount to be created
        (tokenSold, refundWei) = _getTokenAmount(weiAmount);

        weiAmount = weiAmount.sub(refundWei);
        _processPurchase(_beneficiary, tokenSold, weiAmount);
        
        // update state
        weiRaised = weiRaised.add(weiAmount);
        
        // refund the wei that was not enough to purchase 1 GCT
        if (refundWei > 0){
            _beneficiary.transfer(refundWei);
            emit Refund(msg.sender, refundWei);
        }
        _forwardFunds();        
        emit TokenPurchase(msg.sender, _beneficiary, weiAmount, tokenSold);
    }


    /**
    * @dev Ether is converted to tokens.
    * @param _weiAmount Value in wei to be converted into tokens
    * @return Number of tokens that can be purchased with the specified _weiAmount
    * @return Amount of wei refund to beneficiary 
    */
    function _getTokenAmount(uint256 _weiAmount) internal returns (uint256,uint256) {
        uint buyTokenAmount = _weiAmount.div(WEI_PER_TOKEN).mul(10 ** uint(decimals));
        uint actualSoldTokens;
        uint actualBonusToken;
        
        for (; currentStage < 5;){
            // calcuate the amount of token each stage can supply
            uint stageToken = stageTokenSupply[currentStage] >= buyTokenAmount ? buyTokenAmount : stageTokenSupply[currentStage];
            uint stageBonus = stageToken.mul(bonusRate[currentStage]).div(100);
            buyTokenAmount = buyTokenAmount.sub(stageToken);

            // just ensure at final stage there are enough tokens for bonus because there should be 3 token does not account for bonus
            if(currentStage == 4 && crowdsaleMinted.add(stageToken.add(stageBonus)) > CROWDSALE_SUPPLY){
                stageBonus = CROWDSALE_SUPPLY.sub(crowdsaleMinted.add(stageToken));
            } 
            
            // update stage status
            stageBonusAllocated[currentStage] = stageBonusAllocated[currentStage].add(stageBonus);
            stageTokenSupply[currentStage] = stageTokenSupply[currentStage].sub(stageToken);
            if (stageTokenSupply[currentStage] == 0){
                currentStage++;
            }

            crowdsaleMinted = crowdsaleMinted.add(stageToken).add(stageBonus);
            assert(crowdsaleMinted <= CROWDSALE_SUPPLY);

            // update total purchased token
            actualSoldTokens = actualSoldTokens.add(stageToken);
            actualBonusToken = actualBonusToken.add(stageBonus);             
            if(buyTokenAmount == 0){
                break;
            }
        }

        return (actualSoldTokens.add(actualBonusToken), _weiAmount.sub(actualSoldTokens.div(10 ** uint(decimals)).mul(WEI_PER_TOKEN)));
    }
    
    /**
    * @dev Executed when a purchase has been validated and is ready to be executed. Not necessarily emits/sends tokens.
    * @param _beneficiary Address receiving the tokens
    * @param _tokenAmount Number of tokens to be purchased
    */
    function _processPurchase(address _beneficiary, uint _tokenAmount, uint _weiAmount) internal {
        token.mint(_beneficiary, _tokenAmount);
        tokensAllocated[_beneficiary] = tokensAllocated[_beneficiary].add(_tokenAmount);
        investedSum[_beneficiary] = investedSum[_beneficiary].add(_weiAmount);    
    }
    
    /**
    * @dev Determines how ETH is stored/forwarded on purchases.
    */
    function _forwardFunds() internal {
        if (weiRaised >= SOFTCAP){
            WALLET.transfer(address(this).balance);
        }
    }
}