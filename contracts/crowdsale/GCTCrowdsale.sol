pragma solidity ^0.4.21;


import "../../node_modules/zeppelin-solidity/contracts/math/SafeMath.sol";
import "../../node_modules/zeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "../token/GCToken.sol";

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
contract GCTCrowdsale is Pausable{
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

    address constant public ADMIN_ACCOUNT = 0xEe00CEDc786Aa344182b02a5FB66D3D357F7e864;
    address constant public COMPANY_ACCOUNT = 0x61412EdDEf6373c9E14Ba66d3F764F00F6eB2a28;
    address constant public PRIVATE_SALE_ACCOUNT = 0x9Af32A8087a1cc8afB5D2B0D7Dab358Cbd677564;
    address constant public TEAM_ACCOUNT = 0x55c6885ec95D3753DBf069812C40142a13Ec2Ce7;
    address constant public PROMOTION_ACCOUNT = 0x7b5cC7895a03B99AF0c4D1D2f023209157109df7;

    uint constant public CAPPED_SUPPLY       = 2000000000000000000; // maximum of GCT token
    uint constant public COMPANY_RESERVE     = 800000000000000000;  // lock for 6 months
    uint constant public PRIVATE_SALE        = 90000000000000000;   // lock for 3 months when over invest Token
    uint constant public PROMOTION_PROGRAM   = 100000000000000000;
    uint constant public CROWDSALE_SUPPLY    = 810000000000000000;

    uint constant public SOFTCAP             = 5000 ether;   
    uint constant public WEI_PER_TOKEN       = 0.00001 ether;  // 1 ETH = 10,0000 GCT
    uint constant public MIN_WEI_TO_PURCHASE = 0.001 ether; 
    
    // private sale account lockout minutes from end of ICO
    uint constant public PRIVATE_TRANSFER_LOCK_MINUTE = 5;

    // when exceed this amount of token if account conducted in private sale, additional transfer restriction applies
    uint constant public PRIVATE_INVEST_LOCK_TOKEN =  2000000000000000;

    // company reseved release minutes
    uint constant public COMPANY_RESERVE_FOR = 182 days; // this equivalent to 6 months

    mapping(address => bool) public whitelist;

    //Total wei sum an address has invested
    mapping(address => uint) public investedSum;

    //Total GCT an address is allocated
    mapping(address => uint) public tokensAllocated;

    uint8 constant public decimals = 8;

    // The token being sold
    GCToken public token;

    // Address where funds are collected
    address public wallet;

    // Amount of wei raised
    uint public weiRaised;

    bool public hasInit;
    bool public companyClaimed;
    bool public allowRefund;

    uint public icoEndTime;
    uint public crowdsaleMinted;
    uint public refundedWei;
    
    uint constant public TEAM_CAN_CLAIM_AFTER = 120 days ;// this equivalent to 4 months
    uint[] public teamReserve = [865800000000000, 1731600000000000, 2597400000000000, 3463200000000000, 4329000000000000, 5194800000000000, 6060600000000000, 6926400000000000, 7792200000000000, 8658000000000000, 9523800000000000, 10389600000000000, 11255400000000000, 12121200000000000, 12987000000000000, 13852800000000000, 14718600000000000, 15584400000000000, 16450200000000000, 17316000000000000, 18182000000000000];
    
    uint8 public currentStage = 0;
    uint[] public stageTokenSupply = [90000000000000000, 93460000000000000, 129600000000000000, 168750000000000000, 184092727300000000];
    //uint[] public stageBonusSupply = [31500000000000000, 28038000000000000,  32400000000000000,  33750000000000000,  18409272700000000];
    uint[5] public stageBonusAllocated;
    uint[] public bonusRate = [35, 30, 25, 20, 10];    
    

    /**
    * @param _wallet Address where collected funds will be forwarded to
    * @param _token Address of the token being sold
    * @param _icoEndTime ICO finish time
    */
    function GCTCrowdsale(address _token, address _wallet, uint _icoEndTime) public {
        require(_wallet != address(0));
        require(_token != address(0));

        wallet = _wallet;
        token = GCToken(_token);
        icoEndTime = _icoEndTime;
    }

    /**
    * @dev Throws if called by any account other than the owner.
    */
    modifier onlyOwnerAndAdmin() {
        require(msg.sender == owner || msg.sender == ADMIN_ACCOUNT);
        _;
    }
  
    function init() public onlyOwner {
        require (!hasInit && !token.hasInit());
        
        token.init(CAPPED_SUPPLY, icoEndTime, PRIVATE_SALE_ACCOUNT, PRIVATE_INVEST_LOCK_TOKEN, icoEndTime + (PRIVATE_TRANSFER_LOCK_MINUTE * 1 minutes));
        token.mint(PRIVATE_SALE_ACCOUNT, PRIVATE_SALE);
        token.mint(PROMOTION_ACCOUNT, PROMOTION_PROGRAM);
        hasInit = true;
    }

    function claimEther() public onlyOwner {
        _forwardFunds();
    }

    function claimCompanyReserve () public onlyOwner {
        require(!companyClaimed);
        require(now >= icoEndTime + COMPANY_RESERVE_FOR);
        token.mint(COMPANY_ACCOUNT, COMPANY_RESERVE);
        companyClaimed = true;
    }

    function claimTeamToken() public onlyOwner {
        require(teamReserve[20] > 0);
        uint totalClaimable;        
        uint claimableTime = TEAM_CAN_CLAIM_AFTER;

        for(uint8 i = 0; i < 21; i++){
            if(teamReserve[i] > 0){
                // each month can claim the next stage starts from TEAM_CAN_CLAIM_AFTER
                claimableTime = claimableTime.add(i * 30 days);
                if(claimableTime < now){
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
    
    /**
    * @dev fallback function ***DO NOT OVERRIDE***
    */
    function () external payable {
        buyTokens(msg.sender);
    }

    /**
    * @param _beneficiary Address performing the token purchase
    */
    function buyTokens(address _beneficiary) public whenNotPaused payable {
        require (crowdsaleMinted < CROWDSALE_SUPPLY);
        require (now < icoEndTime);

        uint256 weiAmount = msg.value;
        _preValidatePurchase(_beneficiary, weiAmount);

        uint tokens;
        uint refundWei;

        // calculate token amount to be created
        (tokens, refundWei) = _getTokenAmount(weiAmount);

        weiAmount = weiAmount.sub(refundWei);
        _processPurchase(_beneficiary, tokens, weiAmount);
        
        // update state
        weiRaised = weiRaised.add(weiAmount);

        emit TokenPurchase(msg.sender, _beneficiary, weiAmount, tokens);
        _forwardFunds();

        // refund the wei that was not enough to purchase 1 GCT
        if (refundWei > 0){
            _beneficiary.transfer(refundWei);
        }
    }

    function setAllowRefund(bool _allowRefund) public onlyOwner {
        allowRefund = _allowRefund;
    }

    function refund() public {
        require(allowRefund);
        require(investedSum[msg.sender] > 0);

        uint sum = investedSum[msg.sender];
        investedSum[msg.sender] = 0;
        refundedWei = refundedWei.add(sum);

        msg.sender.transfer(sum);        
        emit Refund(msg.sender, sum);
    }

    /**
    * @dev Requiring beneficiary to be in whitelist and validation of an incoming purchase. Use require statemens to revert state when conditions are not met. Use super to concatenate validations.
    * @param _beneficiary Address performing the token purchase
    * @param _weiAmount Value in wei involved in the purchase
    */
    function _preValidatePurchase(address _beneficiary, uint256 _weiAmount) internal isWhitelisted(_beneficiary) {
        require(_beneficiary != address(0));
        require(_weiAmount >= MIN_WEI_TO_PURCHASE);
    }

    /**
    * @dev Ether is converted to tokens.
    * @param _weiAmount Value in wei to be converted into tokens
    * @return Number of tokens that can be purchased with the specified _weiAmount
    * @return Amount of wei refund to beneficiary 
    */
    function _getTokenAmount(uint256 _weiAmount) internal returns (uint256,uint256) {
        uint buyTokenAmount = _weiAmount.div(WEI_PER_TOKEN) * 10 ** decimals;
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

        return (actualSoldTokens.add(actualBonusToken), _weiAmount.sub(actualSoldTokens.div(10 ** decimals).mul(WEI_PER_TOKEN)));
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
            wallet.transfer(address(this).balance);
        }
    }
}