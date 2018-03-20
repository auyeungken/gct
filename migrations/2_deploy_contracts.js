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
module.exports = function(deployer) {
  deployer.deploy(GCToken,"1521539683","0xaF5642e8230662FeA4C25E69dC8f077ba13bfC6A", {
   // gas:7721974, 
    gasPrice:web3.toWei("1", "wei"),
    from : "0xc23b59CEF0BE7bF61e0113a0BD8a92Fc587B60E5",
  }).then(function (){
   // console.log(GCToken);
    console.log("Gas Usage:", GCToken.class_defaults);
   // return instance.giveAwayDividend.estimateGas(1);
  });
 
  /*deployer.deploy(GCTCrowdsale , {
    // gas:7721974, 
     gasPrice:web3.toWei("1", "wei"),
     from : "0xc23b59CEF0BE7bF61e0113a0BD8a92Fc587B60E5",
   }).then(function (){
    // console.log(GCToken);
     console.log("Gas Usage:", GCToken.class_defaults);
    // return instance.giveAwayDividend.estimateGas(1);
   });*/
};