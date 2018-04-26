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

var config = require('../migrationConfig.json');
var BigNumber = require('bignumber.js');
var GCToken = artifacts.require("GCToken");
var gct;


function randomBetween(min,max){
    return BigNumber.random().times(max).plus(min).integerValue().toString();
}


const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function isVMErr(msg){
    return msg.includes('VM Exception');
}


GCToken.deployed().then(function(o){
    gct = o;
});

let balCheckAddr = [config.crowdsaleAccount,
                    config.companyAccount, 
                    config.privateSaleAccount,
                    config.teamAccount,
                    config.promotionAccount, 
                    config.testAccount1,
                    config.testAccount2,
                    config.testAccount3,
                    ];

contract('GCT Check', function(accounts) {
    
    it("Token Sum up check",async function(){
        let cap = (await gct.CAPPED_SUPPLY()).toNumber();
        let reserve = (await gct.COMPANY_RESERVE()).toNumber();
        let ps = (await gct.PRIVATE_SALE()).toNumber();
        let promotion = (await gct.PROMOTION_PROGRAM()).toNumber();
        let crowdsale = (await gct.CROWDSALE_SUPPLY()).toNumber();
        let teamReserve = (await gct.TEAM_RESERVE()).toNumber();

        assert.equal(reserve + ps + promotion + crowdsale + teamReserve, cap);
    });

    it("Team Reserve should addup to its total",async function(){
        let teamReserve = (await gct.TEAM_RESERVE()).toNumber();
        let total = 0;
        for(var i=0; i < 21; i++){
            total += (await gct.teamReserve(i)).toNumber();
        } 
        assert.equal(total, teamReserve);
    }); 

    
    it("should not able to claim company reserve",async function(){ 
        await gct.claimCompanyReserve().then(function (r){
            assert.isTrue(false, "Should not able to claim company reserve");
        }).catch(function(e){
            assert.isTrue(isVMErr(e.message), e.message);
        });            
    });

    it("should not able to claim team reserve",async function(){ 
        await gct.claimTeamToken({from : config.teamAccount}).then(function (r){
            assert.isTrue(false, "Should not able to claim team reserve");
        }).catch(function(e){
            assert.isTrue(isVMErr(e.message), e.message);
        });            
    }); 

     

    it("Cannot transfer over privatesale balance limit",async function(){ 
        await gct.transfer(config.testAccount1, "90000000000000001",{from : config.privateSaleAccount}).then(function (r){
            assert.isTrue(false, "Should not able transfer");
        }).catch(function(e){
            assert.isTrue(isVMErr(e.message), e.message);
        });            
    });

    it("Cannot transfer over crowdsale balance limit",async function(){ 
        await gct.transfer(config.testAccount1, "810000000000000001",{from : config.crowdsaleAccount}).then(function (r){
            assert.isTrue(false, "Should not able transfer");
        }).catch(function(e){
            assert.isTrue(isVMErr(e.message), e.message);
        });            
    });

   
    it("Crowdsale Transfer Token",async function(){
        var arrayAcct = [config.testAccount1,config.testAccount2,config.testAccount3];
        

        var numPurchase = 100;
        for(var i=0; i < numPurchase; i++){
            let tokenAmount = randomBetween("1" ,new BigNumber("100e8").toString());            
            let targetAccount = arrayAcct[Math.floor(Math.random() * 3)];
            console.log(i +") Transfer to("+targetAccount+"), Token: ",tokenAmount);

            let beforeCrowdsaleToken = await gct.balanceOf(config.crowdsaleAccount);
            let beforeTargetToken = await gct.balanceOf(targetAccount);
 
            await gct.transfer(targetAccount,tokenAmount, {from:config.crowdsaleAccount});

            let afterCrowdsaleToken = await gct.balanceOf(config.crowdsaleAccount);
            let afterTargetToken = await gct.balanceOf(targetAccount);

            let crowdsaleDiff = beforeCrowdsaleToken.sub(afterCrowdsaleToken);
            let targetDiff = afterTargetToken.sub(beforeTargetToken);

            assert.equal(crowdsaleDiff.toString(), tokenAmount.toString(),"Crowdsale transfer amount must equal");
            assert.equal(targetDiff.toString(), tokenAmount.toString(),"Target Received amount must equal");
        }
    });

    it("Privatesale Transfer Token",async function(){
        var arrayAcct = [config.testAccount1,config.testAccount2,config.testAccount3];
        

        var numPurchase = 100;
        for(var i=0; i < numPurchase; i++){
            let tokenAmount = randomBetween("1" ,new BigNumber("100e8").toString());            
            let targetAccount = arrayAcct[Math.floor(Math.random() * 3)];
            console.log(i +") Transfer to("+targetAccount+"), Token: ",tokenAmount);

            let beforeCrowdsaleToken = await gct.balanceOf(config.privateSaleAccount);
            let beforeTargetToken = await gct.balanceOf(targetAccount);
 
            await gct.transfer(targetAccount,tokenAmount, {from:config.privateSaleAccount});

            let afterCrowdsaleToken = await gct.balanceOf(config.privateSaleAccount);
            let afterTargetToken = await gct.balanceOf(targetAccount);

            let crowdsaleDiff = beforeCrowdsaleToken.sub(afterCrowdsaleToken);
            let targetDiff = afterTargetToken.sub(beforeTargetToken);

            assert.equal(crowdsaleDiff.toString(), tokenAmount.toString(),"Privatesale transfer amount must equal");
            assert.equal(targetDiff.toString(), tokenAmount.toString(),"Target Received amount must equal");
        }
    });

    
    it("Team Reserve Claim",async function(){ 
        var reserveAmt = [
            "865800000000000", "1731600000000000", "2597400000000000", "3463200000000000", "4329000000000000", 
            "5194800000000000", "6060600000000000","6926400000000000", "7792200000000000", "8658000000000000", 
            "9523800000000000", "10389600000000000", "11255400000000000", "12121200000000000", "12987000000000000", 
            "13852800000000000", "14718600000000000",  "15584400000000000", "16450200000000000", "17316000000000000", 
            "18182000000000000"];
        var time = Math.floor(Date.now()/1000);  
        await gct.testSetIcoEndTime(time + 5);

        await gct.claimTeamToken({from : config.teamAccount}).then(function (r){
            assert.isTrue(false, "Should not able to claim team reserve");
        }).catch(function(e){
            assert.isTrue(isVMErr(e.message), e.message);
        });    
        
        // start 10 sec end of ico, than each step 5 sec
        await gct.testTeamCanClaim(10,5);

        await delay(6000);
        await gct.claimTeamToken({from : config.teamAccount}).then(function (r){
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
            await gct.claimTeamToken({from : config.teamAccount}).then(function (r){
                assert.isTrue(true);                
            }).catch(function(e){
                assert.isTrue(false, "Should able to claim stage " + i + ":" + e);
            });
            
            let stageClaimed = new BigNumber(0);
            for(var j=i; j < 20;j++ ){                
                let tmp = (await gct.teamReserve(j));
                //console.log("Stage " + j + " : " + tmp.toNumber());
                if(tmp.toNumber() > 0)break;
                stageClaimed = stageClaimed.plus(new BigNumber(reserveAmt[j]));
                i++;
            }
            
            // claim it again won't effect the overall balance
            //await gct.claimTeamToken({from : config.teamAccount});

            let bal = await gct.balanceOf(config.teamAccount);            
            totalClaim = totalClaim.plus(stageClaimed);

            console.log(i +") Total Claim : ", totalClaim.toString(),", Before:", beforebal.toString(), " , Balance : ",bal.toString() + ", Stage("+i+") : ", reserveAmt[i]);
            assert.equal(totalClaim.toNumber(), bal.toNumber(),"Balance and claimed must equal");
        }

        await delay(60000);
        await gct.claimTeamToken({from : config.teamAccount}).then(function (r){
            assert.isTrue(true);                
        }).catch(function(e){
            assert.isTrue(false, "Should able to claim all");
        });
        
        let bal = await gct.balanceOf(config.teamAccount);
        let teamReserve = await gct.TEAM_RESERVE();        
        assert.equal(bal.toString(), teamReserve.toString(), "final Balance and claimed must equal");
    });

    it("Company Reserve Claim",async function(){ 
        var time = Math.floor(Date.now()/1000) - 63072000;  // add 2 yr to ensure all the claim should be valid
        await gct.testSetIcoEndTime(time, {from : config.ownerAccount}); 

        await gct.claimCompanyReserve({from : config.companyAccount});
        let reserve = (await gct.COMPANY_RESERVE()).toString();
        let companyBal = (await gct.balanceOf(config.companyAccount)).toString();
        assert.equal(reserve.toString(), companyBal.toString(), "Company Reserve amount must equal");
    });

    it("Already claimed all team reserve",async function(){ 
        await gct.claimTeamToken({from : config.teamAccount}).then(function (r){
            assert.isTrue(false, "Claimed all already");
        }).catch(function(e){
            assert.isTrue(isVMErr(e.message), e.message);
        });            
    }); 

    it("Already claimed company reserve",async function(){ 
        await gct.claimCompanyReserve({from : config.companyAccount}).then(function (r){
            assert.isTrue(false, "Claimed already");
        }).catch(function(e){
            assert.isTrue(isVMErr(e.message), e.message);
        });            
    }); 

    

    // for this checking to pass, must disable now > IcoEndTime in contract
    it("Acquire All Token Check", async function(){
        let cap = (await gct.CAPPED_SUPPLY());
        let total = new BigNumber(0);
        for(let i=0; i < balCheckAddr.length;i++){
            let amt = await gct.balanceOf(balCheckAddr[i]);
            console.log("Token ",balCheckAddr[i] , "=>", amt.toString() );
            total = total.plus(amt);
        }
        
        assert.equal(total.toString(), cap.toString());
    });
});