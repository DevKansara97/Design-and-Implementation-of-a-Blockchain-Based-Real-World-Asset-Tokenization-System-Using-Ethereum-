# Real-World Asset Tokenization System
**CSE542 Introduction to Blockchain | Group IBC02**
> Parin Patel (AU2340243) · Dev Kansara (AU2340222) · Kavish Shah (AU2320138)
> Course Instructor: Prof. Sanjay Chaudhary

---

## 📁 Project Structure

```
rwa-tokenization/
├── contracts/
│   ├── RWATokenization.sol     ← Main ERC-721 NFT contract (non-fungible assets)
│   └── FractionalAsset.sol     ← ERC-20 contract (fractional/shared ownership)
├── scripts/
│   └── deploy.js               ← Deployment script (local + Sepolia)
├── test/
│   └── RWATokenization.test.js ← Full test suite
├── frontend/
│   ├── public/index.html
│   └── src/
│       ├── App.js              ← Main React app
│       ├── App.css             ← Styles
│       ├── index.js
│       ├── components/
│       │   ├── ViewAsset.js    ← Search & view any asset
│       │   ├── RegisterAsset.js← Issuer: register new asset + IPFS upload
│       │   ├── VerifyAsset.js  ← Verifier: approve asset
│       │   ├── TransferAsset.js← Owner: transfer to buyer
│       │   └── GrantRole.js    ← Admin: manage roles
│       └── utils/
│           ├── contract.js     ← ABI + address config
│           ├── ipfs.js         ← Pinata IPFS upload helpers
│           └── wallet.js       ← MetaMask connection
├── hardhat.config.js
├── package.json
└── .env.example
```

---

## ⚙️ Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 18 | https://nodejs.org |
| npm | ≥ 9 | Bundled with Node |
| MetaMask | Latest | https://metamask.io |

---

## 🚀 Quick Start (Local Development)

### Step 1 — Install Dependencies

```bash
# In project root (smart contracts)
npm install

# In frontend folder
cd frontend && npm install && cd ..
```

### Step 2 — Set Up Environment

```bash
cp .env.example .env
# Edit .env — for local dev, only REACT_APP_PINATA_* keys are needed
```

### Step 3 — Compile Smart Contracts

```bash
npx hardhat compile
```
You should see: `Compiled 2 Solidity files successfully`

### Step 4 — Run Tests

```bash
npx hardhat test
```
Expected: All tests pass ✅

### Step 5 — Start Local Blockchain Node

Open a **new terminal** and run:
```bash
npx hardhat node
```
This starts a local Ethereum node at `http://127.0.0.1:8545` and prints 20 test accounts with 10,000 ETH each.

### Step 6 — Deploy to Local Network

In your **original terminal**:
```bash
npx hardhat run scripts/deploy.js --network localhost
```
Copy the printed `RWATokenization` address.

### Step 7 — Configure Frontend

```bash
# In frontend/.env (create this file)
REACT_APP_CONTRACT_ADDRESS=<paste address from Step 6>
REACT_APP_PINATA_API_KEY=<your pinata key>
REACT_APP_PINATA_SECRET=<your pinata secret>
```

### Step 8 — Connect MetaMask to Local Network

1. Open MetaMask → Networks → Add Network
2. Network Name: `Hardhat Local`
3. RPC URL: `http://127.0.0.1:8545`
4. Chain ID: `31337`
5. Import a test account: Copy any private key printed by `npx hardhat node` → MetaMask → Import Account

### Step 9 — Start Frontend

```bash
cd frontend && npm start
```
Open: http://localhost:3000

---

## 🌐 Deploy to Sepolia Testnet

### Get Sepolia ETH (free)
- https://sepoliafaucet.com
- https://faucet.quicknode.com/ethereum/sepolia

### Get Alchemy RPC URL (free)
1. Sign up at https://alchemy.com
2. Create new app → Network: Ethereum Sepolia
3. Copy HTTP URL

### Deploy

```bash
# Fill in .env with PRIVATE_KEY, SEPOLIA_RPC_URL, ETHERSCAN_API_KEY
npx hardhat run scripts/deploy.js --network sepolia
```

Update `REACT_APP_CONTRACT_ADDRESS` in `frontend/.env` with the new address.

---

## 📋 Smart Contract Reference

### RWATokenization.sol (ERC-721 NFT)

| Function | Role Required | Description |
|----------|--------------|-------------|
| `registerAsset(to, assetId, assetType, ipfsCID)` | ISSUER | Mint NFT for a new asset |
| `verifyAsset(tokenId)` | VERIFIER | Mark asset as verified |
| `transferAsset(to, tokenId)` | Owner | Transfer verified asset |
| `grantRole(role, account)` | ADMIN | Assign roles |
| `getAsset(tokenId)` | Anyone | View asset details |
| `getTokenIdByAssetId(assetId)` | Anyone | Look up token by asset ID |
| `isAssetVerified(tokenId)` | Anyone | Check verification status |

### FractionalAsset.sol (ERC-20 Fungible)

Used for assets with shared/fractional ownership (e.g. commercial real estate).

| Function | Description |
|----------|-------------|
| `constructor(assetId, assetType, ipfsCID, shares, owner)` | Deploy one per asset |
| `transferShares(to, amount)` | Transfer fractional ownership |
| `verify()` | Mark asset as verified (owner only) |
| `ownershipPercentage(account)` | Returns basis points (e.g. 2500 = 25%) |

### Role Bytes32 Values

```
ADMIN_ROLE    = 0x0000...0000 (DEFAULT_ADMIN_ROLE)
ISSUER_ROLE   = keccak256("ISSUER_ROLE")
VERIFIER_ROLE = keccak256("VERIFIER_ROLE")
```

---

## 🔁 Asset Lifecycle

```
[ISSUER] registerAsset()
    ↓
NFT minted → isVerified = false
    ↓
[VERIFIER] verifyAsset()
    ↓
isVerified = true
    ↓
[OWNER] transferAsset(newOwner)
    ↓
Ownership updated on-chain
```

---

## 🗄️ Blockchain vs Off-Chain Storage

| Data | Storage Location |
|------|-----------------|
| Asset ID | On-chain (Ethereum) |
| Owner address | On-chain |
| IPFS CID hash | On-chain |
| isVerified flag | On-chain |
| Role mappings | On-chain |
| Documents, images, PDFs | Off-chain (IPFS via Pinata) |
| Full metadata JSON | Off-chain (IPFS via Pinata) |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Solidity 0.8.20 + OpenZeppelin v5 |
| Token Standards | ERC-721 (NFT), ERC-20 (Fractional) |
| Development Framework | Hardhat |
| Blockchain | Ethereum Sepolia Testnet |
| Wallet | MetaMask |
| Web3 Library | Ethers.js v6 |
| Frontend | React 18 |
| Off-chain Storage | IPFS via Pinata |
| Version Control | GitHub |

---

## 🧪 Run Tests

```bash
npx hardhat test
```

Test coverage:
- ✅ Asset registration by issuer
- ✅ Duplicate asset ID rejection
- ✅ Role-based access control
- ✅ Asset verification
- ✅ Transfer blocked for unverified assets
- ✅ Transfer after verification
- ✅ Non-owner transfer rejection
- ✅ Fractional share issuance and transfer
- ✅ Ownership percentage calculation

---

## 🔒 Security Features

- **Role-based access control** via OpenZeppelin `AccessControl`
- **Verification gate** — assets cannot be transferred until verified
- **Immutable ownership records** — all transfers logged on-chain via events
- **No duplicate asset IDs** — enforced at contract level
- **Off-chain privacy** — sensitive documents stored on IPFS, only hash on-chain
- **Atomic transfers** — state updated in single transaction

---

## 📚 References

- [OpenZeppelin ERC-721 Docs](https://docs.openzeppelin.com/contracts/5.x/erc721)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Ethers.js v6 Docs](https://docs.ethers.org/v6/)
- [Pinata IPFS Docs](https://docs.pinata.cloud)
- [Sepolia Faucet](https://sepoliafaucet.com)
