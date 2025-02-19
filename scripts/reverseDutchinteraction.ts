// scripts/interact.ts
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomiclabs/hardhat-ethers/signers";
import { ReverseDutchAuctionSwap, MockERC20 } from "../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

interface AuctionConfig {
  sellTokenAmount: string;
  initialPrice: string;
  decreaseRate: string;
  duration: number;
}

async function setupAuction(
  seller: HardhatEthersSigner,
  buyer: HardhatEthersSigner,
  auction: ReverseDutchAuctionSwap,
  sellToken: MockERC20,
  buyToken: MockERC20,
  config: AuctionConfig
) {
  const sellAmount = ethers.parseEther(config.sellTokenAmount);
  const buyAmount = ethers.parseEther(config.initialPrice);

  // Mint tokens to seller and buyer
  await sellToken.mint(seller.address, sellAmount);
  await buyToken.mint(buyer.address, buyAmount);

  // Approve auction contract
  await sellToken.connect(seller).approve(auction.target, sellAmount);
  await buyToken.connect(buyer).approve(auction.target, buyAmount);

  // Initiate swap
  await auction.connect(seller).initiateSwap(
    sellToken.target,
    buyToken.target,
    sellAmount,
    ethers.parseEther(config.initialPrice),
    ethers.parseEther(config.decreaseRate),
    config.duration
  );

  return 1; // First swap ID
}

async function monitorPrice(
  auction: ReverseDutchAuctionSwap,
  swapId: number,
  intervals: number[]
) {
  console.log("\nMonitoring price changes...");
  
  for (const seconds of intervals) {
    await time.increase(seconds);
    
    try {
      const price = await auction.getCurrentSwapPrice(swapId);
      console.log(`Price after ${seconds} seconds: ${ethers.formatEther(price)} tokens`);
    } catch (error) {
      console.log(`Price check failed after ${seconds} seconds - auction might have ended`);
      break;
    }
  }
}

async function executeSwap(
  auction: ReverseDutchAuctionSwap,
  swapId: number,
  buyer: any
) {
  console.log("\nExecuting swap...");
  
  try {
    const tx = await auction.connect(buyer).buySwap(swapId);
    await tx.wait();
    console.log("Swap executed successfully!");
  } catch (error) {
    console.log("Swap execution failed:", error);
  }
}

async function main() {
  const [deployer, seller, buyer] = await ethers.getSigners();
  
  const auction = await ethers.getContractAt("ReverseDutchAuctionSwap", '0x467A6BB7bD3ea225f534a04F5467fE5Eb5517da9') as ReverseDutchAuctionSwap;
  const sellToken = await ethers.getContractAt("MockERC20", '0xf03D8733a89aE1BC6301A0fdaE6E0215f0f240a9') as MockERC20;
  const buyToken = await ethers.getContractAt("MockERC20", '0x211B1f7ca59D06ca89198540E753f0779A88EC9C') as MockERC20;

  // Configure auction parameters
  const auctionConfig: AuctionConfig = {
    sellTokenAmount: "100",     // 100 tokens to sell
    initialPrice: "200",        // Starting price of 200 tokens
    decreaseRate: "0.1",        // Price decreases by 0.1 tokens per second
    duration: 3600              // 1 hour auction
  };

  // Setup auction
  console.log("Setting up auction...");
  const swapId = await setupAuction(
    seller,
    buyer,
    auction,
    sellToken,
    buyToken,
    auctionConfig
  );

  // Monitor price at different intervals (0, 300, 600, 900 seconds)
  await monitorPrice(auction, swapId, [0, 300, 600, 900]);

  // Execute swap after price has decreased
  await executeSwap(auction, swapId, buyer);

  // Check final balances
  const sellerBuyBalance = await buyToken.balanceOf(seller.address);
  const buyerSellBalance = await sellToken.balanceOf(buyer.address);

  console.log("\nFinal balances:");
  console.log(`Seller's buy token balance: ${ethers.formatEther(sellerBuyBalance)}`);
  console.log(`Buyer's sell token balance: ${ethers.formatEther(buyerSellBalance)}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });