const contractUtils = {
    debug:true,
    setContractVal: function (pkey,contractObj,gas,gasprice,estimateOnly,ether,functionName,display,...params){
        let acctAddress = web3.eth.defaultAccount;
        //let account = web3js.eth.accounts.wallet.add(pkey);
        let contract = new web3js.eth.Contract(contractObj.abi, $('#txtgctaddress').val());
        contract.options.from = acctAddress;// account.address;
       
        if(gas==='')gas = '1000000';
        if(estimateOnly){
            gas = '5000000';
        }
        let paramStr = "";
        if(params && params.length>0 && params[0] != '') {
            for(let i=0; i < params.length;i++){
                if(Array.isArray(params[i])){
                    for(let j=0; j < params[i].length;j++){
                        paramStr += (j>0?",":"") + "'" +  params[i][j] + "'" ;
                    }
                }else{
                    paramStr += (i>0?",":"") + "'" +  params[i] + "'" ;
                }
            }
        }
        if($.isNumeric(ether)){
            ether = convertToWei(ether,'18');
        }else{
            ether =  new BigNumber(0);
        }
        
        let fStr = "contract.methods."+functionName+"("+paramStr+")";
        
        if(contractUtils.debug)console.log("Call Set("+fStr+") : ", '=>From:',acctAddress, '=>wei:', ether.toString(), '=> Gas:', gas, '=> GasPrice:', gasprice);
        let f = eval(fStr);

        f.estimateGas({
            from: acctAddress, //account.address,
            gas: gas,
            value: ether,
        }).then(function(gasAmount){
            if(display)display.append("<br/>- Estimate Gas("+functionName+") : ", gasAmount);
            if(!estimateOnly){                
                if(new BigNumber(gas).lt(gasAmount)){
                    if(display)display.append("<br/>- Insufficient Gas("+functionName+") at least " + gasAmount + " gas");
                }else{
                    if(display)display.append("<br/><h3 style='color:red'>Check Metamask to approve</h3>");
                    f.send({
                        from: acctAddress, //account.address,
                        gasPrice: '3000000000', // 3 Gwei
                        gas: new BigNumber(gasAmount).times(1.2).dp(0).toFixed(),
                        value: ether,
                    }).then(function(r){
                        if(contractUtils.debug)console.log("Success("+functionName+"):",r);
                        if(display)display.append("<br/>- Success Processing("+functionName+")<br/>Transaction:"+r.transactionHash+",<br/>Block Number:" + r.blockNumber + "<br/>Gas Used:"+r.gasUsed);
                    }).catch(function(error){
                        if(display)display.append("<br/>- Error Processing("+functionName+"):" + error);
                    });
                }
            }
           // web3js.eth.accounts.wallet.remove(account.address);
        })
        .catch(function(error){
            if(display)display.append("<br/>- Error Estimate Processing("+functionName+"):" + error); 
            //web3js.eth.accounts.wallet.remove(account.address);
        });
    },
    getContractVal:function (pkey, contractObj, functionName,...params){
        let acctAddress = web3.eth.defaultAccount;
        //let account = web3js.eth.accounts.wallet.add(pkey);
        let contract = new web3js.eth.Contract(contractObj.abi, $('#txtgctaddress').val());
        contract.options.from = acctAddress;// account.address;

        if(params.length===1 && !params[0])params = [];        
        let callF = "contract.methods."+functionName+"("+(params.length>0?"params":"")+")";
        if(contractUtils.debug)console.log("Call Get : ", callF, "=> ", params);
        let f = eval(callF);
        if(params.length>0) f.arguments = params;

        let result = f.call();
        //web3js.eth.accounts.wallet.remove(account.address);
        return result;
    },
    getVal: function(pkey, contractObj, name,display,param,decimals){
        display.html("Loading...");
        contractUtils.getContractVal(pkey,contractObj,name, param).then(function(r){            
            if(display){
                if(decimals){                    
                    r = new BigNumber(r).div(decimals);
                }
                display.html(r + "");
            }
        }).catch(function (e){
            console.log("Get Val("+name+"):", e);
            if(display){
                display.html(e);
            }
        });
    },
    getArrayVal: async function(pkey, contractObj, name,display,numEle,decimals){
        display.html("Loading...");
        let str = "<ol>";
        for(let i=0; i < numEle;i++){
            await contractUtils.getContractVal(pkey,contractObj,name,i+"").then(function(r){
                if(display){
                    if(decimals){
                        r = new BigNumber(r).div(decimals);
                    }
                    str += "<li>" + r + "</li>";
                }
            }).catch(function (e){
                console.log("Get Val("+name+"):", e);
                if(display){
                    str += "<li>" + e + "</li>";
                }
            });
        }
        str += "</ol>";
        display.html(str);
    },
    sendValue: function(functionName, obj, estimateOnly = false,contractObj=GCToken){
        let param = [];
        let pObj = $(obj).parents('.operation');
        let arr = pObj.find("input[name='param']").each(function(index,elm){
            param.push($(elm).val());
        });
        let gas = "";// pObj.find("input[name='gas']").val();
        let gasprice = "";// convertToWei($('#gasprice').val(),'9');
        let display = pObj.find("span[name='result']");
        let ether = pObj.find("input[name='ether']").val();

        display.html("");
        contractUtils.setContractVal(getPrivateKey(),contractObj,gas,gasprice,estimateOnly,ether,functionName,display,param);
    },
};