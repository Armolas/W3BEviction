import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
require('dotenv').config();

const { SEPOLIA_ALCHEMY_API_KEY, PRIVATE_KEY, ETHERSCAN_API_KEY, BASE_SEPOLIA_RPC_URL} = process.env;
const config: HardhatUserConfig = {
  solidity: "0.8.28",

  networks: {
    sepolia: {
      url: SEPOLIA_ALCHEMY_API_KEY,
      accounts: [`0x${PRIVATE_KEY}`],
    },
    base_sepolia: {
      url: BASE_SEPOLIA_RPC_URL,
      accounts: [`0x${PRIVATE_KEY}`],
    }
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  }
};

export default config;
