var config = require('../migrationConfig.json');
var GCToken = artifacts.require("token/GCToken");


var icoEndTime = Math.floor(Date.now()/1000) + (config.icoEndinMinute * 60);
function printResult(r){
    printout(r);
}
function printout(r){
    //console.log(r.receipt);
    console.log("\n--- Block#",r.receipt.blockNumber, ", Gas Used:",r.receipt.gasUsed, ",cumulativeGasUsed:",r.receipt.cumulativeGasUsed, " ---\n");
}

module.exports = function(deployer, network, accounts) {
    deployer.deploy(GCToken,icoEndTime,{from:config.ownerAccount}).then(function(){
        //return GCToken.deployed().then(function(gctInstance){
            console.log("GCT Address : ",GCToken.address);
        //});
    });
};
