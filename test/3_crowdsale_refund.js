
var config = require('../migrationConfig.json');
var BigNumber = require('bignumber.js');
var GCToken = artifacts.require("GCToken");
var GCTCrowdsale = artifacts.require("../contracts/crowdsale/GCTCrowdsale");

var gct,crowd;

var minPurchaseAmt = 25000000000000000;
var softcap = 2000000000000000000000000; // in USD with 18 decimal


function randomBetween(min,max){
    return BigNumber.random().times(max).plus(min).integerValue().toString();
}

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

var purchaseAmt = "1E+21";
var arrayAcct = [config.testAccount1,config.testAccount2,config.testAccount3];

contract('GCTCrowdsale Refund Test', function(accounts) {
 
    it("Purchase Token",async function(){
        await crowd.addManyToWhitelist(arrayAcct, {from:config.ownerAccount});
        for(var i=0; i < arrayAcct.length;i++){            
            assert.isTrue((await crowd.whitelist(arrayAcct[i])), arrayAcct[i] + " should have add to whitelist");
        }

        var totalPurchase = new BigNumber(0);
        for(var i=0;i < 3; i++){
            let weiBuyAmount = purchaseAmt;            
            let buyFromAccount = arrayAcct[i];
            let beforeAcctBalBig = await web3.eth.getBalance(buyFromAccount);
            totalPurchase = totalPurchase.plus(weiBuyAmount);

            console.log(i +") Purchase by("+buyFromAccount+") : ",weiBuyAmount);
            assert.isTrue((await crowd.whitelist(buyFromAccount)), buyFromAccount+" should be in the white list");
            assert.isTrue(beforeAcctBalBig.gte(new BigNumber(minPurchaseAmt)),"Must have at least min purchase amt"); 

            let beforeWeiRaisedBig = await crowd.weiRaised();
            let r = await crowd.sendTransaction({from:buyFromAccount, value:weiBuyAmount});
            let gasAmtInWei = r.receipt.gasUsed;
            
            // need add the gas price to calculate the actual used wei for token purchase
            let afterAcctBalBig = await web3.eth.getBalance(buyFromAccount).add(new BigNumber(gasAmtInWei));
            let afterWeiRaisedBig = await crowd.weiRaised();
            assert.isTrue(afterWeiRaisedBig.minus(beforeWeiRaisedBig).eq(beforeAcctBalBig.minus(afterAcctBalBig)), "Raised amount must equal to balance difference");
            
        }

        let contractBal = await crowd.getBalance.call({from:config.ownerAccount});
        assert.equal(totalPurchase.toString(),contractBal.toString(), "Contract balance must equal to raise amount");
    });

    it("Close crowdsale",async function(){ 
        await crowd.closeCrowdsale().then(function (r){
            assert.isTrue(true);
        }).catch(function(e){
            assert.isTrue(false, "should able to call crowdsale close");
        });
    });

    it("Cannot buy token after crowdsale ended",async function(){ 
        let weiBuyAmount = purchaseAmt;            
        let buyFromAccount = config.testAccount3;
        let beforeAcctBalBig = await web3.eth.getBalance(buyFromAccount); 

        await crowd.sendTransaction({from:buyFromAccount, value:weiBuyAmount}).then(function (r){
            assert.isTrue(false, "Should not able to buy token after crowdsale close");
        }).catch(function(e){
            assert.isTrue(isVMErr(e.message), e.message);
        });            
    });

    it("Allow to refund purchased amount",async function(){
        assert.isTrue(await crowd.crowdsaleClosed.call(), "Crowdsale should have been closed");
        
        for(var i=0;i < arrayAcct.length; i++){
            let buyFromAccount = arrayAcct[i];
            assert.isAbove(await crowd.investedSum.call(buyFromAccount), 0, buyFromAccount+ " should have invested");

            let beforeAcctBalBig = await web3.eth.getBalance(buyFromAccount);
            let gasAmtInWei;
            await crowd.refund({from:buyFromAccount}).then(function(r){
                gasAmtInWei = r.receipt.gasUsed;
                assert.isTrue(true);
            }).catch(function(e){
                assert.isTrue(false,"Should able to refund");
            }); 
            
            let afterAcctBalBig = await web3.eth.getBalance(buyFromAccount);
            let calBefore = beforeAcctBalBig.plus(purchaseAmt);
            assert.equal(calBefore.toString(), afterAcctBalBig.plus(gasAmtInWei).toString(), 
            i+") Balance should match after refund(Gas:"+gasAmtInWei+"):" + calBefore.minus(afterAcctBalBig).toString());
            
            await crowd.refund({from:buyFromAccount}).then(function(r){
                assert(false, "Should not able to refund again");
            }).catch(function(e){
                assert.isTrue(isVMErr(e.message), e.message);
            });
        }
    });

    it("Show State",async function(){
        let contractBal = await crowd.getBalance({from:config.ownerAccount});
        let refundedAmt = await crowd.refundedWei();
        let weiRaised = await crowd.weiRaised();

        for(var i=0;i < arrayAcct.length; i++){
            console.log("Invested:", arrayAcct[i], await crowd.investedSum.call(arrayAcct[i]));
        }
        console.log("Contract Bal:",contractBal.toString(), ", Refunded:",refundedAmt.toString(), ", Wei Raised:",weiRaised.toString());
    });
});