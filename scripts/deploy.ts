// scripts/deploy.ts
import { ethers } from "hardhat";
import { ReverseDutchAuctionSwap, MockERC20 } from "../typechain-types";

async function main() {
  // Deploy Mock Tokens first
  const MockToken = await ethers.getContractFactory("MockERC20");
  
  console.log("Deploying Mock Tokens...");
  const sellToken = await MockToken.deploy("Sell Token", "SELL") as MockERC20;
  await sellToken.waitForDeployment();
  console.log("Sell Token deployed to:", sellToken.target);

  const buyToken = await MockToken.deploy("Buy Token", "BUY") as MockERC20;
  await buyToken.waitForDeployment();
  console.log("Buy Token deployed to:", buyToken.target);

  const ReverseDutchAuction = await ethers.getContractFactory("ReverseDutchAuctionSwap");
  console.log("Deploying Reverse Dutch Auction...");
  const auction = await ReverseDutchAuction.deploy() as ReverseDutchAuctionSwap;
  await auction.waitForDeployment();
  console.log("Auction deployed to:", auction.target);

  const addresses = {
    sellToken: sellToken.target,
    buyToken: buyToken.target,
    auction: auction.target
  };

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

