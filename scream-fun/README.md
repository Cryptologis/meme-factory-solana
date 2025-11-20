# 🔥 SCREAM.FUN - Fair Meme Coin Launchpad on Monad

The fairest (and most profitable) Pump.fun-style meme coin launchpad on Monad (EVM L1, 10k TPS).

**ZERO creator fees forever. Dev still eats handsomely. You pump, we both win.**

⚡ **Powered by Monad** - 10,000 TPS, near-instant finality, cheap gas

## 🚀 Quick Start

```bash
# Clone the repo
git clone https://github.com/Cryptologis/meme-factory-solana.git
cd meme-factory-solana/scream-fun

# Install dependencies
npm install
cd frontend && npm install && cd ..

# Set up environment variables
cp .env.example .env
# Edit .env with your private key and dev wallet

# Run frontend (connects to deployed testnet contracts)
cd frontend
npm run dev
```

Visit http://localhost:3000 and connect your MetaMask to Monad Testnet!

**Already deployed on Monad Testnet** - Start creating tokens right away!

## 🎯 Key Features

- ✅ **Zero Creator Fees Forever** - No rug pulls, no honeypots
- ✅ **Anti-Snipe Protection** - 5min lock + 30min gradual unlock
- ✅ **Creator Allocation** - 0-10% optional, 50% vested until migration
- ✅ **Referral System** - 0.05% commission for referring traders
- ✅ **Rage Tax** - 2% tax on panic sellers (>10% loss)
- ✅ **Diamond Hands Rewards** - 90% of RAGE fund to holders with vesting
- ✅ **Auto-Migration to DEX** - At 85 ETH market cap

## 💰 Revenue Model & Tokenomics

### 📊 Supply Distribution
- **1 Billion** total tokens created per launch
- **800M tokens** (80%) available on bonding curve
- **200M tokens** (20%) auto-locked in DEX liquidity at migration
- Optional **0-10% creator allocation** (creator-specified)

### Phase 1 - Bonding Curve (Pre-Migration)

**Trading Fees (on every buy/sell):**
- **0.4% total fee** = 0.2% dev + 0.2% RAGE fund

**RAGE Tax (on panic sells only):**
- **2% tax** if someone sells at >10% loss from their average buy price
- Split: 70% → RAGE fund, 30% → dev wallet
- Only applies to losing trades, diamond hands are rewarded!

### Phase 2 - After DEX Migration (at 85 ETH market cap)

**Trading Fees:**
- Liquidity migrates to custom Uniswap V2-style pair
- **0.3% total fee forever**
  - 0.15% → dev wallet
  - 0.10% → RAGE fund (distributed to holders)
  - 0.05% → auto-buyback & burn

### 💎 Diamond Hands Reward System

**At migration, 90% of accumulated RAGE fund is distributed to token holders!**

**Vesting Schedule (Prevents Dumps):**
- 25% claimable every 30 days over 90 days
- Must maintain token balance to claim proportionally
- **Holding requirement:** Sell tokens = lose unclaimed rewards proportionally
- True diamond hands get maximum rewards! 💎🙌

**Example:**
- You hold 1% of supply at migration
- RAGE fund has 100 ETH → 90 ETH distributed to holders
- You're entitled to 0.9 ETH over 90 days
- Day 30: Claim 0.225 ETH (25%)
- Day 60: Claim 0.225 ETH (25%)
- Day 90: Claim 0.45 ETH (50%)
- If you sell 50% of tokens on Day 45, you lose 50% of unclaimed rewards

## 🏆 Competitive Advantages

### vs Pump.fun (Solana)
- ✅ **Monad speed advantage** - 10k TPS vs 65k TPS (Solana theoretical)
- ✅ **EVM compatibility** - Access to entire Ethereum ecosystem
- ✅ **Better anti-snipe** - 5min lock + 30min gradual unlock vs instant sniping
- ✅ **Creator vesting** - 50% locked until migration vs instant dumps
- ✅ **Diamond hands rewards** - 90% of RAGE fund to holders vs nothing
- ✅ **Referral system** - Earn 0.05% on referred trades vs no incentives
- ✅ **Holding requirements** - Vested rewards punish sellers vs no accountability

### vs Traditional DEX Launches
- ✅ **Fair price discovery** - Bonding curve vs pre-set prices
- ✅ **No liquidity requirements** - Auto-migrates at 85 ETH vs manual LP
- ✅ **Anti-rug protection** - Zero creator fees vs rug pulls everywhere
- ✅ **Built-in marketing** - Referrals + rage tax incentives vs nothing

### vs Other Monad Launchpads
- ✅ **First mover advantage** - Already deployed on testnet
- ✅ **Comprehensive feature set** - Anti-snipe, referrals, vesting, rage tax
- ✅ **Fair tokenomics** - Transparent fee structure
- ✅ **Community-first** - 90% of RAGE fund to holders, not team

### Why Monad?
- ⚡ **10,000 TPS** - Near-instant finality, no waiting
- 💰 **Cheap gas** - Fraction of Ethereum mainnet costs
- 🔄 **EVM compatible** - All Ethereum tools work (MetaMask, Ethers.js, etc.)
- 🚀 **Growing ecosystem** - Early opportunity before mainnet
- 🏗️ **Parallel execution** - MonadBFT consensus for maximum throughput

## 🏗️ Architecture

### Smart Contracts
1. **ScreamFactory.sol** - Main factory for creating meme tokens
   - Handles token creation with bonding curve
   - Manages creator allocations and vesting
   - Tracks referrals and commissions
   - Implements anti-snipe protection
2. **BondingCurve.sol** - Bonding curve with rage tax logic
   - Linear constant product curve (x * y = k)
   - Anti-snipe: 5min lock + 30min gradual unlock
   - Rage tax on panic sells (>10% loss)
   - Tracks individual buy prices for tax calculation
3. **ScreamToken.sol** - ERC20 token template
   - Standard ERC20 with bonding curve integration
   - Trading disabled until DEX migration
4. **RAGEFund.sol** - Accumulates and distributes rage taxes
   - Collects trading fees and rage taxes
   - Implements vesting with holding requirements
   - Pro-rata distribution to holders at migration
5. **CustomUniswapV2Factory.sol** - Custom AMM factory with fee switches
   - Creates pairs with 0.3% configurable fees
   - Dev fee recipient control
6. **CustomUniswapV2Pair.sol** - Custom pair with 0.3% configurable fees
   - Modified Uniswap V2 with custom fee structure

### Frontend
- **Next.js 16** + React 19 (App Router)
- **Ethers.js v6** for Web3 interactions
- **Tailwind CSS 3.x** for styling
- **Wallet connection** with MetaMask
- Real-time token stats and price charts
- **Anti-snipe warnings** during lock period
- **Referral input** for commission tracking
- **Creator claim button** for vested allocations
- Rage sell warnings for losing trades
- **Responsive design** for mobile/desktop

## 🔒 Anti-Snipe Protection System

Prevents bots and snipers from dominating early trades:

### Phase 1: Initial Lock (5 minutes)
- **ALL** tokens locked immediately after creation
- No one can buy or sell, including creator
- Fair starting line for everyone

### Phase 2: Gradual Unlock (30 minutes)
- Tokens unlock linearly over 30 minutes
- Example: After 15 minutes, 50% of tokens available
- Early buyers get proportional access
- **No maximum buy limit** - just gradual availability
- Prevents bots from buying entire supply instantly

### Why This Works
- Bots can't snipe the entire supply in first block
- Fair distribution over time
- Human traders compete on equal footing
- No gas wars, no front-running

## 👥 Referral System

Earn passive income by referring traders:

- **0.05% commission** on all referred trades
- Commission taken from dev fee portion (no extra cost to traders)
- Tracked on-chain via referral address
- Claimable anytime via smart contract
- Works for both buys and sells
- Lifetime tracking per referrer

**How to use:**
1. Share your wallet address with traders
2. They enter it in "Referrer Address (Optional)" field
3. You earn 0.05% of their trade volume
4. Claim rewards whenever you want

## 🎨 Creator Allocation System

Optional allocation for token creators:

### Allocation Range
- **0-10%** of total supply (creator chooses)
- Taken from bonding curve supply
- Example: 10% allocation = 100M tokens from 1B supply

### Vesting Schedule
- **50%** immediately claimable at creation
- **50%** locked until DEX migration
- Prevents creators from dumping on early buyers
- Aligns creator incentives with project success

**Why 50/50 split?**
- Immediate tokens for marketing/giveaways/liquidity
- Locked tokens ensure creator stays committed
- Can't rug pull, must wait for migration

## 🔧 Technical Specifications

### Contract Parameters

**Token Supply:**
- Total supply: `1,000,000,000` (1 billion tokens)
- Bonding curve supply: `800,000,000` (80%)
- DEX liquidity reserve: `200,000,000` (20%)

**Trading Fees (Phase 1):**
- Base fee: `40 basis points` (0.4%)
  - Dev portion: `20 bps` (0.2%)
  - RAGE fund: `20 bps` (0.2%)
- Rage tax: `200 basis points` (2%)
  - Applied when: Sell price > 10% below average buy price
  - Split: 70% RAGE fund, 30% dev wallet

**Trading Fees (Phase 2 - Post Migration):**
- Total fee: `30 basis points` (0.3%)
  - Dev: `15 bps` (0.15%)
  - RAGE fund: `10 bps` (0.10%)
  - Buyback/burn: `5 bps` (0.05%)

**Referral Commission:**
- Rate: `5 basis points` (0.05%)
- Source: Deducted from dev fee portion

**Anti-Snipe Timings:**
- Initial lock: `300 seconds` (5 minutes)
- Gradual unlock: `1800 seconds` (30 minutes)
- Total protection: `2100 seconds` (35 minutes)

**Bonding Curve:**
- Type: Linear constant product (`x * y = k`)
- Formula: `price = virtualETH / virtualTokens`
- Migration threshold: `85 ETH` market cap

**Vesting Schedules:**
- Creator allocation: 50% immediate, 50% at migration
- RAGE distribution: 25% every 30 days (4 periods over 90 days)
- Holding requirement: Proportional to current token balance

### Security Features

**Solidity Version:** `^0.8.24`

**OpenZeppelin Dependencies:**
- `ReentrancyGuard` - Prevents reentrancy attacks
- `ERC20` - Standard token implementation
- `Ownable` - Access control for admin functions

**Custom Security:**
- Time-based trading locks
- Average buy price tracking per wallet
- Slippage protection on trades
- Proportional vesting with holding requirements

## 👨‍💻 For Developers

### Project Structure

```
scream-fun/
├── contracts/               # Solidity smart contracts
│   ├── ScreamFactory.sol   # Main factory contract
│   ├── BondingCurve.sol    # Bonding curve logic
│   ├── ScreamToken.sol     # ERC20 token template
│   ├── RAGEFund.sol        # Fee collection & distribution
│   ├── CustomUniswapV2Factory.sol
│   └── CustomUniswapV2Pair.sol
├── scripts/                # Deployment scripts
│   └── deploy.js           # Main deployment script
├── frontend/               # Next.js 16 frontend
│   ├── app/                # App router pages
│   ├── components/         # React components
│   ├── lib/                # Utility functions
│   └── public/             # Static assets
├── hardhat.config.js       # Hardhat configuration
└── package.json            # Dependencies
```

### Key Functions

**ScreamFactory.sol:**
```solidity
function createToken(
    string memory name,
    string memory symbol,
    string memory imageUrl,
    string memory xProfile,
    uint256 creatorAllocationBps,
    address referrer
) external returns (address tokenAddress)
```

**BondingCurve.sol:**
```solidity
function buy(uint256 minTokensOut, address referrer) external payable
function sell(uint256 tokenAmount, uint256 minETHOut) external
function getPrice() external view returns (uint256)
```

**RAGEFund.sol:**
```solidity
function claimVestedRewards(address token) external
function getClaimableAmount(address token, address holder) external view
```

### Integration Example

```javascript
import { ethers } from 'ethers';

// Connect to contract
const factory = new ethers.Contract(
  SCREAM_FACTORY_ADDRESS,
  FACTORY_ABI,
  signer
);

// Create token
const tx = await factory.createToken(
  "My Meme Token",
  "MEME",
  "https://example.com/image.png",
  "@mytwitter",
  500,  // 5% creator allocation (500 bps)
  ethers.ZeroAddress  // No referrer
);

// Buy tokens
const bondingCurve = new ethers.Contract(
  tokenAddress,
  BONDING_CURVE_ABI,
  signer
);

const buyTx = await bondingCurve.buy(
  minTokensOut,
  referrerAddress,
  { value: ethers.parseEther("0.1") }
);
```

### Testing Locally

```bash
# Start local Hardhat node
npx hardhat node

# Deploy to local node
npx hardhat run scripts/deploy.js --network localhost

# Run tests
npx hardhat test
```

## 📦 Installation

### Prerequisites
- Node.js 22 LTS (already installed via nvm)
- MetaMask browser extension
- MON tokens for gas (Monad testnet/mainnet)

### Install Dependencies

```bash
# Install contract dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
```

## 🚀 Deployment

### Step 1: Configure Environment

Create `.env` file in root directory:

```bash
cp .env.example .env
```

Edit `.env`:
```env
PRIVATE_KEY=your_private_key_here
DEV_WALLET=0xYourDevWalletAddress
MONAD_TESTNET_RPC=https://testnet-rpc.monad.xyz
MONAD_MAINNET_RPC=https://rpc.monad.xyz
```

### Step 2: Compile Contracts

```bash
npm run compile
```

### Step 3: Deploy to Monad Testnet

```bash
npm run deploy:testnet
```

This will:
1. Deploy RAGEFund
2. Deploy CustomUniswapV2Factory
3. Deploy ScreamFactory
4. Configure fee recipients
5. Save deployment info to `deployment.json`

### Step 4: Update Frontend Config

Create `frontend/.env.local`:

```bash
cd frontend
cp .env.example .env.local
```

Edit `frontend/.env.local` with addresses from `deployment.json`:
```env
NEXT_PUBLIC_SCREAM_FACTORY=0x...
NEXT_PUBLIC_RAGE_FUND=0x...
NEXT_PUBLIC_UNISWAP_FACTORY=0x...
NEXT_PUBLIC_NETWORK=testnet
```

### Step 5: Run Frontend

```bash
cd frontend
npm run dev
```

Visit http://localhost:3000

## 🎮 Usage

### Creating a Token

1. Connect your wallet
2. Switch to Monad Testnet (chain ID 10143)
3. Fill in token name and symbol
4. Click "Create Token (FREE)"
5. Confirm transaction

### Buying Tokens

1. Select a token from the list
2. Enter ETH amount to spend
3. Click "Buy"
4. Hear the scream! 🔊

### Selling Tokens

1. Enter token amount to sell
2. If selling at >10% loss, you'll see a rage tax warning
3. Click "Sell" for normal sell
4. Or click **"😱 RAGE SELL"** to accept the 2% tax

### Claiming RAGE Rewards

- RAGE fund accumulates from trading fees and rage taxes
- Periodic distributions to all token holders
- Use the claim function when available

## 📝 Smart Contract Commands

```bash
# Compile contracts
npm run compile

# Deploy to testnet
npm run deploy:testnet

# Deploy to mainnet
npm run deploy:mainnet

# Create test token (after deployment)
npm run create-token:testnet

# Run tests
npm test

# Run local Hardhat node
npm run node
```

## 🔧 Frontend Commands

```bash
cd frontend

# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start
```

## 🌐 Network Configuration

### Monad Testnet
- Chain ID: `10143` (0x279F)
- RPC: `https://testnet-rpc.monad.xyz`
- Explorer: `https://testnet.monadexplorer.com`
- Currency: MON

### Monad Mainnet
- Chain ID: `143` (0x8F)
- RPC: `https://rpc.monad.xyz`
- Explorer: `https://monadexplorer.com`
- Currency: MON

## 📊 Contract Addresses

### Monad Testnet (Chain ID: 10143)

```
RAGEFund:              0xd22f524661d75E7e5ed0C066352aF82D2FD0Dc5A
CustomUniswapV2Factory: 0x57E508bBF0CB7CD6f5340cd8bD15d8cCd4fFe0e1
ScreamFactory:         0x7cff4191E85d06f490289737b13A7Ab4FCa5320a
Dev Wallet:            0xe891d92ed8cbb30c1df98e30e35bf3b0787b983c
```

**Testnet Explorer:**
- [View on Monad Testnet Explorer](https://testnet.monadexplorer.com)
- [RAGEFund Contract](https://testnet.monadexplorer.com/address/0xd22f524661d75E7e5ed0C066352aF82D2FD0Dc5A)
- [ScreamFactory Contract](https://testnet.monadexplorer.com/address/0x7cff4191E85d06f490289737b13A7Ab4FCa5320a)

### Monad Mainnet (Chain ID: 143)

```
Not yet deployed - awaiting mainnet launch
```

## 🎨 Customization

### Add Scream Sound

1. Download a scream sound effect (MP3 format)
2. Place it in `frontend/public/scream.mp3`
3. The sound plays automatically on every buy!

### Modify Fees

Edit `contracts/BondingCurve.sol`:
```solidity
uint256 public constant TRADING_FEE_BPS = 40; // 0.4%
uint256 public constant RAGE_TAX_BPS = 200; // 2%
```

### Change Migration Threshold

```solidity
uint256 public constant MIGRATION_THRESHOLD = 85 ether;
```

## 🔒 Security Features

- ✅ No creator fees (creators can't rug)
- ✅ Trading disabled until bonding curve allows
- ✅ ReentrancyGuard on all state-changing functions
- ✅ Slippage protection on buys/sells
- ✅ OpenZeppelin audited contracts
- ✅ Rage tax discourages panic selling
- ✅ Auto-migration to decentralized AMM

## 🐛 Troubleshooting

### "Insufficient funds" error
- Make sure you have MON tokens for gas
- Get testnet MON from Monad faucet

### "Wrong network" warning
- Click "Connect Wallet" to auto-switch to Monad
- Or manually add Monad network to MetaMask

### Frontend not showing tokens
- Check contract addresses in `frontend/.env.local`
- Make sure contracts are deployed
- Check browser console for errors

### Transaction failing
- Increase slippage tolerance
- Check you have enough token balance
- Verify contract hasn't migrated to AMM

## 📱 Platform Features

### Smart Contract Features
- ✅ Create unlimited meme tokens (FREE, pay only gas)
- ✅ Fair launch bonding curve (linear constant product)
- ✅ Anti-snipe protection (5min lock + 30min unlock)
- ✅ Creator allocation (0-10% with 50% vesting)
- ✅ Referral system (0.05% commission)
- ✅ Rage tax on panic sellers (2% on >10% loss)
- ✅ Auto-migration to DEX at 85 ETH market cap
- ✅ RAGE fund vesting distribution to holders (90%)
- ✅ Slippage protection on all trades
- ✅ ReentrancyGuard on critical functions

### Frontend Features
- ✅ Wallet integration (MetaMask)
- ✅ Real-time token stats (price, volume, holders)
- ✅ Progress bar to DEX migration
- ✅ Anti-snipe countdown timer
- ✅ Rage sell warnings for losing trades
- ✅ Creator claim button for vested tokens
- ✅ Referral address input
- ✅ Token image upload
- ✅ X (Twitter) profile integration
- ✅ Mobile responsive design
- ✅ Gradient Monad-themed UI (cyan/blue)
- ✅ Live network fee estimates
- ✅ Watermark branding on token cards

## 💎 Why Scream.fun?

1. **Zero Creator Fees** - No rug pulls, no honeypots
2. **Fair Launch** - Everyone buys from bonding curve
3. **Rage Tax** - Punishes panic sellers, rewards diamond hands
4. **Auto Migration** - Becomes a real DEX pair at threshold
5. **Profit Sharing** - Dev fees + RAGE distributions
6. **Monad Speed** - 10k TPS, near-instant finality
7. **Low Fees** - Cheap gas on Monad

## 🚀 Roadmap

### ✅ Completed (Testnet)
- [x] Core contracts (ScreamFactory, BondingCurve, RAGEFund)
- [x] Anti-snipe protection (5min lock + 30min gradual unlock)
- [x] Creator allocation with vesting (0-10%, 50/50 split)
- [x] Referral system (0.05% commission)
- [x] Bonding curve with rage tax (2% on panic sells)
- [x] Custom AMM with fee switches (0.3% configurable)
- [x] Frontend MVP (Next.js 16 + React 19)
- [x] Wallet integration (MetaMask)
- [x] Deployed to Monad testnet
- [x] Official Monad branding integration
- [x] Comprehensive tokenomics documentation

### 🔄 In Progress
- [ ] **RAGE vesting implementation** (Variant B - Linear with holding requirement)
  - Snapshot mechanism at migration
  - 25% every 30 days vesting schedule
  - Holding requirement checker
  - Proportional claim calculation
- [ ] Comprehensive testing of all features
- [ ] Bug fixes and optimizations

### 📅 Upcoming
- [ ] Security audit (pre-mainnet)
- [ ] Deploy to Monad mainnet
- [ ] Token price charts with TradingView
- [ ] Leaderboard (top traders, top gainers)
- [ ] Mobile-optimized UI improvements
- [ ] Multi-token RAGE distribution dashboard
- [ ] Analytics dashboard (volume, TVL, fees earned)
- [ ] Governance token for platform decisions

### 🎯 Future Ideas
- [ ] Cross-chain bridge integration
- [ ] NFT avatar system for traders
- [ ] Achievement badges (diamond hands, degen, whale, etc.)
- [ ] Social features (comments, likes, token profiles)
- [ ] Advanced charting and technical indicators
- [ ] Limit orders and stop-loss functionality

## 📄 License

MIT License - Go build, go make money.

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Report bugs** - Open an issue describing the problem
2. **Suggest features** - Share ideas for improvements
3. **Submit PRs** - Fix bugs or add features
4. **Test thoroughly** - Help us test on testnet
5. **Improve docs** - Make the README even better

### Development Guidelines
- Follow Solidity best practices
- Write tests for new features
- Document all functions
- Use consistent code style
- Test on testnet before mainnet

## 💬 Community & Support

- **GitHub Issues** - Report bugs and request features
- **Discord** - Join the community (link TBD)
- **Twitter/X** - Follow for updates (link TBD)
- **Telegram** - Community chat (link TBD)

## 🔗 Important Links

- **Monad Testnet Explorer:** https://testnet.monadexplorer.com
- **Monad Documentation:** https://docs.monad.xyz
- **MetaMask:** https://metamask.io
- **Hardhat Docs:** https://hardhat.org/docs
- **OpenZeppelin:** https://docs.openzeppelin.com

## ⚠️ Disclaimer

**IMPORTANT NOTICES:**

1. **Experimental Software** - This is beta software on testnet. Use at your own risk.
2. **Not Financial Advice** - Nothing here constitutes financial advice. DYOR.
3. **Smart Contract Risks** - Smart contracts can have bugs. Audit before mainnet.
4. **No Guarantees** - No guarantees of profit or functionality.
5. **Regulatory Compliance** - Ensure compliance with your local regulations.
6. **Testnet Only** - Currently deployed on testnet only. Mainnet TBD.

**MEME COIN WARNING:**
Meme coins are highly speculative and volatile. Only invest what you can afford to lose. Most meme coins go to zero. This platform does not endorse any specific token.

---

**Built with ❤️ (and rage) for the Monad ecosystem.**

🔥 **SCREAM.FUN** - Where fair launches meet diamond hands 💎🙌

Let's make degens rich. 🚀

---

**Version:** 1.0.0 (Testnet)
**Last Updated:** November 2025
**Status:** Active Development
