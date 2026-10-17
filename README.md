# SkillStamp 2.0: Proof-of-Participation Passport

Solidity registry on Ethereum Sepolia + React/Vite/TypeScript frontend + a Node server for Opportunity Compass (live web search, AI chat, and signed saved plans). Quiet Proof design system. The site-wide floating Compass assistant is available from every app route.

> **Status note:** this source bundle has been updated to include the learning assistant, roadmap generator, self-declared skills, reverse geocoding, signed saved-plan requests, and opportunity helper tests. It still needs dependency installation and a local compile/test/build on your machine; it has not been deployed or audited. No contract address or transaction hash exists until you deploy.

## Prerequisites
Node.js 20+, MetaMask, two MetaMask accounts (issuer and student), Git.

## 1. Install
```bash
npm install
```
## 2. Compile and test the contract
```bash
npx hardhat compile
npx hardhat test
npm run test:opportunities
```
Expected: all tests in `test/SkillStampRegistry.ts` pass. If a test fails, fix it before deploying.

## 3. Environment
```bash
cp .env.example .env     # Windows: copy .env.example .env
```
Fill `SEPOLIA_RPC_URL` (free from Infura/Alchemy), `DEPLOYER_PRIVATE_KEY` (a **throwaway test wallet only**; MetaMask → account details → export private key), optional `ETHERSCAN_API_KEY`, `TAVILY_API_KEY` (Tavily), and `OPENAI_API_KEY` (enables chat), and `CORS_ORIGINS` (comma-separated deployed frontend origins). `OPENAI_MODEL` defaults to `gpt-4o-mini`. The AI key, Tavily key, and deployer private key are server-only; never put them in a `VITE_` variable. Never commit `.env`; never put server keys in `VITE_` variables.

## 4. Get Sepolia ETH
Use a reputable faucet (e.g. Google Cloud Web3 faucet, Alchemy or Infura Sepolia faucets). Fund the deployer wallet. Also fund the issuer if different.

## 5. (Optional) local run
`npx hardhat node`, then in another terminal `npx hardhat run scripts/deploy.ts --network localhost` just exercises the script. It does not update the frontend config.

## 6. Deploy to Sepolia
```bash
npm run deploy:sepolia
```
The script prints the address and tx hash, writes `src/config/deployment.json` (address, chainId, txHash, deployBlock), and tries Etherscan verification
if `ETHERSCAN_API_KEY` is set. The deployer becomes the contract **owner** (and can issue).

## 7. Run the app
Terminal A: `npm run server` (port 8787). Terminal B: `npm run dev` → http://localhost:5173. Production check: `npm run build`. Run opportunity helper tests with `npm run test:opportunities`. Configure your dev proxy in `vite.config.ts` for `/api` requests.

## Demo script
1. Landing page → **Connect MetaMask** (issuer/owner account, Sepolia).
2. `/issue` → preset "Workshop completed", title "Solidity Workshop Completed", skills `Solidity, Smart Contracts`, paste evidence text, **Hash text**, recipient = second wallet → **Issue** → confirm in MetaMask. Show the real tx link and credential ID.
3. Switch MetaMask to the student account → `/dashboard` shows the credential, points, Growth Score and verified skills.
4. Open `/verify/1` in a private window (no wallet) → **Valid**.
5. Back as issuer: `/issue` → Revoke ID 1 → reload `/verify/1` → **Revoked**; dashboard points drop to 0.
6. Show a stranger account failing: try to issue/revoke with a non-issuer (UI blocks it; the contract also rejects it, covered by tests).
7. Open the floating Compass from any route and ask for a learning plan; use `/opportunities` to search "Solidity" with a city (e.g. Pune), inspect official/source links, save one, and mark it planned. Current event dates and fees are not asserted unless the source supports them.
8. Explain privacy (hashes only), limitations below.

## Required live testnet demonstration

The project is configured for Ethereum Sepolia (`chainId` 11155111), MetaMask, and real ethers.js contract calls. A working deployment is **not included in this source archive**: `src/config/deployment.json` intentionally has an empty address. To satisfy the testnet requirement, configure the RPC URL and a disposable Sepolia-only deployer key in `.env`, obtain Sepolia ETH, run `npm run compile`, `npm test`, and `npm run deploy:sepolia`, then copy the printed contract address and transaction hash into your demo evidence (the deployment script writes the address and tx hash to the JSON config). Open the Sepolia explorer link and demonstrate issuance, public verification, and revocation with real MetaMask confirmations. Never claim this is deployed until the transaction is confirmed.

## Architecture
Browser (React) ⇄ MetaMask ⇄ Sepolia `SkillStampRegistry` (authoritative). Browser ⇄ Node server ⇄ Tavily search (key stays server-side) and `server/data/store.json`.

## Limitations (read before presenting)
- Contract is untested/undeployed until you run Steps 2 and 6. No audit.
- Issuers are trusted by the owner; a valid credential proves the on-chain record, not issuer honesty.
- Leaderboard reads up to 200 wallets directly from the contract; production scale requires an event indexer and paginated data service.
- Saved plans require a single-use, five-minute wallet signature challenge for GET/PUT. Data is still stored in a local JSON file; use a database, a shared/distributed rate limiter, HTTPS, and stronger operational controls for production. A lightweight in-process request limiter and configurable CORS allowlist are included for the demo server.
- Roadmaps are deterministic templates, not AI-generated plans. The site-wide floating Compass sends chat requests to the same backend assistant; live event/course listings are found on `/opportunities` through Tavily, not fabricated by the chat. AI chat requires `OPENAI_API_KEY` on the server and returns a clear configuration error when missing.
- Self-declared skills are stored in the current browser's local storage and are explicitly not verified credentials.
- The separate skill detail page currently shows self-declared skills from this browser. It does not replace the on-chain credential/passport view.
- Opportunity results are search snippets: dates, fees and locations show "Not specified" unless known; always confirm on the source page.
- Location lookup sends coordinates to OpenStreetMap Nominatim only after the user presses the location button and grants permission. Manual city entry remains available.
- Opportunity helper tests cover query construction, deduplication, roadmap bounds, and recommendation explanations. They are not a substitute for end-to-end/API security tests.
- This is a demo, not a security-audited production service.
