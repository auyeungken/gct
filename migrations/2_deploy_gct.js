var config = require('../migrationConfig.json');
var GCToken = artifacts.require("token/GCToken");


module.exports = function(deployer, network, accounts) {
    deployer.deploy(GCToken,{from:config.ownerAccount});
};
