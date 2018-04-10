var config = require('../migrationConfig.json');
var GCToken = artifacts.require("token/GCToken");
var GCTCrowdsale = artifacts.require("token/GCTCrowdsale");

var icoEndTime = Math.floor(Date.now()/1000) + (config.icoEndinMinute * 60);
function printResult(r){
    printout(r);
}
function printout(r){
    //console.log(r.receipt);
    console.log("\n--- Block#",r.receipt.blockNumber, ", Gas Used:",r.receipt.gasUsed, ",cumulativeGasUsed:",r.receipt.cumulativeGasUsed, " ---\n");
}
 

module.exports = function(deployer, network, accounts) {     
    deployer.deploy(GCTCrowdsale, GCToken.address,  {from:config.ownerAccount}).then(function(){
        return GCToken.deployed().then(function(gctInstance){

            gctInstance.setCrowdsaleAccount(GCTCrowdsale.address, {from:config.ownerAccount}).then(function(r){                
                    return GCTCrowdsale.deployed();
                }).then(function(crowdsaleInstance){
                    /*GCTCrowdsale = crowdsaleInstance;
                    crowdsaleInstance.init.estimateGas({from:ownerAccount}).then(function(r){
                        console.log("Init Estimate Gas:",r);
                    });*/
                    crowdsaleInstance.init(icoEndTime,40000,{from:config.ownerAccount}).then(function(r){
                        console.log("GCT   Address : ",GCToken.address);
                        console.log("Crowd Address : ",GCTCrowdsale.address);
                    });
                });
        });
    }); 
};
 