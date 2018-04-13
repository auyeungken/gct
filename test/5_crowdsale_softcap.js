var config = require('../migrationConfig.json');
var BigNumber = require('bignumber.js');
BigNumber.config({ROUNDING_MODE: 1 }); // round down

var GCToken = artifacts.require("GCToken");
var GCTCrowdsale = artifacts.require("../contracts/crowdsale/GCTCrowdsale");

var gct,crowd;

var softcap = 2000000000000000000000000; // in USD with 18 decimal

var gctPerUsd = 162;
var minUSDPurchase = 100;
var etherWithDec = new BigNumber('1e20');
var usdPerEther = new BigNumber('40000');
var weiPerToken;  //new BigNumber('15432098765432');
var minPurchaseWei; //new BigNumber('250000000000000000');
var expectEarnUSD = new BigNumber("41105089.35");
var purchaseObj;
var decimals = new BigNumber('1e8');

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
    GCTCrowdsale.deployed().then(async function(o1){
        crowd = o1;        
        purchaseObj = await preparePurchase();
    });
});

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function isVMErr(msg){
    return msg.includes('VM Exception');
}

async function preparePurchase(){
    let obj = {
        supply:[],
        bonus:[],
        stage:0,
        rate:[],
        totalStage:5,
        crowdsaleMinted:new BigNumber(0),
        CROWDSALE_SUPPLY:new BigNumber(0),
        calculate:function(pObj, _weiAmount){
            //let buyTokenAmount = _weiAmount.div(weiPerToken).dp(0).times(decimals);
            let buyTokenAmount = new BigNumber(_weiAmount.times(decimals).div(weiPerToken).toString()).dp(0);
            let actualSoldTokens = new BigNumber(0);
            let actualBonusTokens = new BigNumber(0);
            console.log("Buy Token Amt => ETH:",_weiAmount.div('1e18').toString(), ", Token:", buyTokenAmount.toString() , ", Wei Per Token:", weiPerToken.toString());
            for (; pObj.stage < 5;){
                // calcuate the amount of token each stage can supply
                let stageToken = pObj.supply[pObj.stage].gte(buyTokenAmount) ? buyTokenAmount : pObj.supply[pObj.stage];
                let stageBonus = new BigNumber(stageToken.times(pObj.rate[pObj.stage]).div(100).toString()).dp(0);
                buyTokenAmount = buyTokenAmount.minus(stageToken);

                // just ensure at final stage there are enough tokens for bonus because there should be 3 token does not account for bonus
                if(pObj.stage == 4 && pObj.crowdsaleMinted.plus(stageToken.plus(stageBonus)) > pObj.CROWDSALE_SUPPLY){
                    stageBonus = pObj.CROWDSALE_SUPPLY.minus(pObj.crowdsaleMinted.plus(stageToken));
                } 
                
                // update stage status
                pObj.bonus[pObj.stage] = pObj.bonus[pObj.stage].plus(stageBonus);
                pObj.supply[pObj.stage] = pObj.supply[pObj.stage].minus(stageToken);
                

                pObj.crowdsaleMinted = pObj.crowdsaleMinted.plus(stageToken).plus(stageBonus);

                // update total purchased token
                actualSoldTokens = actualSoldTokens.plus(stageToken);
                actualBonusTokens = actualBonusTokens.plus(stageBonus);
                 console.log("Purchase Stage("+pObj.stage+") : Token:", stageToken.toString(), ", Bonus:", stageBonus.toString());
                //console.log("Purchase Breakdown(Local=>"+weiPerToken.toString()+") : Token:", actualSoldTokens.toString(), ", Bonus:", actualBonusTokens.toString());
                
                if (pObj.supply[pObj.stage] == 0){
                    pObj.stage++;
                }

                if(buyTokenAmount == 0){
                    break;
                }
            }

            return {
                token: actualSoldTokens.plus(actualBonusTokens),
                refund: _weiAmount.minus(actualSoldTokens.times(weiPerToken).div(decimals).dp(0)),
            };
        },
    };
    obj.CROWDSALE_SUPPLY = await crowd.CROWDSALE_SUPPLY();
    for(let i=0; i < obj.totalStage;i++){
        obj.supply.push(await crowd.stageTokenSupply(i));
        obj.bonus.push(new BigNumber(0));
        obj.rate.push(await crowd.bonusRate(i));
    }
    return obj;
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
            console.log('--------------------------------------------------------------------------------------');
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

            let weiBuyAmount =randomBetween(minPurchaseWei,new BigNumber("9000000000000000000000").div(numPurchase/4).toString() );            
            let buyFromAccount = arrayAcct[Math.floor(Math.random() * 3)];
            let beforeAcctBalBig = await web3.eth.getBalance(buyFromAccount);
            
            // the subtract just to ensure enough ether to pay gas
            if(i== (numPurchase-1))weiBuyAmount = beforeAcctBalBig.minus(new BigNumber("1000000000000000000"));

            assert.isTrue((await crowd.whitelist(buyFromAccount)), buyFromAccount+" should be in the white list");
            assert.isTrue(beforeAcctBalBig.gte(minPurchaseWei),"Must have at least min purchase amt"); 

            let p = purchaseObj.calculate(purchaseObj,new BigNumber(weiBuyAmount));
            console.log(i +") Purchase by("+buyFromAccount+"):",weiBuyAmount , ", Token:"+p.token.toString()+" Refund:" + p.refund.toString());
            
            let beforeWeiRaisedBig = await crowd.weiRaised();
            let beforeUsdRaisedBig = await crowd.usdRaised();
            let beforeTokenBig = await crowd.tokensAllocated(buyFromAccount);
                        
            await crowd.sendTransaction({from:buyFromAccount, value:weiBuyAmount}).then(function(r){
                gasAmtInWei += r.receipt.gasUsed;
            });

            // need add the gas price to calculate the actual used wei for token purchase
            let afterAcctBalBig = await web3.eth.getBalance(buyFromAccount).add(gasAmtInWei);
            let afterWeiRaisedBig = await crowd.weiRaised();
            let afterUsdRaisedBig = await crowd.usdRaised();
            let afterTokenBig = await crowd.tokensAllocated(buyFromAccount);

            let actualUsdRasiedBig = afterUsdRaisedBig.minus(beforeUsdRaisedBig);
            let actualWeiRasiedBig = afterWeiRaisedBig.minus(beforeWeiRaisedBig);
            let actualTokenBig = afterTokenBig.minus(beforeTokenBig);

            assert.equal(actualTokenBig.toString(), p.token.toString(), "Token purchase amount must equal");
            assert.equal(actualWeiRasiedBig.toString(), new BigNumber(weiBuyAmount).minus(p.refund).toString(), "Purchase wei must equal");

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

        for(let i=0; i < 5;i++){
            console.log("Total Bonus Claimed("+i+") : ", purchaseObj.bonus[i].toString());
            assert.equal(purchaseObj.bonus[i].toString(), (await crowd.stageBonusAllocated(i)).toString(), "Total Claimed bonus must match");
        }
    });
}); 