const HDWalletProvider = require("@truffle/hdwallet-provider");
const { Web3 } = require("web3");
const compiledFactory = require("./ethereum/build/CampaignFactory.json");

require("dotenv").config({ override: true });

const mnemonic = process.env.MNEMONIC;
const rpcUrl = process.env.INFURA_URL;

//error debug
if (!mnemonic) {
  throw new Error(
    "Missing MNEMONIC in environment. Add it to .env or set it before running deploy."
  );
}

if (!rpcUrl) {
  throw new Error(
    "Missing INFURA_URL in environment. Add it to .env or set it before running deploy."
  );
}

if (!/^https?:\/\//i.test(rpcUrl)) {
  throw new Error(
    "make sure your infura url format is correct and has http prefix"
  );
}

const provider = new HDWalletProvider({
  mnemonic: { phrase: mnemonic },
  providerOrUrl: rpcUrl,
});
provider.engine.on("error", (err) => {
  console.error("ProviderEngine error detail:", err);
});
const web3 = new Web3(provider);

const deploy = async () => {
  const accounts = await web3.eth.getAccounts();

  console.log("Attempting to deploy from account", accounts[0]);

  const result = await new web3.eth.Contract(compiledFactory.abi)
    .deploy({ data: compiledFactory.evm.bytecode.object })
    .send({ gas: "1400000", from: accounts[0] });
    //event listener to tell what could be breaking-status showed success!
  // const contract = new web3.eth.Contract(compiledFactory.abi);

  // const promi = contract
  //   .deploy({ data: compiledFactory.evm.bytecode.object })
  //   .send({ gas: "1400000", from: accounts[0] });

  // promi.on("transactionHash", (hash) => console.log("Tx hash:", hash));
  // promi.on("receipt", (receipt) =>
  //   console.log("Mined in block:", receipt.blockNumber)
  // );
  // promi.on("error", (err) => console.error("Send error:", err));

  // const result = await promi;

  console.log("Contract deployed to", result.options.address);
  provider.engine.stop();
};
deploy();
