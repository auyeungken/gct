module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  //  ganache-cli -p 7545 -i 7545 -l 4712388 -g 1
  networks: {
    dev: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "5777", // Match any network id
      gas: 8721975,//  4712388, // Gas limit used for deploys. Default is 4712388.
      gasPrice : 1, // equal 5 Gwei and default is 100 Gwei
      // from : 0x012, // From address used during migrations. Defaults to the first available account provided by your Ethereum client.
       from : "0xDec09d5fA0C8bA2680792a592E5133E374e13609",
    }
  }
};
