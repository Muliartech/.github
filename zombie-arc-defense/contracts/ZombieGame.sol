// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

interface IZombieCoin {
    function mint(address to, uint256 amount) external;
}

interface IZombieHero {
    function balanceOf(address owner) external view returns (uint256);
}

/**
 * @title ZombieGame
 * @notice On-chain glue between the front-end game and the reward token.
 *
 *  Flow:
 *   1. Player must own at least 1 ZombieHero NFT to start a run.
 *   2. Player calls startRun() -> emits a runId on chain.
 *   3. Player plays the JS game in the browser. When they finish, the
 *      backend signer (a wallet you control) signs the (player, runId, score).
 *   4. Player calls claimRewards(runId, score, signature) and the contract
 *      mints them ZMB tokens proportional to score.
 *
 *  This pattern keeps gameplay off-chain (fast and free for players) while
 *  the reward issuance stays trustlessly on-chain.
 */
contract ZombieGame is Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    IZombieCoin public immutable coin;
    IZombieHero public immutable hero;

    /// Off-chain signer that authorises score claims.
    address public scoreSigner;

    /// ZMB minted per score point. Default: 1e16 = 0.01 ZMB per point.
    uint256 public rewardPerPoint = 1e16;

    /// Cap per single run, prevents runaway minting if signer is leaked.
    uint256 public maxRewardPerRun = 1000e18; // 1000 ZMB

    /// runId -> claimed flag. Prevents replay.
    mapping(bytes32 => bool) public runClaimed;

    /// player -> last runId issued (informational).
    mapping(address => bytes32) public lastRun;

    event RunStarted(address indexed player, bytes32 indexed runId, uint256 timestamp);
    event RewardsClaimed(address indexed player, bytes32 indexed runId, uint256 score, uint256 amount);
    event SignerUpdated(address indexed signer);
    event RewardConfigUpdated(uint256 rewardPerPoint, uint256 maxRewardPerRun);

    constructor(address initialOwner, address coin_, address hero_, address signer_)
        Ownable(initialOwner)
    {
        require(coin_ != address(0) && hero_ != address(0) && signer_ != address(0), "zero addr");
        coin = IZombieCoin(coin_);
        hero = IZombieHero(hero_);
        scoreSigner = signer_;
    }

    // -------- Run lifecycle --------

    /// Begin a new run. Returns the runId for the front-end to track.
    function startRun() external returns (bytes32 runId) {
        require(hero.balanceOf(msg.sender) > 0, "no hero NFT");
        runId = keccak256(abi.encodePacked(msg.sender, block.timestamp, block.prevrandao));
        lastRun[msg.sender] = runId;
        emit RunStarted(msg.sender, runId, block.timestamp);
    }

    /// Claim rewards for a finished run. The signature must be produced by
    /// `scoreSigner` over keccak256(player, runId, score, address(this), chainId).
    function claimRewards(bytes32 runId, uint256 score, bytes calldata signature) external {
        require(!runClaimed[runId], "already claimed");

        bytes32 digest = keccak256(
            abi.encodePacked(msg.sender, runId, score, address(this), block.chainid)
        ).toEthSignedMessageHash();

        address recovered = digest.recover(signature);
        require(recovered == scoreSigner, "bad signature");

        runClaimed[runId] = true;

        uint256 amount = score * rewardPerPoint;
        if (amount > maxRewardPerRun) amount = maxRewardPerRun;
        require(amount > 0, "no reward");

        coin.mint(msg.sender, amount);
        emit RewardsClaimed(msg.sender, runId, score, amount);
    }

    // -------- Admin --------

    function setSigner(address s) external onlyOwner {
        require(s != address(0), "signer=0");
        scoreSigner = s;
        emit SignerUpdated(s);
    }

    function setRewardConfig(uint256 perPoint, uint256 maxPerRun) external onlyOwner {
        rewardPerPoint = perPoint;
        maxRewardPerRun = maxPerRun;
        emit RewardConfigUpdated(perPoint, maxPerRun);
    }
}
