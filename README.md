



# 🔗 Meme Factory - Solana Smart Contracts

> ⚠️ **BETA - DEVNET ONLY** | Smart contracts currently deployed on Solana Devnet for testing.

Anchor-based smart contracts for the Meme Factory launchpad. Features anti-PVP protection, anti-bundling mechanisms, and bonding curve token launches.

## 📋 Overview

This repository contains the on-chain programs (smart contracts) for Meme Factory, a fair launch token launchpad on Solana.

**Frontend Repository:** [meme-factory-ui](https://github.com/Cryptologis/meme-factory-ui)

## ✨ Core Features

### Anti-PVP Protection
- Bot protection for first 5 blocks after token creation
- Prevents front-running and sniper bots
- Fair launch for all participants

### Anti-Bundling (2% Wallet Limit)
- Maximum 2% of total supply per wallet for first 15 minutes
- Prevents whale manipulation
- Ensures fair distribution

### Bonding Curve Mechanism
- Constant product bonding curve (x * y = k)
- Automatic price discovery
- Locked liquidity (30 days minimum)

### Creator Economics
- Creator receives fees on every trade
- Sustainable passive income model
- Automated fee distribution

## 🏗️ Architecture

### Program Structure
```
programs/
└── meme_chain/
    └── src/
        ├── lib.rs              # Main program logic
        ├── instructions/       # Instruction handlers
        ├── state/             # Account structures
        └── errors.rs          # Custom errors
```

### Key Instructions

1. **initialize_protocol** - Set up the protocol with fees and parameters
2. **create_meme_token** - Launch a new token with bonding curve
3. **buy_tokens** - Purchase tokens from the bonding curve
4. **sell_tokens** - Sell tokens back to the bonding curve

### Account Structure

- **Protocol** - Global protocol configuration
- **MemeToken** - Individual token state
- **BondingCurveVault** - Holds liquidity for each token

## 🛠️ Tech Stack

- **Anchor Framework** - v0.29+
- **Solana Program Library (SPL)**
- **Rust** - Smart contract language
- **Solana Web3.js** - Client interaction

## 📦 Installation

### Prerequisites
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
```

### Build & Deploy
```bash
# Clone repository
git clone https://github.com/Cryptologis/meme-factory-solana.git
cd meme-factory-solana

# Install dependencies
npm install

# Build program
anchor build

# Run tests
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

## 🧪 Testing
```bash
# Run all tests
anchor test

# Run specific test
anchor test -- --test test_create_token

# Test with logs
anchor test -- --show-output
```

## 📊 Program Parameters

### Bonding Curve
- Initial Virtual SOL: 30 SOL
- Initial Virtual Tokens: 800,000
- Constant Product: k = 30 × 800,000

### Fees
- Platform Fee: 1%
- Creator Fee: 0.5%
- Total Fee: 1.5% per trade

### Security Limits
- Max Wallet (15 min): 2% of total supply
- Bot Protection: First 5 blocks
- Liquidity Lock: 30 days minimum

## 🔐 Security Features

- ✅ PDA-based account ownership
- ✅ Reentrancy protection
- ✅ Overflow/underflow checks
- ✅ Time-based restrictions
- ✅ Wallet limit enforcement
- ✅ Admin authority controls

## 🐛 Known Issues (Devnet Beta)

- Transaction confirmation timeouts (transactions succeed but may show timeout errors)
- Some edge cases in bonding curve calculations need refinement
- Gas optimization opportunities exist

## 🗺️ Roadmap

### Current (Devnet Testing)
- [x] Core token creation
- [x] Buy/Sell functionality
- [x] Anti-PVP protection
- [x] Anti-bundling (2% limit)
- [x] Creator rewards

### Before Mainnet
- [ ] Comprehensive security audit
- [ ] Gas optimization
- [ ] Edge case testing
- [ ] Stress testing with high volume
- [ ] Bug bounty program

### Future Enhancements
- [ ] Graduated tokens (AMM integration)
- [ ] Dynamic fee structures
- [ ] Multi-sig protocol authority
- [ ] Upgradeable proxy pattern

## 📝 Program IDs

### Devnet
```
Program ID: [Your Program ID Here]
```

### Mainnet
```
Not yet deployed
```

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Submit a pull request

## 🔍 Audit Status

⚠️ **NOT AUDITED** - This program has not undergone a professional security audit. Use at your own risk on devnet only.

## 📜 License

MIT License

## 🔗 Links

- **Frontend Repo:** [meme-factory-ui](https://github.com/Cryptologis/meme-factory-ui)
- **Live Demo:** [meme-factory-ui.vercel.app](https://meme-factory-ui.vercel.app)
- **Anchor Docs:** [anchor-lang.com](https://www.anchor-lang.com/)
- **Solana Docs:** [docs.solana.com](https://docs.solana.com/)

## 💬 Questions?

Open an issue or reach out via the frontend repository.

---

**⚠️ DISCLAIMER:**
- **BETA** smart contracts on **Devnet** only
- **NOT audited** - use at your own risk
- Subject to breaking changes
- Not financial advice

**Built with ❤️ on Solana**
ENDOFFILE

echo "✅ Smart contract README created!"
