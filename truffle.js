module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  //  ganache-cli -p 7545 -i 7545 -l 4712388 -g 1
  networks: {
    dev: {
      host: "localhost",
      port: 7545,
      network_id: "7545", // Match any network id
      //gas: 7721974,//  4712388, // Gas limit used for deploys. Default is 4712388.
      gasPrice : 1, // equal 5 Gwei and default is 100 Gwei
      // from : 0x012, // From address used during migrations. Defaults to the first available account provided by your Ethereum client.
       //from : "0xecfdd32ed19ea8b7ec7f166418f1e0bdca95680f",
    }
  }
};
