# Deploying Zombie Arc Defense to Your Own Site

This guide walks you from "it works on `localhost:8080`" all the way to **`https://your-domain.com`**, with no coding background assumed.

---

## What you're actually deploying

Your project has **two halves**, and they get deployed in two different places:

| Half | What it is | Where it lives |
|---|---|---|
| **Smart contracts** | `ZombieCoin`, `ZombieHero`, `ZombieGame` (Solidity) | On **Arc Testnet itself**. You did this with `npm run deploy:arc`. They are already "live on the internet" — anyone in the world can call them. You don't host these. |
| **Front-end** | `frontend/index.html`, CSS, and the JS files | A static website. **This** is what you put on your custom domain. |

> 🔑 **Key insight:** The website is just static files. There's no Node server to run, no database to manage, no `npm start` in production. Any plain web host works.

---

## The one thing you MUST do before hosting

The website reads contract addresses from `frontend/js/addresses.js`. That file is **auto-generated** by `npm run deploy:arc` on your local machine. If you skip this step, the website loads but every button errors out.

Before deploying to a public host, run on your laptop:

```bash
cd zombie-arc-defense
npm install            # only the first time
npm run compile
npm run deploy:arc     # writes frontend/js/addresses.js + frontend/abi/*
```

Then open `frontend/js/addresses.js` and confirm it has real `0x…` addresses, not empty strings. Commit it:

```bash
git add frontend/js/addresses.js frontend/abi/
git commit -m "chore: update Arc Testnet addresses + ABIs"
git push
```

Now the front-end is ready to ship.

---

# Choose your host

Pick one. They're all free for hobby projects. From easiest to most manual:

| Host | Best for | Custom domain | Build time |
|---|---|---|---|
| **Vercel** | Most beginners | ✅ Free SSL | 30 sec |
| **Netlify** | Drag-and-drop fans | ✅ Free SSL | 30 sec |
| **Cloudflare Pages** | Best free tier | ✅ Free SSL | 1 min |
| **GitHub Pages** | Already on GitHub | ✅ Free SSL | 2 min |
| **Any web host (cPanel, Hostinger, Namecheap, AWS S3…)** | You already pay for one | depends | 5 min |

---

## Option A — Vercel (recommended)

Vercel is the smoothest path. There's a `vercel.json` already in this repo, so it just works.

### A1. Create an account
1. Go to <https://vercel.com/signup> and sign in with your GitHub account.

### A2. Import the repo
1. Click **Add New… → Project**.
2. Select your GitHub repo (the one containing `zombie-arc-defense/`).
3. On the **Configure Project** screen:
   - **Root Directory** → click *Edit* → choose `zombie-arc-defense`.
   - **Framework Preset** → `Other`.
   - **Build & Output** → leave defaults; the `vercel.json` overrides them.
4. Click **Deploy**.

After ~30 seconds you'll see `https://zombie-arc-defense-xxxx.vercel.app`. Click it. The game should load and connect to Arc Testnet.

### A3. Attach your custom domain
1. In your Vercel project → **Settings → Domains → Add**.
2. Type `play.your-domain.com` (or just `your-domain.com`).
3. Vercel shows you DNS records to copy. Two common cases:

   - **Subdomain like `play.your-domain.com`**: add a `CNAME` record pointing to `cname.vercel-dns.com`.
   - **Apex like `your-domain.com`**: add an `A` record pointing to `76.76.21.21`.

4. Add those records at your domain registrar (Namecheap, GoDaddy, Cloudflare, Google Domains — wherever you bought it). Vercel will detect propagation within minutes and auto-issue an SSL certificate.

You're done. Visit your domain.

---

## Option B — Netlify (drag-and-drop)

If you don't want to connect GitHub:

### B1. Build the static folder locally
After running `npm run deploy:arc`, your entire deployable website is the `frontend/` folder. Zip it or just keep it open.

### B2. Drop it
1. Go to <https://app.netlify.com/drop>.
2. Drag the **`frontend`** folder onto the page.
3. You'll get a URL like `https://random-name-12345.netlify.app`.

### B3. Add your custom domain
1. Netlify dashboard → your site → **Domain management → Add custom domain**.
2. Enter `play.your-domain.com`.
3. Netlify shows DNS records:
   - Subdomain: `CNAME` → `your-site.netlify.app`.
   - Apex: `A` → Netlify's load-balancer IP, shown in the panel.
4. Update those at your registrar. SSL provisions automatically.

If you'd rather sync from Git: Netlify dashboard → **Add new site → Import from Git**, then set:
- **Base directory**: `zombie-arc-defense`
- **Publish directory**: `zombie-arc-defense/frontend`

The `netlify.toml` in the repo already configures both.

---

## Option C — Cloudflare Pages

1. Sign up at <https://pages.cloudflare.com/>.
2. **Create a project → Connect to Git** → pick your repo.
3. Build settings:
   - **Framework preset**: `None`
   - **Build command**: leave empty
   - **Build output directory**: `zombie-arc-defense/frontend`
   - **Root directory**: leave at repo root
4. Save and Deploy.

For your custom domain: project → **Custom domains → Set up a custom domain**. If your DNS is also on Cloudflare it's two clicks; if not, you add a `CNAME`.

---

## Option D — GitHub Pages

GitHub Pages is free and tied to the repo, but it serves from the *root* of a branch, so we publish only the `frontend/` folder to a separate branch.

The included workflow `.github/workflows/deploy-pages.yml` does this automatically every time you push to `master`. To enable it:

1. In GitHub → your repo → **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to `GitHub Actions`.
3. Push any commit to `master`. The workflow runs and publishes.
4. Your site is live at `https://<your-username>.github.io/<repo-name>/`.

> ⚠️ If your repo is named `.github` (special org-config repo), GitHub Pages won't work the way you expect. **Move the project to its own repo** before using this option (see "Moving to a dedicated repo" below).

### Custom domain on GH Pages
1. Settings → Pages → **Custom domain** → enter `play.your-domain.com`.
2. At your registrar add a `CNAME` record pointing to `<your-username>.github.io`.
3. Wait 5–10 minutes; GitHub provisions HTTPS automatically.

---

## Option E — A web host you already own (cPanel, Hostinger, Bluehost, etc.)

These hosts give you an FTP/SFTP login or a "File Manager" in their control panel. The website is just files, so:

1. Run `npm run deploy:arc` locally to populate `addresses.js` and `abi/`.
2. Open the **`frontend/`** folder. You should see `index.html`, `css/`, `js/`, `abi/`.
3. Upload the **contents** of `frontend/` (not the folder itself) to your host's `public_html/` (or the document-root folder for the subdomain you want, e.g. `public_html/play/`).
4. Visit your domain. Done.

### URL paths to know
- Upload to `public_html/` → site shows at `https://your-domain.com`.
- Upload to `public_html/play/` → site shows at `https://your-domain.com/play/`.
- Make sure your host has **HTTPS enabled** for that domain (most include free Let's Encrypt these days). Wallets won't connect on plain `http://` for security reasons.

---

## Option F — Amazon S3 + CloudFront (advanced, for AWS users)

1. Create an S3 bucket named e.g. `play.your-domain.com`. Disable "Block public access".
2. Enable **Static website hosting** with index document `index.html`.
3. Upload everything inside `frontend/` to the bucket root.
4. Put **CloudFront** in front of it with a free ACM certificate, alias your domain via Route 53, and you're done.

---

## Custom-domain checklist (any host)

Whatever host you picked:

- [ ] Front-end was built **after** running `npm run deploy:arc`.
- [ ] `frontend/js/addresses.js` contains real `0x…` addresses on Arc Testnet (chainId 5042002).
- [ ] `frontend/abi/` has 4 JSON files: `ZombieCoin.json`, `ZombieHero.json`, `ZombieGame.json`, `USDC.json`.
- [ ] The site is served over **HTTPS** (`https://your-domain.com`, not `http://`). Required for MetaMask.
- [ ] Visiting the site, clicking **Connect Wallet** triggers MetaMask and prompts you to switch to Arc Testnet.

---

## Moving the game to a dedicated repo (recommended for production)

Right now the project lives inside `Muliartech/.github` alongside other org files. For production it's much cleaner to move it to its own repo (e.g. `Muliartech/zombie-arc-defense`). Steps:

```bash
# From your local machine
git clone https://github.com/Muliartech/.github.git
cd .github

# Use git subtree to extract the folder with full history
git subtree split --prefix=zombie-arc-defense -b zad-only

# Create a new repo on GitHub called zombie-arc-defense, then:
git push https://github.com/Muliartech/zombie-arc-defense.git zad-only:master
```

After that, point your Vercel/Netlify/Pages project at the new repo and remove the **Root Directory** override (since now `frontend/` sits at the top of the new repo).

---

## Frequently broken things and their fixes

| Symptom | Cause | Fix |
|---|---|---|
| Page loads but **Connect Wallet** does nothing | Site served over `http://`, not `https://` | Enable HTTPS at your host. MetaMask refuses non-secure origins. |
| 404 on `js/addresses.js` after deploy | You deployed before running `npm run deploy:arc` | Run it locally, commit `frontend/js/addresses.js` and `frontend/abi/`, redeploy. |
| 404 on `/play` but not `/play/` | Missing trailing-slash redirect | Already handled in `vercel.json` and `netlify.toml`. For other hosts, ensure the directory has an `index.html`. |
| `bad signature` when claiming | The signer wallet on production differs from `scoreSigner` set on the contract | Either re-deploy contracts with `SCORE_SIGNER_ADDRESS=...` set, or call `setSigner(newAddress)` from the deployer wallet. |
| `Failed to fetch abi/...` in browser console | The host stripped `frontend/abi` because it's empty before first deploy | Make sure `npm run deploy:arc` ran and the JSON files exist before you committed. |
| Mixed-content warnings | An asset is loaded over `http://` | Already all-`https` in this project; check any custom edits you made. |
| MetaMask says "wrong network" forever | Browser cached an old chainId | In MetaMask: Settings → Advanced → Reset Activity tab data, then refresh. |

---

## What about the contracts when launching to mainnet?

When you eventually want to leave testnet and go to **Arc Mainnet**:

1. Add a new network entry in `hardhat.config.js` with the mainnet RPC and chainId.
2. Set `PRIVATE_KEY` to a properly secured wallet (use a hardware wallet or a vault — never a `.env` on a laptop).
3. Move score signing to a server you control. Use `scripts/sign-score.js` as the starting template; expose it via a small Express endpoint and never expose the signer key in the browser.
4. Re-run `npm run deploy:arcMainnet` (or whatever you name it) and re-deploy the front-end with the new addresses.

But for now, testnet is the right place to start. Everything in this repo is configured for it.

---

Got stuck on a step? Open the browser console (F12 → Console) and copy any red error message. Most issues are one-line fixes.
