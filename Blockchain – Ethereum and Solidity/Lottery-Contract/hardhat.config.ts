import { defineConfig } from "hardhat/config";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";

export default defineConfig({
  plugins: [hardhatToolboxMochaEthers],
  solidity: "0.8.27",
  networks: {
    localhost: {
      type: "http",
      url: "http://127.0.0.1:8545"
    }
  }
});