// Contract addresses (update after deployment)
export const CONTRACT_ADDRESSES = {
  SCREAM_FACTORY: process.env.NEXT_PUBLIC_SCREAM_FACTORY || "",
  RAGE_FUND: process.env.NEXT_PUBLIC_RAGE_FUND || "",
  UNISWAP_FACTORY: process.env.NEXT_PUBLIC_UNISWAP_FACTORY || "",
};

// Monad network config
export const MONAD_TESTNET = {
  chainId: "0x279F", // 10143
  chainName: "Monad Testnet",
  nativeCurrency: {
    name: "MON",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: ["https://testnet-rpc.monad.xyz"],
  blockExplorerUrls: ["https://testnet.monadexplorer.com"],
};

export const MONAD_MAINNET = {
  chainId: "0x8F", // 143
  chainName: "Monad",
  nativeCurrency: {
    name: "MON",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: ["https://rpc.monad.xyz"],
  blockExplorerUrls: ["https://monadexplorer.com"],
};

// ABIs (simplified - add full ABIs from compiled contracts)
export const SCREAM_FACTORY_ABI = [
  "function createToken(string name, string symbol, string imageUrl, string description, string twitter, string telegram, string website, uint256 creatorAllocationBps) returns (address, address)",
  "function getTotalTokens() view returns (uint256)",
  "function getTokenInfo(uint256 index) view returns (tuple(address token, address bondingCurve, address creator, uint256 createdAt, string name, string symbol, string imageUrl, string description, string twitter, string telegram, string website))",
  "event TokenCreated(address indexed token, address indexed bondingCurve, address indexed creator, string name, string symbol, string imageUrl, string description, uint256 tokenId)",
];

export const BONDING_CURVE_ABI = [
  "function buy(uint256 minTokensOut, address referrer) payable",
  "function sell(uint256 tokenAmount, uint256 minEthOut, bool acceptRageTax)",
  "function calculatePurchaseReturn(uint256 ethAmount) view returns (uint256)",
  "function calculateSaleReturn(uint256 tokenAmount) view returns (uint256)",
  "function wouldTriggerRageTax(address seller, uint256 tokenAmount) view returns (bool, uint256)",
  "function getCurrentPrice() view returns (uint256)",
  "function getMarketCap() view returns (uint256)",
  "function token() view returns (address)",
  "function virtualTokenReserve() view returns (uint256)",
  "function realTokensSold() view returns (uint256)",
  "function ethReserve() view returns (uint256)",
  "function totalVolume() view returns (uint256)",
  "function totalBuyVolume() view returns (uint256)",
  "function totalSellVolume() view returns (uint256)",
  "function holderCount() view returns (uint256)",
  "function isHolder(address) view returns (bool)",
  "function migrated() view returns (bool)",
  "function creator() view returns (address)",
  "function creatorAllocation() view returns (uint256)",
  "function creatorClaimed() view returns (uint256)",
  "function getCreatorClaimable() view returns (uint256)",
  "function claimCreatorTokens()",
  "function getUnlockedTokens(address user) view returns (uint256)",
  "function getAvailableBalance(address user) view returns (uint256)",
  "function lockedTokens(address) view returns (tuple(uint256 amount, uint256 purchaseTime))",
  "function referralEarnings(address) view returns (uint256)",
  "function launchTime() view returns (uint256)",
  "event TokensPurchased(address indexed buyer, uint256 ethAmount, uint256 tokenAmount, uint256 fee, address indexed referrer, uint256 referralReward)",
  "event TokensSold(address indexed seller, uint256 tokenAmount, uint256 ethAmount, uint256 fee, uint256 rageTax)",
  "event CreatorClaimed(address indexed creator, uint256 amount)",
  "event ReferralPaid(address indexed referrer, address indexed buyer, uint256 amount)",
];

export const ERC20_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
];

export const RAGE_FUND_ABI = [
  "function tokenBalance(address) view returns (uint256)",
  "function getClaimable(address token, address user) view returns (uint256)",
  "function claim(address token)",
  "event Claimed(address indexed token, address indexed user, uint256 amount)",
];
