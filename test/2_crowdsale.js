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
    console.log("Calculate => ", "weiPerToken:", weiPerToken.toString(), ", minPurchaseWei", minPurchaseWei.toString());
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

    it("StageToken should add up to crowdsale",async function(){
        let crowdsale = new BigNumber("6659024476e8"); // not include bonus amount

        let total = new BigNumber(0);
        for(let i=0; i < 5;i++){
            total = total.plus((await crowd.stageTokenSupply(i)).toNumber());
        }
        assert.equal(crowdsale.toString(), total.toString());
    }); 

    it("Calculate variable should match",async function(){
        let _usdPerEther = (await crowd.usdPerEther()).toNumber();
        let _weiPerToken = (await crowd.weiPerToken()).toNumber();
        let _minPurchaseWei = (await crowd.minPurchaseWei()).toNumber();

        assert.equal(_usdPerEther.toString(), usdPerEther.toString(), "usdPerEther not match");
        assert.equal(_weiPerToken.toString(), weiPerToken.toString(), "weiPerToken not match");
        assert.equal(_minPurchaseWei.toString(), minPurchaseWei.toString(), "minPurchaseWei not match");
    }); 

    it("Team Reserve should addup to its total",async function(){
        let teamReserve = (await crowd.TEAM_RESERVE()).toNumber();
        let total = 0;
        for(var i=0; i < 21; i++){
            total += (await crowd.teamReserve(i)).toNumber();
        } 
        assert.equal(total, teamReserve);
    }); 

    it("Purchase Token fail without whitelist",async function(){
        let weiBuyAmount = minPurchaseAmt;
        let buyFromAccount = config.testAccount1;
        let beforeAcctBalBig = await web3.eth.getBalance(buyFromAccount);
        assert.isTrue(beforeAcctBalBig.gte(new BigNumber(minPurchaseAmt)),"Must have at least min purchase amt"); 
        await crowd.sendTransaction({from:buyFromAccount, value:weiBuyAmount}).then(function (r){
            assert.isTrue(false, "Should not able to purchase token");
        }).catch(function(e){
            assert.isTrue(isVMErr(e.message), e.message);
        });
    });

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

    it("Purchase Token cannot below min purchase",async function(){ 
 
        let weiBuyAmount = minPurchaseAmt -1;
        let buyFromAccount = config.testAccount1;
        await crowd.addToWhitelist(buyFromAccount, {from:config.ownerAccount});
        await crowd.sendTransaction({from:buyFromAccount, value:weiBuyAmount}).then(function (r){
            assert.isTrue(false, "Should not able to buy tokens");
        }).catch(function(e){
            assert.isTrue(isVMErr(e.message), e.message);
        });
    });
 
    it("Purchase Token",async function(){
        var arrayAcct = [config.testAccount1,config.testAccount2,config.testAccount3];
        await crowd.addManyToWhitelist(arrayAcct, {from:config.ownerAccount});
        for(var i=0; i < arrayAcct.length;i++){            
            assert.isTrue((await crowd.whitelist(arrayAcct[i])), arrayAcct[i] + " should have add to whitelist");
        }

        var numPurchase = 100;
        for(var i=0; i < numPurchase; i++){
            let gasAmtInWei = 0;
            var toPause = BigNumber.random() > 0.5;

            // last purchase cannot be at pause status
            if(i== (numPurchase-1)){
                toPause = false;
            }

            if(toPause){
                if( !(await crowd.paused.call())) {
                    await crowd.pause({from : config.ownerAccount}).then(function(){
                        assert.isTrue(true);
                    }).catch(function (e){
                        assert.isTrue(false,"should have able to pause");
                    });
                }

                // should not able ot pause by other account
                await crowd.unpause({from : config.companyAccount}).then(function(){
                    assert.isTrue(false);
                }).catch(function(e){
                    assert.isTrue(isVMErr(e.message), e.message);
                }); 
            }else{
                if((await crowd.paused.call())){
                    await crowd.unpause({from : config.ownerAccount}).then(function(){
                        assert.isTrue(true);
                    }).catch(function (e){
                        assert.isTrue(false,"should have able to unpause");
                    });
                }

                // should not able ot pause by other account
                await crowd.pause({from : config.companyAccount}).then(function(){
                    assert.isTrue(false);
                }).catch(function(e){
                    assert.isTrue(isVMErr(e.message), e.message);
                }); 
            }
            assert.equal(toPause, await crowd.paused.call(), "Pause status should be equal");


            let weiBuyAmount = randomBetween(minPurchaseAmt,new BigNumber("9000000000000000000000").div(numPurchase).toString() );            
            let buyFromAccount = arrayAcct[Math.floor(Math.random() * 3)];
            let beforeAcctBalBig = await web3.eth.getBalance(buyFromAccount);
            

            console.log(i +") Purchase by("+buyFromAccount+"), pause("+toPause+") : ",weiBuyAmount , " WEI");

            // the subtract just to ensure enough ether to pay gas
            if(i== (numPurchase-1))weiBuyAmount = beforeAcctBalBig.sub(new BigNumber("1000000000000000000"));

            assert.isTrue((await crowd.whitelist(buyFromAccount)), buyFromAccount+" should be in the white list");
            assert.isTrue(beforeAcctBalBig.gte(new BigNumber(minPurchaseAmt)),"Must have at least min purchase amt"); 

            let beforeWeiRaisedBig = await crowd.weiRaised();
            let beforeUsdRaisedBig = await crowd.usdRaised();
            
            if(toPause){
                await crowd.sendTransaction({from:buyFromAccount, value:weiBuyAmount}).then(function(r){
                    assert.isTrue(false);
                }).catch(function(e){
                    assert.isTrue(isVMErr(e.message), e.message);
                });
                continue;
            }else{
                await crowd.sendTransaction({from:buyFromAccount, value:weiBuyAmount}).then(function(r){
                    gasAmtInWei += r.receipt.gasUsed;
                });
            }

            // need add the gas price to calculate the actual used wei for token purchase
            let afterAcctBalBig = await web3.eth.getBalance(buyFromAccount).add(gasAmtInWei);
            let afterWeiRaisedBig = await crowd.weiRaised();
            let afterUsdRaisedBig = await crowd.usdRaised();

            let actualUsdRasiedBig = afterUsdRaisedBig.minus(beforeUsdRaisedBig);
            let actualWeiRasiedBig = afterWeiRaisedBig.minus(beforeWeiRaisedBig);

            console.log("Raised USD: ",actualUsdRasiedBig.toString(), ", Raised Wei:", actualWeiRasiedBig.toString() );
            assert.equal(actualUsdRasiedBig.toString(),actualWeiRasiedBig.times(usdPerEther).toString(),"Raised USD amount not match");

            //console.log("Before : " ,beforeAcctBalBig.toString(), ", After:",afterAcctBalBig.toString() );
            assert.equal(actualWeiRasiedBig.toString(),beforeAcctBalBig.minus(afterAcctBalBig).toString(), 
                        i +")Raised amount must equal to balance difference");
        }

        let capBig = await crowd.CROWDSALE_SUPPLY();
        let crowdsaleMintedBig =  await crowd.crowdsaleMinted();
        assert.isTrue(capBig.eq(crowdsaleMintedBig), "All crowdsale portal had not sold out");

        let totalUSDRaisedBig = await crowd.usdRaised();
        console.log("Total =>" , "totalUSDRaisedBig:",totalUSDRaisedBig.div(new BigNumber("1e20")).toString(), ", expectEarnUSD:", expectEarnUSD.toString());
        totalUSDRaisedBig = (totalUSDRaisedBig.div(new BigNumber("1e20")));
        totalUSDRaisedBig = new BigNumber(totalUSDRaisedBig.toString()).dp(2);
        assert.equal(totalUSDRaisedBig.toString(),expectEarnUSD.toString(), "Raised amount should match");
    });

    it("All Token puchased, cannot buy more",async function(){ 
        let weiBuyAmount = minPurchaseAmt;            
        let buyFromAccount = config.testAccount1;
        
        await crowd.sendTransaction({from:buyFromAccount, value:weiBuyAmount}).then(function (r){
            assert.isTrue(false, "Should not able to purchase");
        }).catch(function(e){
            assert.isTrue(isVMErr(e.message), e.message);
        });            
    });

    it("should not able to claim company reserve",async function(){ 
        await crowd.claimCompanyReserve().then(function (r){
            assert.isTrue(false, "Should not able to claim company reserve");
        }).catch(function(e){
            assert.isTrue(isVMErr(e.message), e.message);
        });            
    });

    it("should not able to claim team reserve",async function(){ 
        await crowd.claimTeamToken({from : config.teamAccount}).then(function (r){
            assert.isTrue(false, "Should not able to claim team reserve");
        }).catch(function(e){
            assert.isTrue(isVMErr(e.message), e.message);
        });            
    }); 


    it("Close crowdsale",async function(){ 
        await crowd.closeCrowdsale().then(function (r){
            assert.isTrue(true);
        }).catch(function(e){
            assert.isTrue(false, "should able to call crowdsale close");
        }); 

        await crowd.closeCrowdsale().then(function (r){
            assert.isTrue(false, "Should not able to call crowdsale close");
        }).catch(function(e){
            assert.isTrue(isVMErr(e.message), e.message);
        });            
    }); 

    
    // Must include the follow method into GCTCrowdsale in order for following testcase to work
    // Also Change follow constant to variable
    // 1) TEAM_CAN_CLAIM_AFTER
    // 2) CLAIM_STAGE
    // 3) COMPANY_RESERVE_FOR
    /*
    // ********************************** need to remove after testing **************************   
    event TestCompanyReserve(uint _v);
    event TestTeam(uint _v1, uint _v2);
    
    function testSetIcoEndTime(uint _v)public{
        icoEndTime = _v;
    }

    function testTeamCanClaim(uint _claimAfter, uint _claimStage) public {
        TEAM_CAN_CLAIM_AFTER = _claimAfter * 1 seconds;
        CLAIM_STAGE = _claimStage * 1 seconds;
        emit TestTeam(TEAM_CAN_CLAIM_AFTER,CLAIM_STAGE);
    }

    function testCompanyReserve(uint _v) public {
        COMPANY_RESERVE_FOR = _v * 1 seconds;
        emit TestCompanyReserve(COMPANY_RESERVE_FOR);
    }
    // *******************************************************************************************
    
    */
   

    it("Team Reserve Claim",async function(){ 
        var reserveAmt = [
            "865800000000000", "1731600000000000", "2597400000000000", "3463200000000000", "4329000000000000", 
            "5194800000000000", "6060600000000000","6926400000000000", "7792200000000000", "8658000000000000", 
            "9523800000000000", "10389600000000000", "11255400000000000", "12121200000000000", "12987000000000000", 
            "13852800000000000", "14718600000000000",  "15584400000000000", "16450200000000000", "17316000000000000", 
            "18182000000000000"];
        var time = Math.floor(Date.now()/1000);  
        await crowd.testSetIcoEndTime(time + 5);

        await crowd.claimTeamToken({from : config.teamAccount}).then(function (r){
            assert.isTrue(false, "Should not able to claim team reserve");
        }).catch(function(e){
            assert.isTrue(isVMErr(e.message), e.message);
        });    
        
        // start 10 sec end of ico, than each step 5 sec
        await crowd.testTeamCanClaim(10,5);

        await delay(6000);
        await crowd.claimTeamToken({from : config.teamAccount}).then(function (r){
            assert.isTrue(false, "Should not able to claim team reserve");
        }).catch(function(e){
            assert.isTrue(isVMErr(e.message), e.message);
        }); 
        await delay(5000);

        let totalClaim = new BigNumber(0);
        for(var i=0; i < 15; ){

            // this call doesn't change the state, use it for calculation
            
            await delay(5000);
            let beforebal = await gct.balanceOf(config.teamAccount);     
            await crowd.claimTeamToken({from : config.teamAccount}).then(function (r){
                assert.isTrue(true);                
            }).catch(function(e){
                assert.isTrue(false, "Should able to claim stage " + i + ":" + e);
            });
            
            let stageClaimed = new BigNumber(0);
            for(var j=i; j < 20;j++ ){                
                let tmp = (await crowd.teamReserve(j));
                //console.log("Stage " + j + " : " + tmp.toNumber());
                if(tmp.toNumber() > 0)break;
                stageClaimed = stageClaimed.plus(new BigNumber(reserveAmt[j]));
                i++;
            }
            
            // claim it again won't effect the overall balance
            //await crowd.claimTeamToken({from : config.teamAccount});

            let bal = await gct.balanceOf(config.teamAccount);            
            totalClaim = totalClaim.plus(stageClaimed);

            console.log(i +") Total Claim : ", totalClaim.toString(),", Before:", beforebal.toString(), " , Balance : ",bal.toString() + ", Stage("+i+") : ", reserveAmt[i]);
            assert.equal(totalClaim.toNumber(), bal.toNumber(),"Balance and claimed must equal");
        }

        await delay(60000);
        await crowd.claimTeamToken({from : config.teamAccount}).then(function (r){
            assert.isTrue(true);                
        }).catch(function(e){
            assert.isTrue(false, "Should able to claim all");
        });
        
        let bal = await gct.balanceOf(config.teamAccount);
        let teamReserve = await crowd.TEAM_RESERVE();        
        assert.equal(bal.toString(), teamReserve.toString(), "final Balance and claimed must equal");
    });
});