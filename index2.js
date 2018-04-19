const express = require('express');
const app = express();
const solc = require('solc');
const Tx = require('ethereumjs-tx');


var bodyParser = require('body-parser');
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));

var Web3 = require('web3');
var erc20 = require('./erc20');

/* with this prefix, assumption is made that all responses are in JSON */
const pfx = "/api/v1";

/* declare the networks to use */
const testNet = "https://kovan.infura.io/NE4uxmvJ4w8YJnkRVKyf";
const mainNet = "https://rinkeby.infura.io/CuYY8YS1KLElUre64VDX";
const otherNet = "https://kovan.infura.io/k7Ia1ut0QEiHPVXo3JhW";

/* connect to kovan and main networks */
var testEVM = new Web3(new Web3.providers.HttpProvider(testNet));
var mainEVM = new Web3(mainNet);
var otherEVM = new Web3(new Web3.providers.HttpProvider(otherNet));

/* uses the mainnet to get the balance on an address
 * pass in 'address' and the address on the query string
 */
app.get(pfx + '/getBalance', function (req, res) {
    var address = req.query.address;
    if(!address) {
        res.status(400).json({"error": "missing a valid Ethereum account address"});
        console.log("400 - missing account address");
        return;
    }
    try {
        mainEVM.eth.getBalance(address, function(error, balance) {
            if (!error) {
                console.log("address: " + address);
                console.log("balance: " + balance);
                res.status(200).json({'balance': balance});
            }
        });
    } catch (err) {
        res.status(500).json({"error": err});
        console.log("oops, we had an error: " + err)
    }
});

/* uses the mainnet to get the supply of an ERC20 token
 * takes an address on the query string with a valid address,or
 * defaults to the ERC20 address provided in the assessment if no
 * address is provided.
 *
 * NOTE:  doesn't validate the address string, so if you don't get
 * a valid one in there, it'll crater.
* */
app.get(pfx + '/getSupply', function (req, res) {

    var erc20Address = req.query.address;
    // set up the default token if one isn't provided
    if(!erc20Address) {
        erc20Address = "0x35a9b440da4410dd63df8c54672b728970560328";
    }

    var tokenContract = new mainEVM.eth.Contract(erc20.erc20Abi, erc20Address);

    try {
        tokenContract.methods.totalSupply().call( function(error, supply) {
            if(!supply) {
                supply = "address not set up as ERC20 token";
            }
            res.status(200).json({"total-supply": supply});
            console.log("total supply: " + supply);
        });

    } catch (err) {
        res.status(500).json({"error": err});
        console.log("oops, we had an error: " + err)
    }

});

/* uses kovan test net to upload a contract and return a txid
*
*  the contract file itself is a string in a POST data element 'contract'
*  the private key is sent over as a string in the element 'pk'
*
* */
app.post(pfx + '/post', function (req, res) {

    var result = [];
    var count = 0;

    if((!req.body.contract)||(!req.body.pk)) {
        console.log("missing data elements");
        res.status(400).json({"error":"missing data elements"});
    }

    // get the contract from the request
    var contract_str = req.body.contract;
    var pk_str = "0x" + req.body.pk;

    // buffered version of pk
    var privateKey = Buffer.from(req.body.pk,'hex');

    // web3.js 1.x - generate the address from the pk
    // works properly
    var account = testEVM.eth.accounts.privateKeyToAccount(pk_str);
    var address = account.address;

    otherEVM.eth.defaultAccount = address;

    console.log("generated addr: " + address);
    console.log("contract: " + contract_str);

    // compile the contract
    var output = solc.compile(contract_str, 1);

    // for each contract, sign it and deploy the contract
    for (var contractName in output.contracts) {
        count++;
        var bc = output.contracts[contractName].bytecode;
        var abi = JSON.parse(output.contracts[contractName].interface);
        console.log("abi:" + JSON.stringify(abi));
        console.log("contract name: " + contractName);
        var ccontract = new otherEVM.eth.Contract(abi);
        var nonce = otherEVM.eth.getTransactionCount(address) + 100000;
        var rawTx = {
            "nonce" : nonce,
            "from": address,
            "gas": 200000,
            "data": '0x' + bc
        };

        var tx = new Tx(rawTx);

        // sign the transaction with the private key
        tx.sign(privateKey);

        var serializedTx = '0x'+tx.serialize().toString('hex');
        otherEVM.eth.sendSignedTransaction(serializedTx, function(err, txHash){
            console.log("txHash: " + txHash);
            console.log("error: " + err);
            if(txHash) {
                r = {"txHash": txHash};
                result.push(r);
            }
            if(err) {
                r = {"error": err};
                result.push(r);
            }
            count--;
            if (count == 0) {
                res.status(200).json({"result": result});
            };
        });
        console.log("contract deployed");
    };

});


app.listen(3000,'0.0.0.0', () => console.log('app listening on port 3000!'));



