# ArcLoot - Tap-to-Earn Game on Arc Testnet

A Web3 tap-to-earn browser game built on **Arc Testnet** by Circle. Players tap to earn `$ARCLOOT` tokens with **USDC native gas** — no volatile ETH fees!

> Alternative to [LootCoin](https://lootcoin.tech/) — built specifically for the Arc ecosystem.

## Features

- **Tap-to-Earn**: Earn 10 ARCLOOT per tap, up to 500 taps/day
- **USDC Native Gas**: Transaction fees paid in stable USDC (no ETH volatility)
- **5-Second Cooldown**: Anti-bot protection between taps
- **Referral System**: 5% bonus on all earnings from your referrals
- **On-chain Leaderboard**: Compete with other players
- **Mobile Responsive**: Play on any device
- **MetaMask/Rabby Support**: Auto-adds Arc Testnet network

## Arc Testnet Network Details

| Property | Value |
|----------|-------|
| Network Name | Arc Testnet |
| Chain ID | 5042002 |
| RPC URL | https://rpc.testnet.arc.network |
| Currency | USDC (18 decimals) |
| Explorer | https://testnet.arcscan.app |
| Faucet | https://faucets.chain.link/arc-testnet |

## Project Structure

```
arc-loot-game/
├── contracts/
│   └── ArcLoot.sol          # ERC-20 tap-to-earn game contract
├── frontend/
│   ├── index.html           # Main dapp page
│   ├── css/style.css        # Styling
│   └── js/
│       ├── app.js           # Main app logic
│       ├── game.js          # Game manager (tap, stats, leaderboard)
│       ├── wallet.js        # Wallet connection & network switching
│       ├── config.js        # Network & contract config
│       └── abi.js           # Contract ABI
├── scripts/
│   └── deploy.js            # Hardhat deployment script
├── hardhat.config.js        # Hardhat config for Arc Testnet
├── vercel.json              # Vercel deployment config
├── package.json
└── README.md
```

## Quick Start

### 1. Get Testnet USDC

Visit the [Arc Testnet Faucet](https://faucets.chain.link/arc-testnet) to get testnet USDC for gas fees.

### 2. Deploy Smart Contract

```bash
cd arc-loot-game
npm install
cp .env.example .env
# Add your private key to .env
npm run deploy
```

### 3. Update Frontend Config

After deployment, the deploy script auto-updates `frontend/js/config.js` with the contract address.

### 4. Deploy to Vercel

#### Option A: Vercel CLI
```bash
npm i -g vercel
vercel --prod
```

#### Option B: GitHub Integration
1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project
3. Import the repository
4. Set **Root Directory** to `arc-loot-game`
5. Set **Output Directory** to `frontend`
6. Deploy!

## Smart Contract

The `ArcLoot.sol` contract includes:

- **ERC-20 Token**: Standard token with transfer/approve/allowance
- **Tap Mechanic**: `tap()` mints tokens with cooldown enforcement
- **Referral System**: `registerReferral()` for one-time referral registration
- **Leaderboard**: `getTopPlayers()` returns top N earners
- **Admin Controls**: Owner can adjust reward rate, cooldown, daily limit

### Game Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| Reward per Tap | 10 ARCLOOT | Tokens minted per tap |
| Cooldown | 5 seconds | Time between taps |
| Daily Limit | 500 taps | Max taps per 24h |
| Referral Bonus | 5% | Bonus to referrer |

## Deployment Addresses

After deploying, update the contract address in `frontend/js/config.js`:

```javascript
export const CONTRACT_ADDRESS = "0xYOUR_DEPLOYED_ADDRESS";
```

## Tech Stack

- **Blockchain**: Arc Testnet (Circle) — L1 with USDC native gas
- **Smart Contracts**: Solidity 0.8.20, Hardhat
- **Frontend**: Vanilla JS (ES Modules), ethers.js v6
- **Deployment**: Vercel (static site)
- **Wallet**: MetaMask, Rabby (any EVM wallet)

## Why Arc Testnet?

- **Stable Gas Fees**: USDC-denominated, no volatile gas spikes
- **Circle Backed**: Built by the team behind USDC
- **Fast Finality**: Sub-second settlement
- **EVM Compatible**: Use existing Solidity tooling
- **Low Fees**: Minimum 20 Gwei base fee in USDC

## License

MIT
