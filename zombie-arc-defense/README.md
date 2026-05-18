# Zombie Arc Defense

A complete, end-to-end **blockchain tower-defense game** running on **Arc Testnet** — Circle's new Layer-1 blockchain where USDC is the gas token. It is inspired by [Zombie Idle Defense](https://zombiedefense.xyz/play/), reworked from scratch for Arc.

You play in your browser. Heroes you own as NFTs auto-shoot zombies. When you survive, you mint **ZMB** reward tokens to your wallet on Arc.

```
┌─────────────────────────────┐                ┌────────────────────────────┐
│  Browser (HTML5 + ethers)   │  reads/writes  │      Arc Testnet            │
│  • game canvas              │ ─────────────► │  • ZombieCoin  (ZMB token)  │
│  • wallet connect           │ ◄───────────── │  • ZombieHero  (NFT)        │
│  • on-chain calls           │                │  • ZombieGame  (logic)      │
└─────────────────────────────┘                └────────────────────────────┘
```

---

## What's in this folder

```
zombie-arc-defense/
├── contracts/          Solidity smart contracts
│   ├── ZombieCoin.sol     ERC-20 reward token (ZMB)
│   ├── ZombieHero.sol     ERC-721 hero NFTs (free starter + USDC tiers)
│   └── ZombieGame.sol     Run lifecycle + signed score claims
├── scripts/
│   ├── deploy.js          Deploys all 3 contracts to Arc Testnet
│   ├── verify.js          Verifies them on Arcscan
│   └── sign-score.js      Demo "backend" that signs scores
├── frontend/           Plain HTML5/JS — no build step required
│   ├── index.html
│   ├── css/style.css
│   ├── js/game.js         Canvas game engine
│   ├── js/wallet.js       MetaMask + Arc bindings
│   ├── js/app.js          UI glue
│   └── abi/               ABIs auto-copied here after deploy
├── hardhat.config.js   Arc Testnet network config
├── package.json
└── .env.example        Copy this to .env and fill it in
```

---

# Step-by-Step Guide for Beginners

> No coding background required. You'll copy a few commands. That's it.

## Step 0 — Vocabulary you'll need (60 seconds)

| Word | What it means |
|------|---------------|
| **Wallet** | A browser app like MetaMask that holds your crypto and signs transactions for you. |
| **Network / Chain** | A blockchain. We'll use **Arc Testnet** — a free practice version of Circle's Arc. |
| **Gas** | The fee you pay each time you do something on-chain. On Arc the fee is paid in **USDC** (not ETH). |
| **Testnet USDC** | Fake USDC used only on Arc Testnet. You get it free from a faucet. |
| **Smart contract** | A program that lives on the blockchain. Anyone can call its functions. |
| **Deploy** | Put a smart contract onto the blockchain for the first time. |
| **NFT** | A unique on-chain item — your Hero. |
| **Private key** | A secret string that controls a wallet. **Never share it.** |

> 🚨 **Throwaway wallet rule:** create a *brand new* wallet just for this project. Never reuse a wallet that holds real money.

---

## Step 1 — Install the four things you need

Do these once. They are all free.

1. **Node.js v22+** — runs the deploy scripts.
   - Download: <https://nodejs.org/> (pick the LTS button)
   - Verify in a terminal: `node -v` should print something like `v22.x.x`.

2. **Git** (only needed if you want to push to GitHub).
   - Download: <https://git-scm.com/downloads>

3. **MetaMask** browser extension — your wallet.
   - Install: <https://metamask.io/download>
   - Create a new wallet. **Write down the 12-word seed phrase** and keep it offline.

4. **A code editor** — VS Code is the easiest.
   - Download: <https://code.visualstudio.com/>

---

## Step 2 — Add Arc Testnet to MetaMask

You only need to do this once.

1. Open MetaMask → click the network dropdown at the top → **Add a custom network**.
2. Fill in exactly:

   | Field | Value |
   |---|---|
   | Network name | `Arc Testnet` |
   | RPC URL | `https://rpc.testnet.arc.network` |
   | Chain ID | `5042002` |
   | Currency symbol | `USDC` |
   | Block explorer | `https://testnet.arcscan.app` |

3. Save. Switch to Arc Testnet.

> The frontend can also do this for you automatically when you click "Connect Wallet", but adding it manually first helps confirm everything is working.

---

## Step 3 — Get free testnet USDC (your gas money)

On Arc, every transaction costs a tiny amount of **USDC**, not ETH. So you need a few testnet USDC in your wallet to do anything.

1. Copy your wallet address from MetaMask (the `0x…` string at the top).
2. Go to Circle's faucet: <https://faucet.circle.com/>
3. Choose **Arc Testnet**, paste your address, and request USDC.
4. Wait 30 seconds. Your MetaMask should show a USDC balance on Arc Testnet.

If the Circle faucet is unavailable, the Chainlink Arc faucet is a good backup: <https://faucets.chain.link/arc-testnet>.

You'll also want the **testnet USDC contract address** for Arc. The faucet page lists it. Save it for Step 6.

---

## Step 4 — Get the project onto your computer

Open a terminal (on Windows: PowerShell; on Mac: Terminal). Then:

```bash
# Pick any folder, e.g. your desktop
cd Desktop

# If you are reading this README from a clone already, skip the next line.
git clone https://github.com/<your-username>/zombie-arc-defense.git

cd zombie-arc-defense
npm install
```

`npm install` downloads all the libraries listed in `package.json`. It takes 1–2 minutes. You'll see a bunch of green text. That is normal.

---

## Step 5 — Create your `.env` file

The project ships with `.env.example` — a template. Copy it:

```bash
# Mac/Linux
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

Open `.env` in VS Code. You will see fields like `PRIVATE_KEY=` and `USDC_ADDRESS=`. We'll fill these next.

### 5a. Export your wallet's private key

> **Throwaway wallet only!** Never paste a real-money key.

In MetaMask → click the three-dot menu next to your account → **Account details** → **Show private key** → enter your password → copy.

Paste it into `.env` as:

```
PRIVATE_KEY=0xPASTEYOURKEYHERE
```

(Keep the `0x` prefix.)

### 5b. Set the testnet USDC address

Find it on the faucet page or on Arc's docs (<https://docs.arc.network/arc/references/contract-addresses>). Paste it into `.env`:

```
USDC_ADDRESS=0xYourTestnetUSDCAddressHere
```

> If you skip this, the **free starter hero** still works. You just won't be able to *buy* heroes with USDC until it's set.

---

## Step 6 — Compile the contracts

```bash
npm run compile
```

You should see `Compiled 3 Solidity files successfully`. If you see errors, make sure Node v22 is installed.

---

## Step 7 — Deploy the contracts to Arc Testnet

```bash
npm run deploy:arc
```

This does five things automatically:

1. Deploys `ZombieCoin` (your reward token, symbol **ZMB**).
2. Deploys `ZombieHero` (the NFT contract, points at testnet USDC).
3. Deploys `ZombieGame` (run + reward logic).
4. Transfers `ZombieCoin` ownership to `ZombieGame` so **only the game can mint rewards** — not even you.
5. Writes `deployments/arcTestnet.json` and `frontend/js/addresses.js` so the website finds the contracts. It also copies the ABIs into `frontend/abi/`.

When it finishes you'll see three `0x…` addresses. Save the URL `https://testnet.arcscan.app/address/<ZombieGame-address>` — that's where you (and players) can inspect every on-chain action.

---

## Step 8 — (Optional) Verify your contracts on Arcscan

Verification publishes the source code so anyone can read it on the explorer. Recommended.

```bash
npm run verify:arc
```

If it complains about an API key, set `ARCSCAN_API_KEY` in `.env`. For testnet it usually works with the placeholder.

---

## Step 9 — Run the website locally

```bash
npm run serve
```

This opens a tiny local web server at **http://localhost:8080**. Open that URL in the browser where MetaMask is installed.

You should see the dark UI with a "Connect Wallet" button.

---

## Step 10 — Play your first run

1. Click **Connect Wallet**. MetaMask pops up; approve the connection. If you weren't on Arc Testnet, the page asks MetaMask to switch.
2. Click **Claim Free Starter (Tier 1)**. Approve the transaction in MetaMask. Pay a fraction of a cent in USDC. You now own one Hero NFT.
3. (Optional) Click **Buy Tier 2 (5 USDC)** to add a stronger hero. You'll get two MetaMask popups in a row — first to *approve* USDC spending, second to mint the hero.
4. Click **Start Run**. MetaMask asks you to confirm a `startRun()` transaction. This puts a unique `runId` on chain so the score can't be replayed later.
5. Watch zombies march from the right. Heroes auto-shoot. Survive as many waves as you can.
6. When the base falls, the page asks for a private key to **sign your score**. (See Step 11 for how to do this safely in production.) For testnet, paste the key of whichever wallet you set as `SCORE_SIGNER` (by default that's the same deployer wallet).
7. Click **Claim ZMB**. Approve in MetaMask. Your `ZMB` balance updates at the top of the page.

That's it — you have a working blockchain game.

---

## Step 11 — How the cheating-prevention works (and what to harden in production)

The game runs in the browser, which is fast and free, but a player could lie about their score. So before the contract pays out, it requires a **signature** from a wallet you control (the `scoreSigner`).

In this testnet build, signing happens in the browser via a `prompt()` for simplicity. **For a real product, do this instead:**

1. Run `scripts/sign-score.js` (or any small Node/Express server) on a machine you own.
2. The browser sends `(player, runId, score)` to your server.
3. Your server applies sanity checks (max score per wave, max waves per minute, etc.) and only then signs.
4. The server returns the signature; the browser submits it to `claimRewards()`.

The contract checks the signature against `scoreSigner` and refuses if it doesn't match — even if a player tampers with the score in the browser.

> **To rotate the signer key** without redeploying: as the contract owner, call `setSigner(newAddress)` on `ZombieGame`. Done.

---

## Step 12 — Putting the website online (a custom domain!)

Once you're happy locally, host the `frontend/` folder anywhere static. Quick options:

| Host | How |
|---|---|
| **Vercel** | Connect repo, set Root Directory to `zombie-arc-defense`. Free SSL. |
| **Netlify** | Drag-drop the `frontend/` folder at <https://app.netlify.com/drop>. Free SSL. |
| **GitHub Pages** | Enable in Settings → Pages → Source: GitHub Actions. The included workflow auto-publishes. |
| **Cloudflare Pages** | Connect repo, output dir = `zombie-arc-defense/frontend`. Free SSL. |
| **Your own host** (cPanel, S3, etc.) | Upload the contents of `frontend/` to your `public_html`. |

➡ **Full step-by-step deployment guide with custom domains, DNS, troubleshooting:** [DEPLOYMENT.md](./DEPLOYMENT.md)

The `addresses.js` and `abi/` files are baked into the deploy, so any visitor with MetaMask can play immediately.

---

## Common errors and how to fix them

| Symptom | Likely cause | Fix |
|---|---|---|
| `insufficient funds for gas` | No testnet USDC in your wallet | Get more from the faucet (Step 3). |
| `Unrecognized chain ID` in MetaMask | Arc Testnet wasn't added | Click *Connect Wallet* again — the site will add it for you. |
| `bad signature` when claiming | The signer doesn't match `scoreSigner` | Sign with the same wallet you set in `.env`'s `PRIVATE_KEY`/`SCORE_SIGNER_ADDRESS`. |
| `no hero NFT` when starting | You haven't minted a hero | Click *Claim Free Starter* first. |
| `USDC transfer failed` | You skipped the approve step | The frontend should handle this; refresh and retry. |
| Compile fails with "stack too deep" | Wrong Solidity version | Run `npm install` again; we pin `0.8.24`. |

---

## Architecture reference (for the curious)

### `ZombieCoin.sol`
- Standard ERC-20 with a restricted `mint(to, amount)`.
- After deployment, ownership is transferred to `ZombieGame` so no human can mint rewards.

### `ZombieHero.sol`
- ERC-721 + Enumerable (so we can list every hero an address owns).
- `claimStarter()` — one free Tier-1 NFT per address.
- `buyHero(tier)` — pulls USDC from the buyer using `transferFrom`, mints chosen tier.
- `heroesOf(address)` — returns parallel arrays of `(tokenIds, tiers)` for the front-end.

### `ZombieGame.sol`
- `startRun()` — requires the caller to own ≥1 Hero. Emits a unique `runId` derived from `(player, timestamp, prevrandao)`.
- `claimRewards(runId, score, signature)` — verifies an ECDSA signature over `keccak256(player, runId, score, gameAddress, chainId)`. Marks the `runId` as used, mints `score * rewardPerPoint` ZMB, capped by `maxRewardPerRun`.
- `setSigner` / `setRewardConfig` — owner-only knobs to tune the economy after launch.

### Why Arc?
- USDC as gas token means costs are predictable and dollar-denominated — players don't need to buy ETH.
- EVM-compatible, so the same Solidity tooling (Hardhat, OpenZeppelin) works without changes.
- Sub-second finality keeps "Claim ZMB" feeling instant.

---

## Going further

- **Add leaderboards.** Index `RewardsClaimed` events with The Graph or Goldsky.
- **Add account abstraction (gasless).** Wrap `startRun` and `claimRewards` in Circle's Paymaster so newcomers can play without holding USDC at all.
- **Cross-chain rewards.** Use CCTP to bridge ZMB-equivalents to other chains.
- **Make heroes upgradable.** Add a `levelUp(tokenId)` that burns ZMB to bump a hero's tier mapping.

Have fun, and keep your private keys safe. 🧟‍♂️🛡️
