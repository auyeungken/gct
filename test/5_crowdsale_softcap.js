var config = require('../migrationConfig.json');
var BigNumber = require('bignumber.js');
var GCToken = artifacts.require("GCToken");
var GCTCrowdsale = artifacts.require("../contracts/crowdsale/GCTCrowdsale");

var gct,crowd;

var minPurchaseAmt = 25000000000000000;
var softcap = 2000000000000000000000000; // in USD with 18 decimal

var gctPerUsd = 162;
var minUSDPurchase = 100;
var etherWithDec = new BigNumber('1e20');
var usdPerEther = new BigNumber('40000');
var weiPerToken;  //new BigNumber('15432098765432');
var minPurchaseWei; //new BigNumber('250000000000000000');
var expectEarnUSD = new BigNumber("41105089.35802469135802").dp(2);

calculate();
function calculate(){
    
    weiPerToken = etherWithDec.div(usdPerEther.times(gctPerUsd)).dp(0);  //new BigNumber('15432098765432');
    minPurchaseWei = etherWithDec.times(minUSDPurchase).div(usdPerEther).dp(0); //new BigNumber('250000000000000000');
    console.log("Calculate("+usdPerEther.toString()+") => ", "weiPerToken:", weiPerToken.toString(), ", minPurchaseWei", minPurchaseWei.toString());
}

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

contract('GCTCrowdsale Softcap Test', function(accounts) { 

    it("Only owner or admin can add to whitelist",async function(){
        var arrayAcct = [config.testAccount1,config.testAccount2,config.testAccount3];

        await crowd.addToWhitelist(config.testAccount1, {from:config.companyAccount}).then(function (r){
            assert.isTrue(false, "Should not able to add whitelist");
        }).catch(function(e){
            assert.isTrue(isVMErr(e.message), e.message);
        });

        await crowd.addManyToWhitelist(arrayAcct, {from:config.companyAccount}).then(function (r){
            assert.isTrue(false, "Should not able to add many to whitelist");
        }).catch(function(e){
            assert.isTrue(isVMErr(e.message), e.message);
        });

        await crowd.removeFromWhitelist(config.testAccount3, {from:config.companyAccount}).then(function (r){
            assert.isTrue(false, "Should not able to remove from whitelist");
        }).catch(function(e){
            assert.isTrue(isVMErr(e.message), e.message);
        });


        await crowd.addToWhitelist(config.testAccount1, {from:config.ownerAccount}).then(function (r){
            assert.isTrue(true);
        }).catch(function(e){
            assert.isTrue(false, "Should able to add account to whitelist");
        });

        await crowd.addManyToWhitelist(arrayAcct, {from:config.ownerAccount}).then(function (r){
            assert.isTrue(true);
        }).catch(function(e){
            assert.isTrue(false, "Should able to add many account to whitelist");
        });
 
        for(var i=0; i < arrayAcct.length; i++){
            await crowd.removeFromWhitelist(arrayAcct[i], {from:config.ownerAccount}).then(async function (){
                let r = await crowd.whitelist(arrayAcct[i]);
                assert.isTrue(!r, arrayAcct[i] + " should have been removed");
            }).catch(function(){
                assert.isTrue(false, "Should able to remove account " + arrayAcct[i]  + " from whitelist");
            });
        }
    });
 
    it("Softcap Test",async function(){
        var arrayAcct = [config.testAccount1,config.testAccount2,config.testAccount3];
        await crowd.addManyToWhitelist(arrayAcct, {from:config.ownerAccount});
        for(var i=0; i < arrayAcct.length;i++){            
            assert.isTrue((await crowd.whitelist(arrayAcct[i])), arrayAcct[i] + " should have add to whitelist");
        }

        let softCapBig = await crowd.SOFTCAP();

        var numPurchase = 100;
        for(var i=0; i < numPurchase; i++){
            if(BigNumber.random() > 0.5){
                
                usdPerEther = new BigNumber(randomBetween('10000','80000'));
                await crowd.updateExchangeRate(usdPerEther.toString()).then(function(){
                    assert.isTrue(true);
                }).catch(function (e){
                    assert.isTrue(false,"should have able to set new value:" + e);
                });
                calculate();
            }

            let gasAmtInWei = 0;

            let weiBuyAmount = randomBetween(minPurchaseAmt,new BigNumber("9000000000000000000000").div(numPurchase).toString() );            
            let buyFromAccount = arrayAcct[Math.floor(Math.random() * 3)];
            let beforeAcctBalBig = await web3.eth.getBalance(buyFromAccount);
            

            console.log(i +") Purchase by("+buyFromAccount+"), ",weiBuyAmount , " WEI");

            // the subtract just to ensure enough ether to pay gas
            if(i== (numPurchase-1))weiBuyAmount = beforeAcctBalBig.sub(new BigNumber("1000000000000000000"));

            assert.isTrue((await crowd.whitelist(buyFromAccount)), buyFromAccount+" should be in the white list");
            assert.isTrue(beforeAcctBalBig.gte(new BigNumber(minPurchaseAmt)),"Must have at least min purchase amt"); 

            let beforeWeiRaisedBig = await crowd.weiRaised();
            let beforeUsdRaisedBig = await crowd.usdRaised();
            
            
            await crowd.sendTransaction({from:buyFromAccount, value:weiBuyAmount}).then(function(r){
                gasAmtInWei += r.receipt.gasUsed;
            });

            // need add the gas price to calculate the actual used wei for token purchase
            let afterAcctBalBig = await web3.eth.getBalance(buyFromAccount).add(gasAmtInWei);
            let afterWeiRaisedBig = await crowd.weiRaised();
            let afterUsdRaisedBig = await crowd.usdRaised();

            let actualUsdRasiedBig = afterUsdRaisedBig.minus(beforeUsdRaisedBig);
            let actualWeiRasiedBig = afterWeiRaisedBig.minus(beforeWeiRaisedBig);

            let tmp = new BigNumber(actualUsdRasiedBig.div(new BigNumber("1e20")).toString()).dp(2);
            console.log("Raised USD: ",tmp.toString(), ", Raised Wei:", actualWeiRasiedBig.toString() + ", ETH/USD:", usdPerEther.toString());
            assert.equal(actualUsdRasiedBig.toString(), actualWeiRasiedBig.times(usdPerEther).toString(),"Raised USD amount not match");

            //console.log("Before : " ,beforeAcctBalBig.toString(), ", After:",afterAcctBalBig.toString() );
            assert.equal(actualWeiRasiedBig.toString(),beforeAcctBalBig.minus(afterAcctBalBig).toString(), 
                        i +")Raised amount must equal to balance difference");

            let contractBal = await crowd.getBalance();
            console.log("Raised USD : ", afterUsdRaisedBig.toString(), ", Raised Wei:",afterWeiRaisedBig.toString() , ", Contract Bal:", contractBal.toString(), ", Softcap:",softCapBig.toString());
            if(afterUsdRaisedBig.gte(softCapBig)){
                assert.equal(contractBal.toNumber(),0, "Contract balance must be empty");
            }else{
                assert.equal(contractBal.toString(),afterWeiRaisedBig.toString(), "Raised wei amount must equal contract balance");
            }
        }

        let capBig = await crowd.CROWDSALE_SUPPLY();
        let crowdsaleMintedBig =  await crowd.crowdsaleMinted();
        assert.isTrue(capBig.eq(crowdsaleMintedBig), "All crowdsale portal had not sold out");

        let totalUSDRaisedBig = await crowd.usdRaised();
        let totalWeiRaisedBig = await crowd.weiRaised();

        console.log("Total =>" , "totalUSDRaisedBig:",totalUSDRaisedBig.div(new BigNumber("1e20")).toString(), 
            ", expectEarnUSD:", expectEarnUSD.toString(),
            ", Total Ether:", totalWeiRaisedBig.div(new BigNumber("1e18")).toString());
        totalUSDRaisedBig = (totalUSDRaisedBig.div(new BigNumber("1e20")));
        totalUSDRaisedBig = new BigNumber(totalUSDRaisedBig.toString()).dp(2);
        assert.equal(totalUSDRaisedBig.toString(),expectEarnUSD.toString(), "Raised amount should match");
    });
});