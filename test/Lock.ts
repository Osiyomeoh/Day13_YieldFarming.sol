import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre from "hardhat";

describe("YieldFarming", function () {
  async function deployYieldFarmingFixture() {
    const [owner, user1, user2] = await hre.ethers.getSigners();
    const initialSupply = hre.ethers.parseEther("1000000");

    const StakingToken = await hre.ethers.getContractFactory("StakingToken");
    const stakingToken = await StakingToken.deploy(initialSupply);

    const RewardToken = await hre.ethers.getContractFactory("RewardToken");
    const rewardToken = await RewardToken.deploy(initialSupply);

    const YieldFarming = await hre.ethers.getContractFactory("YieldFarming");
    const yieldFarming = await YieldFarming.deploy(stakingToken.target, rewardToken.target);

    const INITIAL_SUPPLY = hre.ethers.parseEther("1000000");
    const STAKE_AMOUNT = hre.ethers.parseEther("100");
    const REWARD_AMOUNT = hre.ethers.parseEther("1000");

    await stakingToken.mint(user1.address, INITIAL_SUPPLY);
    await rewardToken.mint(owner.address, INITIAL_SUPPLY);

    await stakingToken.connect(user1).approve(yieldFarming.target, INITIAL_SUPPLY);
    await rewardToken.connect(owner).approve(yieldFarming.target, INITIAL_SUPPLY);

    return { yieldFarming, stakingToken, rewardToken, owner, user1, user2, STAKE_AMOUNT, REWARD_AMOUNT };
  }

  describe("Deployment", function () {
    it("Should set the right staking and reward tokens", async function () {
      const { yieldFarming, stakingToken, rewardToken } = await loadFixture(deployYieldFarmingFixture);

      expect(await yieldFarming.stakingToken()).to.equal(stakingToken.target);
      expect(await yieldFarming.rewardToken()).to.equal(rewardToken.target);
    });

    it("Should set the right owner", async function () {
      const { yieldFarming, owner } = await loadFixture(deployYieldFarmingFixture);

      expect(await yieldFarming.owner()).to.equal(owner.address);
    });
  });

  describe("Staking", function () {
    it("Should allow users to stake tokens", async function () {
      const { yieldFarming, user1, STAKE_AMOUNT } = await loadFixture(deployYieldFarmingFixture);

      await expect(yieldFarming.connect(user1).stake(STAKE_AMOUNT))
        .to.emit(yieldFarming, "Staked")
        .withArgs(user1.address, STAKE_AMOUNT);

      const stake = await yieldFarming.stakers(user1.address);
      expect(stake.amount).to.equal(STAKE_AMOUNT);
    });

    it("Should update total staked amount", async function () {
      const { yieldFarming, user1, STAKE_AMOUNT } = await loadFixture(deployYieldFarmingFixture);

      await yieldFarming.connect(user1).stake(STAKE_AMOUNT);
      expect(await yieldFarming.totalStaked()).to.equal(STAKE_AMOUNT);
    });

    it("Should fail if staking zero tokens", async function () {
      const { yieldFarming, user1 } = await loadFixture(deployYieldFarmingFixture);

      await expect(yieldFarming.connect(user1).stake(0)).to.be.revertedWith("Amount must be greater than 0");
    });
  });

  describe("Withdrawals", function () {
    it("Should allow users to withdraw staked tokens", async function () {
      const { yieldFarming, user1, STAKE_AMOUNT } = await loadFixture(deployYieldFarmingFixture);

      await yieldFarming.connect(user1).stake(STAKE_AMOUNT);
      await expect(yieldFarming.connect(user1).withdraw(STAKE_AMOUNT))
        .to.emit(yieldFarming, "Withdrawn")
        .withArgs(user1.address, STAKE_AMOUNT);

      const stake = await yieldFarming.stakers(user1.address);
      expect(stake.amount).to.equal(0);
    });

    it("Should fail if withdrawing more than staked", async function () {
      const { yieldFarming, user1, STAKE_AMOUNT } = await loadFixture(deployYieldFarmingFixture);

      await yieldFarming.connect(user1).stake(STAKE_AMOUNT);
      await expect(yieldFarming.connect(user1).withdraw(STAKE_AMOUNT + 1n))
        .to.be.revertedWith("Insufficient staked amount");
    });

    it("Should fail if withdrawing zero tokens", async function () {
      const { yieldFarming, user1 } = await loadFixture(deployYieldFarmingFixture);

      await expect(yieldFarming.connect(user1).withdraw(0)).to.be.revertedWith("Amount must be greater than 0");
    });
  });

  describe("Rewards", function () {
    it("Should allow owner to add rewards", async function () {
      const { yieldFarming, owner, REWARD_AMOUNT } = await loadFixture(deployYieldFarmingFixture);

      await yieldFarming.connect(owner).addRewards(REWARD_AMOUNT);
      expect(await yieldFarming.totalRewards()).to.equal(REWARD_AMOUNT);
    });

    it("Should not allow non-owners to add rewards", async function () {
      const { yieldFarming, user1, REWARD_AMOUNT } = await loadFixture(deployYieldFarmingFixture);

      await expect(yieldFarming.connect(user1).addRewards(REWARD_AMOUNT))
        .to.be.revertedWith("Only owner can add rewards");
    });

    // it("Should calculate pending rewards correctly", async function () {
    //   const { yieldFarming, owner, user1, STAKE_AMOUNT, REWARD_AMOUNT } = await loadFixture(deployYieldFarmingFixture);

    //   await yieldFarming.connect(user1).stake(STAKE_AMOUNT);
    //   await yieldFarming.connect(owner).addRewards(REWARD_AMOUNT);

    //   const pendingRewards = await yieldFarming.pendingRewards(user1.address);
    //   expect(pendingRewards).to.equal(REWARD_AMOUNT);
    // });

    // it("Should allow users to claim rewards", async function () {
    //   const { yieldFarming, rewardToken, owner, user1, STAKE_AMOUNT, REWARD_AMOUNT } = await loadFixture(deployYieldFarmingFixture);

    //   await yieldFarming.connect(user1).stake(STAKE_AMOUNT);
    //   await yieldFarming.connect(owner).addRewards(REWARD_AMOUNT);

    //   await expect(yieldFarming.connect(user1).claimRewards())
    //     .to.emit(yieldFarming, "RewardsClaimed")
    //     .withArgs(user1.address, REWARD_AMOUNT);

    //   expect(await rewardToken.balanceOf(user1.address)).to.equal(REWARD_AMOUNT);
    // });

    it("Should not allow claiming when no rewards are available", async function () {
      const { yieldFarming, user1 } = await loadFixture(deployYieldFarmingFixture);

      await expect(yieldFarming.connect(user1).claimRewards()).to.be.revertedWith("No rewards to claim");
    });
  });
});