const express = require('express');
const app = express();
const solc = require('solc');
const Tx = require('ethereumjs-tx');


var bodyParser = require('body-parser');
app.use(bodyParser.json());       // to support JSON-encoded bodies
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

var cnt = 13;

/* connect to kovan and main networks */
var testEVM = new Web3(new Web3.providers.HttpProvider(testNet));
var mainEVM = new Web3(mainNet);
var otherEVM = new Web3(new Web3.providers.HttpProvider(otherNet));

/* uses the mainnet to get the balance on an address
 * pass in 'address' and the address on the query string
 */
app.get(pfx + '/getBalance', function (req, res) {
    var address = req.query.address;
    if (!address) {
        res.status(400).json({"error": "missing a valid Ethereum account address"});
        console.log("400 - missing account address");
        return;
    }
    try {
        var contractAddr = ('0x23964e7bda04c0e05fc448a00a3c8e21b2635416');
        var addr = address;
        var tknAddress = (addr).substring(2);
        var contractData = ('0x70a08231000000000000000000000000' + tknAddress);

        mainEVM.eth.call({
            to: contractAddr, // Contract address, used call the token balance of the address in question
            data: contractData // Combination of contractData and tknAddress, required to call the balance of an address
        }, function (err, result) {
            if (result) {
                var tokens = mainEVM.utils.toBN(result).toString(); // Convert the result to a usable number string
                res.status(200).json({'balance': tokens});
                console.log('Tokens Owned: ' + tokens); // Change the string to be in Ether not Wei, and show it in the console
            }
            else {
                console.log(err); // Dump errors here
            }
        });

        // mainEVM.eth.getBalance(address, function(error, balance) {
        //     if (!error) {
        //         console.log("address: " + address);
        //         console.log("balance: " + balance);
        //         res.status(200).json({'balance':Web3.utils.fromWei(String(balance), "ether")});
        //     }
        // });
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
    if (!erc20Address) {
        erc20Address = "0x35a9b440da4410dd63df8c54672b728970560328";
    }

    var tokenContract = new mainEVM.eth.Contract(erc20.erc20Abi, erc20Address);

    try {
        tokenContract.methods.totalSupply().call(function (error, supply) {
            if (!supply) {
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

    // var result = [];
    // var count = 0;

    if ((!req.body.amount)) {
        console.log("missing data elements");
        res.status(400).json({"error": "missing data elements"});
    }

    console.log(req.body.amount);

    mainEVM.eth.getTransactionCount("0x44a25D7C779bCA44CD20B9A7698a2C4eC406c5Ab", function (error, data) {

            if (data) {

                console.log('NONCE');
                console.log(data);
                var non = data + 1000;
                console.log(non);
                var raw = {
                    "nonce": '0x' + non,
                    "gasPrice": "0x09502f9000",
                    "gasLimit": "0x6acfc0",
                    "to": "0x23964e7bda04c0e05fc448a00a3c8e21b2635416",
                    "value": "0x0" + req.body.amount,
                    "data": "0xa9059cbb00000000000000000000000005ec249229a744cf344fff9a2eec56ab17c1246600000000000000000000000000000000000000000000000000000000000000" + req.body.amount,
                    "chainId": 4
                };

                console.log(1);

                var privateKey = Buffer.from("a91a59bcb66ed8a1019d3c5022a69b8f020e5f5c6bef501f2c5f7e5fea4a374a", 'hex');
                console.log(2);
                var tx = new Tx(raw);
                tx.sign(privateKey);
                console.log(3);
                var serializedTx = '0x' + tx.serialize().toString('hex');
                console.log(4);
                mainEVM.eth.sendSignedTransaction(serializedTx, function (error, data) {
                    console.log(5);
                    if (data) {
                        res.status(200).json({"tx": data});
                    } else {
                        console.log(error);
                        res.status(500).json({"error": error});
                    }


                });
            } else {
                res.status(500).json({"error": error});
            }
        }
    );
});

app.listen(8080, '0.0.0.0', () => console.log('app listening on port 8080!')
)
;



