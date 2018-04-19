javascript/web3/node

NOTE:  this was developed with Solidity 0.4.8.  it should still work with later versions.

### to start
from project root: 
`npm install`

then:
`node index2.js`

runs on localhost, port 3000

### files:

`index2.js` - the main application  
`erc20.js` - ABI file for ERC20 tokens.  Used for getSupply call.   
`package.json` - needed packages -- run `npm install` in project root  
`contract.sol` - a single line version of the required contracts to deploy with `/post`.  Cut and paste this into 
a REST testing client data payload (ARC is a good tool.  Easy to use Chrome extension)


`/api/v1/post` - POST - deploy a signed contract   
PARAMS: a private key (`pk`) and a text Solidity contract (`contract`)

`/api/v1/getSupply` - GET - returns the supply of an ERC20 token   
PARAMS: ERC20 address string (`address`).  defaults to an ERC20 token if none is provided.

`/api/v1/getBalance` - GET - returns the balance of an account   
PARAMS: account address string (`address`).  no default provided.

see source files for more comments

