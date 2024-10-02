// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract YieldFarming {
    using SafeERC20 for IERC20;

    IERC20 public stakingToken;
    IERC20 public rewardToken;
    address public owner;
    uint256 public totalStaked;
    uint256 public totalRewards;
    uint256 public rewardsPerToken;

    struct Stake {
        uint256 amount;
        uint256 rewardDebt;
    }

    mapping(address => Stake) public stakers;
    
    // Events
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);

    constructor(address _stakingToken, address _rewardToken) {
        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardToken);
        owner = msg.sender;
    }

    // Stake tokens
    function stake(uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than 0");
        updateRewards(msg.sender);
        totalStaked += _amount;
        stakers[msg.sender].amount += _amount;
        stakingToken.safeTransferFrom(msg.sender, address(this), _amount);
        emit Staked(msg.sender, _amount);
    }

    // Withdraw staked tokens
    function withdraw(uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than 0");
        require(stakers[msg.sender].amount >= _amount, "Insufficient staked amount");
        updateRewards(msg.sender);
        totalStaked -= _amount;
        stakers[msg.sender].amount -= _amount;
        stakingToken.safeTransfer(msg.sender, _amount);
        emit Withdrawn(msg.sender, _amount);
    }

    // Claim rewards
    function claimRewards() external {
        uint256 rewards = calculateRewards(msg.sender);
        require(rewards > 0, "No rewards to claim");
        stakers[msg.sender].rewardDebt = stakers[msg.sender].amount * rewardsPerToken;
        totalRewards -= rewards;
        rewardToken.safeTransfer(msg.sender, rewards);
        emit RewardsClaimed(msg.sender, rewards);
    }

    // Calculate pending rewards
    function pendingRewards(address _user) public view returns (uint256) {
        uint256 stakedAmount = stakers[_user].amount;
        return (stakedAmount * rewardsPerToken) - stakers[_user].rewardDebt;
    }

    // Update rewards for a user
    function updateRewards(address _user) internal {
        if (totalStaked > 0) {
            rewardsPerToken = totalRewards / totalStaked;
        }
        if (stakers[_user].amount > 0) {
            uint256 pending = pendingRewards(_user);
            stakers[_user].rewardDebt = stakers[_user].amount * rewardsPerToken;
            totalRewards += pending;
        }
    }

    // Add rewards (only owner)
    function addRewards(uint256 _amount) external {
        require(msg.sender == owner, "Only owner can add rewards");
        rewardToken.safeTransferFrom(msg.sender, address(this), _amount);
        totalRewards += _amount;
    }

    // Calculate rewards for a user
    function calculateRewards(address user) public view returns (uint256) {
        // ... calculation logic
    }
}