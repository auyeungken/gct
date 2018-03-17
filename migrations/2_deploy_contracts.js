var GCToken = artifacts.require("token/GCToken");

// migrate --reset --verbose-rpc
/*
Usage parameters
 "from": "0x627306090abab3a6e1400e9345bc60c78a8bef57",
   >       "gas": "0x6691b7",
   >       "gasPrice": "0x174876e800",
   >       "data": "0x"
*/
module.exports = function(deployer) {
  deployer.deploy(GCToken , {
   // gas:7721974, 
    gasPrice:web3.toWei("1", "wei"),
    from : "0xc23b59CEF0BE7bF61e0113a0BD8a92Fc587B60E5",
  }).then(function (){
   // console.log(GCToken);
    console.log("Gas Usage:", GCToken.class_defaults);
   // return instance.giveAwayDividend.estimateGas(1);
  });
};