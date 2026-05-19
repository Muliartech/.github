// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ArcLoot - Tap-to-Earn Game Token on Arc Testnet
 * @notice A tap-to-earn game where players earn $ARCLOOT tokens by tapping.
 * @dev Deployed on Arc Testnet (Chain ID: 5042002) which uses USDC as native gas.
 */
contract ArcLoot {
    string public constant name = "ArcLoot";
    string public constant symbol = "ARCLOOT";
    uint8 public constant decimals = 18;

    uint256 public totalSupply;
    address public owner;

    // Game configuration
    uint256 public rewardPerTap = 10 * 1e18; // 10 ARCLOOT per tap
    uint256 public cooldownTime = 5; // 5 seconds between taps
    uint256 public dailyTapLimit = 500; // Max taps per day
    uint256 public referralBonus = 5; // 5% bonus for referrer

    // Player data
    struct Player {
        uint256 balance;
        uint256 totalTaps;
        uint256 totalEarned;
        uint256 lastTapTime;
        uint256 dailyTaps;
        uint256 lastDayReset;
        address referrer;
        uint256 referralEarnings;
        bool hasPlayed;
    }

    mapping(address => Player) public players;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    // Leaderboard tracking
    address[] public allPlayers;
    uint256 public totalPlayers;

    // Events
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Tapped(address indexed player, uint256 reward, uint256 totalTaps);
    event ReferralRegistered(address indexed player, address indexed referrer);
    event ReferralReward(address indexed referrer, address indexed player, uint256 amount);
    event ConfigUpdated(string param, uint256 value);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // ============ ERC-20 Functions ============

    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        require(_balances[msg.sender] >= amount, "Insufficient balance");
        _balances[msg.sender] -= amount;
        _balances[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) public returns (bool) {
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function allowance(address _owner, address spender) public view returns (uint256) {
        return _allowances[_owner][spender];
    }

    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        require(_balances[from] >= amount, "Insufficient balance");
        require(_allowances[from][msg.sender] >= amount, "Insufficient allowance");
        _allowances[from][msg.sender] -= amount;
        _balances[from] -= amount;
        _balances[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }

    // ============ Game Functions ============

    /**
     * @notice Register a referrer (one-time, before first tap)
     * @param referrer Address of the referrer
     */
    function registerReferral(address referrer) external {
        require(!players[msg.sender].hasPlayed, "Already playing");
        require(referrer != msg.sender, "Cannot refer yourself");
        require(referrer != address(0), "Invalid referrer");
        players[msg.sender].referrer = referrer;
        emit ReferralRegistered(msg.sender, referrer);
    }

    /**
     * @notice Tap to earn ARCLOOT tokens
     * @dev Enforces cooldown and daily tap limit
     */
    function tap() external {
        Player storage player = players[msg.sender];

        // Register new player
        if (!player.hasPlayed) {
            player.hasPlayed = true;
            allPlayers.push(msg.sender);
            totalPlayers++;
        }

        // Reset daily counter if new day
        if (block.timestamp - player.lastDayReset >= 1 days) {
            player.dailyTaps = 0;
            player.lastDayReset = block.timestamp;
        }

        // Check cooldown
        require(
            block.timestamp >= player.lastTapTime + cooldownTime,
            "Cooldown active"
        );

        // Check daily limit
        require(player.dailyTaps < dailyTapLimit, "Daily limit reached");

        // Update player state
        player.lastTapTime = block.timestamp;
        player.dailyTaps++;
        player.totalTaps++;

        // Mint reward
        uint256 reward = rewardPerTap;
        _mint(msg.sender, reward);
        player.totalEarned += reward;

        // Referral bonus
        if (player.referrer != address(0)) {
            uint256 refReward = (reward * referralBonus) / 100;
            _mint(player.referrer, refReward);
            players[player.referrer].referralEarnings += refReward;
            emit ReferralReward(player.referrer, msg.sender, refReward);
        }

        emit Tapped(msg.sender, reward, player.totalTaps);
    }

    /**
     * @notice Get player stats
     */
    function getPlayerStats(address player) external view returns (
        uint256 balance,
        uint256 totalTaps,
        uint256 totalEarned,
        uint256 lastTapTime,
        uint256 dailyTaps,
        address referrer,
        uint256 referralEarnings,
        uint256 cooldownRemaining
    ) {
        Player storage p = players[player];
        uint256 cooldown = 0;
        if (block.timestamp < p.lastTapTime + cooldownTime) {
            cooldown = (p.lastTapTime + cooldownTime) - block.timestamp;
        }
        return (
            _balances[player],
            p.totalTaps,
            p.totalEarned,
            p.lastTapTime,
            p.dailyTaps,
            p.referrer,
            p.referralEarnings,
            cooldown
        );
    }

    /**
     * @notice Get top players for leaderboard (returns up to `count` players sorted by totalEarned)
     */
    function getTopPlayers(uint256 count) external view returns (
        address[] memory addresses,
        uint256[] memory earnings
    ) {
        uint256 len = allPlayers.length;
        if (count > len) count = len;

        // Simple selection sort for top N (gas-efficient for small N)
        addresses = new address[](count);
        earnings = new uint256[](count);
        bool[] memory used = new bool[](len);

        for (uint256 i = 0; i < count; i++) {
            uint256 maxEarned = 0;
            uint256 maxIdx = 0;
            for (uint256 j = 0; j < len; j++) {
                if (!used[j] && players[allPlayers[j]].totalEarned > maxEarned) {
                    maxEarned = players[allPlayers[j]].totalEarned;
                    maxIdx = j;
                }
            }
            used[maxIdx] = true;
            addresses[i] = allPlayers[maxIdx];
            earnings[i] = maxEarned;
        }
    }

    // ============ Admin Functions ============

    function setRewardPerTap(uint256 _reward) external onlyOwner {
        rewardPerTap = _reward;
        emit ConfigUpdated("rewardPerTap", _reward);
    }

    function setCooldownTime(uint256 _cooldown) external onlyOwner {
        cooldownTime = _cooldown;
        emit ConfigUpdated("cooldownTime", _cooldown);
    }

    function setDailyTapLimit(uint256 _limit) external onlyOwner {
        dailyTapLimit = _limit;
        emit ConfigUpdated("dailyTapLimit", _limit);
    }

    function setReferralBonus(uint256 _bonus) external onlyOwner {
        require(_bonus <= 20, "Max 20%");
        referralBonus = _bonus;
        emit ConfigUpdated("referralBonus", _bonus);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }

    // ============ Internal Functions ============

    function _mint(address to, uint256 amount) internal {
        totalSupply += amount;
        _balances[to] += amount;
        emit Transfer(address(0), to, amount);
    }
}
