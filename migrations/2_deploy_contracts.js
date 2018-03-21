var GCToken = artifacts.require("token/GCToken");
var GCTCrowdsale = artifacts.require("crowdsale/GCTCrowdsale");

// migrate --reset --verbose-rpc
/*
Usage parameters
 "from": "0x627306090abab3a6e1400e9345bc60c78a8bef57",
   >       "gas": "0x6691b7",
   >       "gasPrice": "0x174876e800",
   >       "data": "0x"
*/
/*module.exports = function(deployer) {
  deployer.deploy(GCToken,"1541539683").then(function (){
    return deployer.deploy(GCTCrowdsale,GCToken.address,"0x8dfA3afF0Da3a7c1703Ad7f14dAb371b8e6F132e");
  }).then(function(instance){
    console.log(instance);
  });
};
GCTCrowdsale.deployed().then(function(instance){instance.privateSaleAccount()});
*/

var a, b;
module.exports = function(deployer,network,config) {
  
  deployer.then(function() {
    // Create a new version of A
    return GCToken.new("1541539683");
  }).then(function(instance) {
    a = instance;
    // Get the deployed instance of B
    return GCTCrowdsale.new(a.address,"0x8dfA3afF0Da3a7c1703Ad7f14dAb371b8e6F132e");
  }).then(function(instance) {
    b = instance;
    // Set the new instance of A's address on B via B's setA() function.    
     a.setCrowdsaleAccount(b.address);
  }).then(function (instance){
    console.log("GCToken Address: ", a.address);
    console.log("GCTCrowdsale Address: ", b.address);


    /*b.initCrowdsale.estimateGas({from: "0xDec09d5fA0C8bA2680792a592E5133E374e13609"}).then(function(r){
      console.log(r);
    });*/

    /*b.initCrowdsale({from: "0xDec09d5fA0C8bA2680792a592E5133E374e13609",gas:678690}).then(function(result){
      
      
      a.privateSaleAccount.call().then(function(result){
        console.log("Private Sale Result:", result);
      });

      b.getInfo.call().then(function(result){
        console.log("Get Info : " , result);
      });

      a.totalSupply.call().then(function(result){
        console.log("Total Supply Result:", result);
      });
    });*/
  });
};
