
var config = require('../migrationConfig.json');
var BigNumber = require('bignumber.js');
var GCToken = artifacts.require("GCToken");
var GCTCrowdsale = artifacts.require("../contracts/crowdsale/GCTCrowdsale");

var gct,crowd;
 
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

var arrayAcct = [config.testAccount1,config.testAccount2,config.testAccount3];
contract('GCTCrowdsale Refund Test', function(accounts) {
 
    it("Return all unsold tokens",async function(){
        await crowd.addManyToWhitelist(arrayAcct, {from:config.ownerAccount});
        for(var i=0; i < arrayAcct.length;i++){            
            assert.isTrue((await crowd.whitelist.call(arrayAcct[i])), arrayAcct[i] + " should have add to whitelist");
        }

        var totalPurchase = new BigNumber(0); 
        let weiBuyAmount =  "5000E+18";
        let buyFromAccount = arrayAcct[0];
        let beforeAcctBalBig = await web3.eth.getBalance(buyFromAccount);
        totalPurchase = totalPurchase.plus(weiBuyAmount);

        console.log("Purchase by("+buyFromAccount+") : ",weiBuyAmount);
        assert.isTrue((await crowd.whitelist.call(buyFromAccount)), buyFromAccount+" should be in the white list");
        assert.isTrue(beforeAcctBalBig.gte(new BigNumber(weiBuyAmount)),"Must have at least min purchase amt"); 

        let beforeWeiRaisedBig = await crowd.weiRaised();
        let r = await crowd.sendTransaction({from:buyFromAccount, value:weiBuyAmount});
        let gasAmtInWei = r.receipt.gasUsed;
        
        // need add the gas price to calculate the actual used wei for token purchase
        let afterAcctBalBig = await web3.eth.getBalance(buyFromAccount).add(new BigNumber(gasAmtInWei));
        let afterWeiRaisedBig = await crowd.weiRaised();
        assert.isTrue(afterWeiRaisedBig.minus(beforeWeiRaisedBig).eq(beforeAcctBalBig.minus(afterAcctBalBig)), "Raised amount must equal to balance difference");
        
        await crowd.closeCrowdsale().then(function (r){
            assert.isTrue(true);
        }).catch(function(e){
            assert.isTrue(false, "should able to call crowdsale close");
        });
        
        let companyBal = await gct.balanceOf(config.companyAccount);
        let purchasebal = await gct.balanceOf(buyFromAccount);
        let totalToken = await crowd.CROWDSALE_SUPPLY();
        
        assert.equal(companyBal.plus(purchasebal).toString(),totalToken.toString(), "Token balane should equal");
    });
});