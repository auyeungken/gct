var config = require('../migrationConfig.json');
var GCToken = artifacts.require("GCToken");
var GCTCrowdsale = artifacts.require("../contracts/crowdsale/GCTCrowdsale");

var gct,crowd;

GCToken.deployed().then(function(o){
    gct = o;
    GCTCrowdsale.deployed().then(function(o1){
        crowd = o1;
    });
});

var psTargetAccount = config.testAccount; 
var nonPsAccount = config.ownerAccount;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function isVMErr(msg){
    return msg.includes('VM Exception');
}


callTest();
function callTest(){
    contract('GCTCrowdsale', function(accounts) {
        it("icoEnd must be setted",async function(){
            await gct.icoEndTime().then(function (r){
                assert.isAbove(r.toNumber(), 0,"icoEnd not configure");
            }); 
        }); 


        it("Should contain private address",async function(){
            await gct.privateSaleAccount().then(function (r){
                assert.equal(r, config.privateSaleAccount.toLowerCase(),"private sale account not equal");
            }); 
        });

    
        it("privateInvestLockToken must bet setted",async function(){
            await gct.privateInvestLockToken().then(function (r){
                assert.isAbove(r.toNumber(), 0,"privateInvestLockToken not configure");
            }); 
        });

        it("Private invest lock token must bet setted",async function(){
            await gct.privateInvestLockToken().then(function (r){
                assert.isAbove(r.toNumber(), 0,"privateInvestLockToken not configure");
            }); 
        });

        it("privateSaleTransferRelease must be setted",async function(){
            await gct.privateSaleReleaseTime().then(function (r){
                assert.isAbove(r.toNumber(), 0,"privateSaleTransferRelease not configure");
            }); 
        });

        it("crowdsale address must be equal",async function(){
            await gct.crowdsaleAccount().then(function(r){
                assert.equal(r.toLowerCase(),crowd.address.toLowerCase(), "crowdsaleAccount account not equal");
            }); 
        });

        it("Cap amount must be equal",async function(){
            await gct.cap().then(function (r){
                assert.equal(r.toNumber(), config.cap,"cap amount not equal");
            }); 
        });

        it("Has already been initialize",async function(){
            await gct.hasInit().then(function (r){
                assert.isTrue(r);
            }); 
        });

        it("Owner should not able to mint coin",async function(){
             
            await gct.mint(config.ownerAccount, 1, {from: config.ownerAccount}).then(function(){
                assert.isTrue(false);
            }).catch(function(e){
                assert.isTrue(isVMErr(e.message), e.message);
            }); 
        });

        it("PrivateSale account should able to transfer with private sale transfer",async function(){
            var transfer = 1000000;
            
            let psBalance = (await gct.balanceOf(config.privateSaleAccount)).toNumber();

            await gct.privateSaleTransfer(psTargetAccount, transfer, {from: config.privateSaleAccount});  

            let testBalance =  (await gct.balanceOf(psTargetAccount)).toNumber();                                     
            let psInvested = (await gct.getPrivateSaleInvested(psTargetAccount, {from: config.privateSaleAccount})).toNumber();  
                         
            assert.equal(transfer,testBalance,"Transfer and owner balance should equal");
            assert.equal(transfer,psInvested,"Invest amount should equal to "+transfer);
                            
            await gct.getPrivateSaleInvested(psTargetAccount, {from: config.teamAccount}).then(function(r){
                assert.isTrue(false,"Should only owner and private sale account can access getPrivateSaleInvested");
            }).catch(function(e){
                assert.isTrue(isVMErr(e.message), e.message);
            });

            await gct.getPrivateSaleInvested(psTargetAccount, {from: config.ownerAccount}).then(function(r){
                assert.equal(transfer,r,"Invest amount should equal to "+transfer);
            }).catch( function(e){
                assert.isTrue(false,"Owner should able to getPrivateSaleInvested");
            });
        });


        it("Should not able to do transfer even as owner before restrict period ends",async function(){
            await gct.transfer(config.promotionAccount, 1, {from: config.ownerAccount}).then(function (r){
                assert.isTrue(false, "Should not able to transfer");
            }).catch(async function(e){
                assert.isTrue(isVMErr(e.message), e.message);
            });
        });

        it("Should not able to set IcoEndTime accept owner",async function(){            
            var icoEndTime = Math.floor(Date.now()/1000) + (config.icoEndinMinute * 60);
            await gct.setIcoEndTime(icoEndTime, {from: config.privateSaleAccount}).then(function (r){
                assert.isTrue(false, "Should not able set ico end time");
            }).catch(function(e){
                assert.isTrue(isVMErr(e.message), e.message);
            });
        });
        

        it("Should able to set IcoEndTime by owner",async function(){    
            var time = Math.floor(Date.now()/1000);// + (config.icoEndinMinute * 60);
            await gct.setIcoEndTime(time, {from: config.ownerAccount}).then(function(){
                assert.isTrue(true);
            }).catch(function(e){
                assert.isTrue(false, "Should not throw exception");
            });

            await gct.icoEndTime().then(function(a){                    
                assert.equal(time,a.toNumber(),"Ico end time should be equal");
            });
        });

        // Must include the follow method into GCTToken in order for following testcase to work
        // ********************************** need to remove after testing **************************
        /*
        function testSetPrivateSaleReleaseTime(uint _v) public {
            privateSaleReleaseTime = _v;
        }

        function testSetPrivateInvestLockToken(uint _v)public{
            require(_v > 0);
            privateInvestLockToken = _v;
        }

        function testGiveAccountSomeBal(address _to, uint _amount)public{
            require(totalSupply_.add(_amount) <= cap);
            totalSupply_ = totalSupply_.add(_amount);
            balances[_to] = balances[_to].add(_amount);
            emit Mint (_to, _amount);
            emit Transfer(address(0), _to, _amount);
        }*/

        it("Should able to do transfer for non PS account",async function(){
            
            var transferAmt = 1000;
            var time = Math.floor(Date.now()/1000);  
            let getTestBal = (await gct.balanceOf(psTargetAccount)).toNumber();     
            
            // lockup with private sale restriction
            var time = Math.floor(Date.now()/1000);// + (config.icoEndinMinute * 60);
            await gct.testSetPrivateSaleReleaseTime(time + 600);
            await gct.testSetPrivateInvestLockToken(1); // set it to 1 just ensure this is hit

            await delay(1000);
            
            await gct.transfer(config.testAccount1, transferAmt, {from: psTargetAccount}).then(function (r){
                assert.isTrue(false,"should return exception for PS account");
            }).catch(function(e){
                assert.isTrue(isVMErr(e.message), e.message);
            });

            let getInvestAmt = (await gct.getPrivateSaleInvested(nonPsAccount)).toNumber();
            assert.equal(getInvestAmt, 0, "Non PS account shouldn't have invest");

            await gct.testGiveAccountSomeBal(nonPsAccount, transferAmt);

            let getNonPSBal = (await gct.balanceOf(nonPsAccount)).toNumber();
            assert.isAtLeast(getNonPSBal,transferAmt,"Non PS account should have at least") ;  

            // is ok to transfer to an PS account
            await gct.transfer(psTargetAccount, transferAmt, {from: nonPsAccount}).then(function (r){
                assert.isTrue(true);
            }).catch(function(e){
                assert.isTrue(false,"should able to transfer to PS account : " +e);
            });

            let getAfterTestBal = (await gct.balanceOf(psTargetAccount)).toNumber();   
            assert.equal(getTestBal+transferAmt,getAfterTestBal,"PS balance should increase by "+transferAmt);
        }); 

        it("Should not able to transfer until time restrict over",async function(){
            var transferAmt = 1000;
            var time = Math.floor(Date.now()/1000);// + (config.icoEndinMinute * 60);
            await gct.setIcoEndTime(time, {from: config.ownerAccount});

            
             time = Math.floor(Date.now()/1000);

            let getInvestAmt = (await gct.getPrivateSaleInvested(psTargetAccount)).toNumber();            
            assert.isAtLeast(getInvestAmt,1,"PS must invested") ;  
            
            let beforeBal = (await gct.balanceOf(config.testAccount1)).toNumber();    

            var time = Math.floor(Date.now()/1000);// + (config.icoEndinMinute * 60);
            await gct.testSetPrivateSaleReleaseTime(time + 60);
            await gct.testSetPrivateInvestLockToken(getInvestAmt - 1);  

            await delay(1000);
            
            await gct.transfer(config.testAccount1, transferAmt, {from: psTargetAccount}).then(function (){
                assert.isTrue(false,"should return exception");
            }).catch(function(e){
                assert.isTrue(isVMErr(e.message), e.message);
            });           

            let afterBal = (await gct.balanceOf(config.testAccount1)).toNumber(); 
            assert.equal(beforeBal,afterBal, "Balance should be same");
        });
     
        it("Should able to transfer even over token invest restrict",async function(){
            var transferAmt = 1000;
            var time = Math.floor(Date.now()/1000);// + (config.icoEndinMinute * 60);
            await gct.setIcoEndTime(time, {from: config.ownerAccount});

            
             time = Math.floor(Date.now()/1000);

            let getInvestAmt = (await gct.getPrivateSaleInvested(psTargetAccount)).toNumber();            
            assert.isAtLeast(getInvestAmt,1,"PS must invested") ;  
            
            let beforeBal = (await gct.balanceOf(config.testAccount1)).toNumber();    

            var time = Math.floor(Date.now()/1000);// + (config.icoEndinMinute * 60);
            await gct.testSetPrivateSaleReleaseTime(time);
            await gct.testSetPrivateInvestLockToken(getInvestAmt - 1);  

            await delay(1000);
            
            await gct.transfer(config.testAccount1, transferAmt, {from: psTargetAccount}).then(function (){
                assert.isTrue(true);
            }).catch(function(e){
                assert.isTrue(false);
            });  

            let afterBal = (await gct.balanceOf(config.testAccount1)).toNumber(); 
            assert.equal(transferAmt+beforeBal,afterBal, "Balance should increased by " +transferAmt);
        }); 

        it("Should able to transfer even time restriction not expire",async function(){
            var transferAmt = 1000;
            var time = Math.floor(Date.now()/1000);// + (config.icoEndinMinute * 60);
            await gct.setIcoEndTime(time, {from: config.ownerAccount});

            
             time = Math.floor(Date.now()/1000);

            let getInvestAmt = (await gct.getPrivateSaleInvested(psTargetAccount)).toNumber();            
            assert.isAtLeast(getInvestAmt,1,"PS must invested") ;  
            
            let beforeBal = (await gct.balanceOf(config.testAccount1)).toNumber();    

            var time = Math.floor(Date.now()/1000);// + (config.icoEndinMinute * 60);
            await gct.testSetPrivateSaleReleaseTime(time + 60);
            await gct.testSetPrivateInvestLockToken(getInvestAmt + 1);  

            await delay(1000);
            
            await gct.transfer(config.testAccount1, transferAmt, {from: psTargetAccount}).then(function (){
                assert.isTrue(true);
            }).catch(function(e){
                assert.isTrue(false);
            });  

            let afterBal = (await gct.balanceOf(config.testAccount1)).toNumber(); 
            assert.equal(transferAmt+beforeBal,afterBal, "Balance should increased by " +transferAmt);
        }); 
    });
}
 