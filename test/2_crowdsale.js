var config = require('../migrationConfig.json');
var BigNumber = require('bignumber.js');
var GCToken = artifacts.require("GCToken");
var GCTCrowdsale = artifacts.require("../contracts/crowdsale/GCTCrowdsale");

var gct,crowd;

var minPurchaseAmt = 1000000000000000;
var softcap = 5000000000000000000000;


GCToken.deployed().then(function(o){
    gct = o;
    GCTCrowdsale.deployed().then(function(o1){
        crowd = o1;
    });
});

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function isVMErr(msg){
    return msg.includes('VM Exception');
}

contract('GCTCrowdsale Test', function(accounts) {
    it("Distrubed token should add up to cap",async function(){
        let cap = (await crowd.CAPPED_SUPPLY()).toNumber();
        let reserve = (await crowd.COMPANY_RESERVE()).toNumber();
        let ps = (await crowd.PRIVATE_SALE()).toNumber();
        let promotion = (await crowd.PROMOTION_PROGRAM()).toNumber();
        let crowdsale = (await crowd.CROWDSALE_SUPPLY()).toNumber();
        let teamReserve = (await crowd.TEAM_RESERVE()).toNumber();

        assert.equal(reserve + ps + promotion + crowdsale + teamReserve, cap);
    }); 

    it("Team Reserve should addup to its total",async function(){
        let teamReserve = (await crowd.TEAM_RESERVE()).toNumber();
        let total = 0;
        for(var i=0; i < 21; i++){
            total += (await crowd.teamReserve(i)).toNumber();
        } 
        assert.equal(total, teamReserve);
    }); 
 
    it("Purchase Token",async function(){
        let weiBuyAmount = minPurchaseAmt;
        let buyFromAccount = config.testAccount1;
        let beforeAcctBalBig = await web3.eth.getBalance(buyFromAccount);

        assert.isTrue(beforeAcctBalBig.gte(new BigNumber(minPurchaseAmt)),"Must have at least min purchase amt"); 

        let beforeWeiRaisedBig = await crowd.weiRaised();

        let r = await crowd.sendTransaction({from:buyFromAccount, value:weiBuyAmount});
        let gasAmtInWei = r.receipt.gasUsed;

        // need add the gas price to calculate the actual used wei for token purchase
        let afterAcctBalBig = await web3.eth.getBalance(buyFromAccount).add(new BigNumber(gasAmtInWei));
        let afterWeiRaisedBig = await crowd.weiRaised();

        assert.isTrue(afterWeiRaisedBig.minus(beforeWeiRaisedBig).eq(beforeAcctBalBig.minus(afterAcctBalBig)), "Raised amount must equal to balance difference");
    });
});