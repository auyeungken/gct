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

var testTargetAccount = config.teamAccount;

callTest();
function callTest(){
    contract('GCTCrowdsale', function(accounts) {
        it("icoEnd must be setted",function(){
           gct.icoEndTime().then(function (r){
                assert.isAbove(r.toNumber(), 0,"icoEnd not configure");
            }); 
        }); 


        it("Should contain private address",function(){
            gct.privateSaleAccount().then(function (r){
                assert.equal(r, config.privateSaleAccount.toLowerCase(),"private sale account not equal");
            }); 
        });

    
        it("privateInvestLockToken must bet setted",function(){
            gct.privateInvestLockToken().then(function (r){
                assert.isAbove(r.toNumber(), 0,"privateInvestLockToken not configure");
            }); 
        });

        it("Private invest lock token must bet setted",function(){
            gct.privateInvestLockToken().then(function (r){
                assert.isAbove(r.toNumber(), 0,"privateInvestLockToken not configure");
            }); 
        });

        it("privateSaleTransferRelease must be setted",function(){
            gct.privateSaleTransferRelease().then(function (r){
                assert.isAbove(r.toNumber(), 0,"privateSaleTransferRelease not configure");
            }); 
        });

        it("crowdsale address must be equal",function(){
             gct.crowdsaleAccount().then(function(r){
                assert.equal(r.toLowerCase(),crowd.address.toLowerCase(), "crowdsaleAccount account not equal");
            }); 
        });

        it("Cap amount must be equal",function(){
            gct.cap().then(function (r){
                assert.equal(r.toNumber(), config.cap,"cap amount not equal");
            }); 
        });

        it("Has already been initialize",function(){
            gct.hasInit().then(function (r){
                assert.isTrue(r);
            }); 
        });

        it("Owner should not able to mint coin",function(){
            gct.mint(config.ownerAccount, 1, {from: config.ownerAccount}).then(function (r){
                assert.isTrue(false, "Return Result:"+r);
            }).catch(function(e){
                assert.isTrue(true);
            });
        });

        it("PrivateSale account should able to transfer with private sale transfer",function(){
            var transfer = 1000000;
            gct.balanceOf(config.privateSaleAccount).then(function(balance){                       
                gct.privateSaleTransfer(testTargetAccount, transfer, {from: config.privateSaleAccount}).then(function (r){                     
                    gct.balanceOf(testTargetAccount).then(function(ownerBal){                       
                        gct.getPrivateSaleInvested(testTargetAccount, {from: config.privateSaleAccount}).then(function(r){
                            assert.equal(transfer,ownerBal,"Transfer and owner balance should equal");
                            assert.equal(transfer,r,"Invest amount should equal to "+transfer);
                            gct.getPrivateSaleInvested(testTargetAccount, {from: config.teamAccount}).then(function(r){
                                assert.isTrue(false,"Should only owner and private sale account can access getPrivateSaleInvested");
                            }).catch(function(e){
                                gct.getPrivateSaleInvested(testTargetAccount, {from: config.ownerAccount}).then(function(r){
                                    assert.equal(transfer,r,"Invest amount should equal to "+transfer);
                                }).catch(function(e){
                                    assert.isTrue(false,"Owner should able to getPrivateSaleInvested");
                                });
                            });
                        });
                    });                    
                });             
            });
        });


        it("Should not able to do transfer even as owner before restrict period ends",function(){
            gct.transfer(config.promotionAccount, 1, {from: config.ownerAccount}).then(function (r){
                assert.isTrue(false, "Should not able to transfer");
            }).catch(function(e){
                assert.isTrue(true);
            });
        });

        it("Should not able to set IcoEndTime accept owner",function(){            
            var icoEndTime = Math.floor(Date.now()/1000) + (config.icoEndinMinute * 60);
            gct.setIcoEndTime(icoEndTime, {from: config.privateSaleAccount}).then(function (r){
                assert.isTrue(false, "Should not able set ico end time");
            }).catch(function(e){
                assert.isTrue(true);
            });
        });
        

        it("Should able to set IcoEndTime by owner",function(){            
            var time = Math.floor(Date.now()/1000);// + (config.icoEndinMinute * 60);
            gct.setIcoEndTime(time, {from: config.ownerAccount}).then(function (r){
                gct.icoEndTime().then(function(a){                    
                    assert.equal(time,a.toNumber(),"Ico end time should be equal");
                });
            }).catch(function(e){
                assert.isTrue(false, "Should not throw exception");
            });
        });

        it("Should able to do transfer",function(){
            gct.transfer(config.promotionAccount, 1, {from: testTargetAccount}).then(function (r){
                gct.balanceOf(config.promotionAccount).then(function(r){
                    assert.equal(1,r.toNumber(),"balance should equal to 1")
                });
            }).catch(function(e){
                assert.isTrue(false,"should able to do transfer");
            });
        });
    });
}