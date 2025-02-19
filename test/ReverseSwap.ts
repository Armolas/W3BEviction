const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("ReverseDutchAuctionSwap", function () {
  const INITIAL_SUPPLY = ethers.parseEther("1000000");
  const AMOUNT = ethers.parseEther("100");
  const INITIAL_PRICE = ethers.parseEther("200");
  const DECREASE_RATE = ethers.parseEther("0.1"); // 0.1 tokens per second
  const DURATION = 3600; 
  async function deployFixture() {
    const [owner, seller, buyer, addr3] = await ethers.getSigners();

    const MockToken = await ethers.getContractFactory("MockERC20");
    const sellToken = await MockToken.deploy("Sell Token", "SELL");
    const buyToken = await MockToken.deploy("Buy Token", "BUY");

    const ReverseDutchAuctionSwap = await ethers.getContractFactory("ReverseDutchAuctionSwap");
    const auctionSwap = await ReverseDutchAuctionSwap.deploy();

    await sellToken.mint(seller.address, INITIAL_SUPPLY);
    await buyToken.mint(buyer.address, INITIAL_SUPPLY);


    await sellToken.connect(seller).approve(auctionSwap.target, INITIAL_SUPPLY);
    await buyToken.connect(buyer).approve(auctionSwap.target, INITIAL_SUPPLY);

    return { 
      auctionSwap, 
      sellToken, 
      buyToken, 
      owner, 
      seller, 
      buyer, 
      addr3 
    };
  }

  describe("Price Decrease Functionality", function () {
    it("should decrease price correctly over time", async function () {
      const { auctionSwap, sellToken, buyToken, seller } = await loadFixture(deployFixture);
      
      console.log(sellToken.target)
      await auctionSwap.connect(seller).initiateSwap(
        sellToken.target,
        buyToken.target,
        AMOUNT,
        INITIAL_PRICE,
        DECREASE_RATE,
        DURATION
      );

      const initialPrice = await auctionSwap.getCurrentSwapPrice(1);
      expect(initialPrice).to.equal(INITIAL_PRICE);

      // Advance time by 100 seconds
      await time.increase(100);

      const expectedPrice = INITIAL_PRICE - (
        DECREASE_RATE  * (ethers.parseUnits("1", 2)) / (ethers.parseUnits("1", 18))
      );
      const currentPrice = await auctionSwap.getCurrentSwapPrice(1);
      expect(currentPrice).to.equal(expectedPrice);
    });

    it("should revert if auction has ended", async function () {
      const { auctionSwap, sellToken, buyToken, seller } = await loadFixture(deployFixture);

      await auctionSwap.connect(seller).initiateSwap(
        sellToken.target,
        buyToken.target,
        AMOUNT,
        INITIAL_PRICE,
        DECREASE_RATE,
        DURATION
      );

      // Advance time beyond duration
      await time.increase(DURATION + 1);

      await expect(
        auctionSwap.getCurrentSwapPrice(1)
      ).to.be.revertedWithCustomError(auctionSwap, "swapEnded");
    });
    });

  describe("Single Buyer Restriction", function () {
    it("should allow only one buyer per auction", async function () {
      const { auctionSwap, sellToken, buyToken, seller, buyer, addr3 } = await loadFixture(deployFixture);

      await auctionSwap.connect(seller).initiateSwap(
        sellToken.target,
        buyToken.target,
        AMOUNT,
        INITIAL_PRICE,
        DECREASE_RATE,
        DURATION
      );

      // First buyer succeeds
      await auctionSwap.connect(buyer).buySwap(1);

      // Second buyer should fail
      await expect(
        auctionSwap.connect(addr3).buySwap(1)
      ).to.be.revertedWithCustomError(auctionSwap, "swapEnded");
    });
  });

  describe("Token Swap Functionality", function () {
    it("should correctly swap tokens between buyer and seller", async function () {
      const { auctionSwap, sellToken, buyToken, seller, buyer } = await loadFixture(deployFixture);

      await auctionSwap.connect(seller).initiateSwap(
        sellToken.target,
        buyToken.target,
        AMOUNT,
        INITIAL_PRICE,
        DECREASE_RATE,
        DURATION
      );

      const sellerInitialSellBalance = await sellToken.balanceOf(seller.address);
      const buyerInitialBuyBalance = await buyToken.balanceOf(buyer.address);

      await auctionSwap.connect(buyer).buySwap(1);

      // Verify seller received buy tokens
      const currentPrice = INITIAL_PRICE; // Assuming immediate purchase
      expect(await buyToken.balanceOf(seller.address)).to.equal(currentPrice);

      // Verify buyer received sell tokens
      expect(await sellToken.balanceOf(buyer.address)).to.equal(AMOUNT);

      // Verify seller's sell tokens decreased
      expect(await sellToken.balanceOf(seller.address)).to.equal(
        sellerInitialSellBalance - (AMOUNT)
      );

      // Verify buyer's buy tokens decreased
      expect(await buyToken.balanceOf(buyer.address)).to.equal(
        buyerInitialBuyBalance - (currentPrice)
      );
    });
  });

  describe("Edge Cases", function () {
    it("should handle no buyer before auction ends", async function () {
      const { auctionSwap, sellToken, buyToken, seller, buyer } = await loadFixture(deployFixture);

      await auctionSwap.connect(seller).initiateSwap(
        sellToken.target,
        buyToken.target,
        AMOUNT,
        INITIAL_PRICE,
        DECREASE_RATE,
        DURATION
      );

      // Advance time past duration
      await time.increase(DURATION + 1);

      // Attempt to buy should fail
      await expect(
        auctionSwap.connect(buyer).buySwap(1)
      ).to.be.revertedWithCustomError(auctionSwap, "swapEnded");
    });

    it("should revert if buyer has insufficient funds", async function () {
      const { auctionSwap, sellToken, buyToken, seller, buyer, addr3 } = await loadFixture(deployFixture);

      await auctionSwap.connect(seller).initiateSwap(
        sellToken.target,
        buyToken.target,
        AMOUNT,
        INITIAL_PRICE,
        DECREASE_RATE,
        DURATION
      );
      await buyToken.connect(buyer).transfer(addr3.address, INITIAL_SUPPLY);

      await expect(
        auctionSwap.connect(buyer).buySwap(1)
      ).to.be.revertedWithCustomError(auctionSwap, "insufficientFunds");
    });

    it("should revert if seller has insufficient tokens", async function () {
      const { auctionSwap, sellToken, buyToken, seller, buyer, addr3 } = await loadFixture(deployFixture);

      await auctionSwap.connect(seller).initiateSwap(
        sellToken.target,
        buyToken.target,
        AMOUNT,
        INITIAL_PRICE,
        DECREASE_RATE,
        DURATION
      );

      await sellToken.connect(seller).transfer(addr3.address, INITIAL_SUPPLY);

      await expect(
        auctionSwap.connect(buyer).buySwap(1)
      ).to.be.revertedWithCustomError(auctionSwap, "swapFailed");
    });
  });
});