"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { BONDING_CURVE_ABI, ERC20_ABI, RAGE_FUND_ABI, CONTRACT_ADDRESSES } from "@/lib/contracts";
import { formatEther, parseEther, playScream } from "@/lib/web3";

export default function TokenCard({ tokenAddress, bondingCurveAddress }) {
  const [tokenInfo, setTokenInfo] = useState(null);
  const [curveInfo, setCurveInfo] = useState(null);
  const [buyAmount, setBuyAmount] = useState("");
  const [sellAmount, setSellAmount] = useState("");
  const [userBalance, setUserBalance] = useState("0");
  const [loading, setLoading] = useState(false);
  const [rageTaxInfo, setRageTaxInfo] = useState(null);
  const [devEarnings, setDevEarnings] = useState("0");
  const [rageFundBalance, setRageFundBalance] = useState("0");
  const [referrerAddress, setReferrerAddress] = useState("");
  const [lockedTokens, setLockedTokens] = useState("0");
  const [availableBalance, setAvailableBalance] = useState("0");
  const [creator, setCreator] = useState("");
  const [creatorClaimable, setCreatorClaimable] = useState("0");
  const [isCreator, setIsCreator] = useState(false);

  useEffect(() => {
    loadTokenInfo();
    const interval = setInterval(loadTokenInfo, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [tokenAddress]);

  async function loadTokenInfo() {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      // Load token info
      const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      const name = await token.name();
      const symbol = await token.symbol();
      const balance = await token.balanceOf(userAddress);

      setTokenInfo({ name, symbol });
      setUserBalance(ethers.formatEther(balance));

      // Load bonding curve info
      const curve = new ethers.Contract(bondingCurveAddress, BONDING_CURVE_ABI, provider);
      const price = await curve.getCurrentPrice();
      const marketCap = await curve.getMarketCap();
      const migrated = await curve.migrated();
      const tokensSold = await curve.realTokensSold();
      const totalVolume = await curve.totalVolume();
      const totalBuyVolume = await curve.totalBuyVolume();
      const totalSellVolume = await curve.totalSellVolume();
      const holderCount = await curve.holderCount();

      setCurveInfo({
        price: ethers.formatEther(price),
        marketCap: ethers.formatEther(marketCap),
        migrated,
        tokensSold: ethers.formatEther(tokensSold),
        totalVolume: ethers.formatEther(totalVolume),
        totalBuyVolume: ethers.formatEther(totalBuyVolume),
        totalSellVolume: ethers.formatEther(totalSellVolume),
        holderCount: holderCount.toString(),
      });

      // Load RAGE fund balance
      if (CONTRACT_ADDRESSES.RAGE_FUND) {
        const rageFund = new ethers.Contract(CONTRACT_ADDRESSES.RAGE_FUND, RAGE_FUND_ABI, provider);
        const balance = await rageFund.tokenBalance(tokenAddress);
        setRageFundBalance(ethers.formatEther(balance));
      }

      // Load locked tokens and available balance
      const locked = await curve.lockedTokens(userAddress);
      setLockedTokens(ethers.formatEther(locked.amount));

      const available = await curve.getAvailableBalance(userAddress);
      setAvailableBalance(ethers.formatEther(available));

      // Load creator info
      const creatorAddr = await curve.creator();
      setCreator(creatorAddr);
      setIsCreator(creatorAddr.toLowerCase() === userAddress.toLowerCase());

      if (creatorAddr.toLowerCase() === userAddress.toLowerCase()) {
        const claimable = await curve.getCreatorClaimable();
        setCreatorClaimable(ethers.formatEther(claimable));
      }

      // Check if sell would trigger rage tax
      if (parseFloat(balance) > 0) {
        const [wouldTrigger, taxAmount] = await curve.wouldTriggerRageTax(
          userAddress,
          balance
        );
        setRageTaxInfo({
          wouldTrigger,
          taxAmount: ethers.formatEther(taxAmount),
        });
      }
    } catch (error) {
      console.error("Error loading token info:", error);
    }
  }

  async function handleBuy() {
    if (!buyAmount || parseFloat(buyAmount) <= 0) {
      alert("Please enter an amount");
      return;
    }

    setLoading(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const curve = new ethers.Contract(bondingCurveAddress, BONDING_CURVE_ABI, signer);

      const ethAmount = parseEther(buyAmount);
      const tokensOut = await curve.calculatePurchaseReturn(ethAmount);

      // Allow 1% slippage
      const minTokens = (tokensOut * 99n) / 100n;

      // Parse referrer address (use zero address if invalid/empty)
      const referrer = ethers.isAddress(referrerAddress) ? referrerAddress : ethers.ZeroAddress;

      const tx = await curve.buy(minTokens, referrer, { value: ethAmount });
      await tx.wait();

      // Play scream sound!
      playScream();

      alert(`Success! Bought ${formatEther(tokensOut, 2)} tokens`);
      setBuyAmount("");
      loadTokenInfo();
    } catch (error) {
      console.error("Error buying:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatorClaim() {
    setLoading(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const curve = new ethers.Contract(bondingCurveAddress, BONDING_CURVE_ABI, signer);

      const tx = await curve.claimCreatorTokens();
      await tx.wait();

      alert(`Success! Claimed ${creatorClaimable} tokens`);
      loadTokenInfo();
    } catch (error) {
      console.error("Error claiming:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSell(isRageSell = false) {
    if (!sellAmount || parseFloat(sellAmount) <= 0) {
      alert("Please enter an amount");
      return;
    }

    setLoading(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const curve = new ethers.Contract(bondingCurveAddress, BONDING_CURVE_ABI, signer);
      const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);

      const tokenAmount = parseEther(sellAmount);

      // Check allowance
      const allowance = await token.allowance(await signer.getAddress(), bondingCurveAddress);
      if (allowance < tokenAmount) {
        const approveTx = await token.approve(bondingCurveAddress, ethers.MaxUint256);
        await approveTx.wait();
      }

      const ethOut = await curve.calculateSaleReturn(tokenAmount);
      const minEth = (ethOut * 99n) / 100n; // 1% slippage

      const tx = await curve.sell(tokenAmount, minEth, isRageSell);
      await tx.wait();

      alert(`Success! Sold for ${formatEther(ethOut, 4)} ETH`);
      setSellAmount("");
      loadTokenInfo();
    } catch (error) {
      console.error("Error selling:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  if (!tokenInfo || !curveInfo) {
    return (
      <div className="p-6 bg-gray-800 rounded-lg">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-800 rounded-lg space-y-6 relative overflow-hidden">
      {/* Watermark Logo */}
      <div className="absolute top-4 right-4 opacity-5 pointer-events-none">
        <img src="/logo.png" alt="" className="w-32 h-32 object-contain" />
      </div>

      {/* Header */}
      <div className="border-b border-gray-700 pb-4 relative z-10">
        <h2 className="text-3xl font-bold text-white">{tokenInfo.name}</h2>
        <p className="text-xl text-cyan-400 font-mono">${tokenInfo.symbol}</p>
        {curveInfo.migrated && (
          <span className="inline-block mt-2 px-3 py-1 bg-green-600 text-white text-sm rounded-full">
            Migrated to DEX
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-700 p-4 rounded-lg">
          <p className="text-sm text-gray-400">Price</p>
          <p className="text-lg font-bold text-white">{parseFloat(curveInfo.price).toFixed(8)} ETH</p>
        </div>
        <div className="bg-gray-700 p-4 rounded-lg">
          <p className="text-sm text-gray-400">Market Cap</p>
          <p className="text-lg font-bold text-white">{parseFloat(curveInfo.marketCap).toFixed(2)} ETH</p>
        </div>
        <div className="bg-gray-700 p-4 rounded-lg">
          <p className="text-sm text-gray-400">Total Volume</p>
          <p className="text-lg font-bold text-cyan-400">{parseFloat(curveInfo.totalVolume).toFixed(2)} ETH</p>
        </div>
        <div className="bg-gray-700 p-4 rounded-lg">
          <p className="text-sm text-gray-400">Holders</p>
          <p className="text-lg font-bold text-blue-400">{curveInfo.holderCount}</p>
        </div>
        <div className="bg-gray-700 p-4 rounded-lg">
          <p className="text-sm text-gray-400">Buy Volume</p>
          <p className="text-lg font-bold text-green-400">{parseFloat(curveInfo.totalBuyVolume).toFixed(2)} ETH</p>
        </div>
        <div className="bg-gray-700 p-4 rounded-lg">
          <p className="text-sm text-gray-400">Sell Volume</p>
          <p className="text-lg font-bold text-red-400">{parseFloat(curveInfo.totalSellVolume).toFixed(2)} ETH</p>
        </div>
        <div className="bg-gray-700 p-4 rounded-lg">
          <p className="text-sm text-gray-400">RAGE Fund</p>
          <p className="text-lg font-bold text-orange-400">{parseFloat(rageFundBalance).toFixed(4)} ETH</p>
        </div>
        <div className="bg-gray-700 p-4 rounded-lg">
          <p className="text-sm text-gray-400">Your Balance</p>
          <p className="text-lg font-bold text-cyan-400">{parseFloat(userBalance).toFixed(2)}</p>
        </div>
      </div>

      {/* Creator Claim Section */}
      {isCreator && parseFloat(creatorClaimable) > 0 && (
        <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border-2 border-yellow-500 p-4 rounded-lg">
          <h3 className="text-lg font-bold text-yellow-400 mb-2">👑 Creator Allocation</h3>
          <p className="text-sm text-gray-300 mb-3">
            You have {parseFloat(creatorClaimable).toFixed(2)} tokens ready to claim!
          </p>
          <button
            onClick={handleCreatorClaim}
            disabled={loading}
            className="w-full py-2 bg-gradient-to-r from-yellow-600 to-orange-600 text-white font-bold rounded-lg hover:from-yellow-700 hover:to-orange-700 transition disabled:opacity-50"
          >
            Claim Creator Tokens
          </button>
        </div>
      )}

      {/* Locked Tokens Warning */}
      {parseFloat(lockedTokens) > 0 && (
        <div className="bg-red-900/20 border border-red-500 p-4 rounded-lg">
          <h3 className="text-sm font-bold text-red-400 mb-1">🔒 Anti-Snipe Lock Active</h3>
          <p className="text-xs text-gray-300">
            {parseFloat(lockedTokens).toFixed(2)} tokens bought in first 5 minutes are locked.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Unlocking gradually over 30 minutes after snipe window ends.
          </p>
          <div className="mt-2">
            <div className="text-xs text-gray-400 mb-1">Available: {parseFloat(availableBalance).toFixed(2)}</div>
          </div>
        </div>
      )}

      {/* Buy Section */}
      <div className="bg-gray-700 p-4 rounded-lg">
        <h3 className="text-lg font-bold text-white mb-3">Buy {tokenInfo.symbol}</h3>
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="number"
              value={buyAmount}
              onChange={(e) => setBuyAmount(e.target.value)}
              placeholder="0.0 ETH"
              step="0.01"
              min="0"
              className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={handleBuy}
              disabled={loading || curveInfo.migrated}
              className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              Buy
            </button>
          </div>
          <input
            type="text"
            value={referrerAddress}
            onChange={(e) => setReferrerAddress(e.target.value)}
            placeholder="Referrer address (optional, earn them 0.05%)"
            className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">Fee: 0.4% (0.2% dev + 0.2% RAGE) + 0.05% referral</p>
      </div>

      {/* Sell Section */}
      <div className="bg-gray-700 p-4 rounded-lg">
        <h3 className="text-lg font-bold text-white mb-3">Sell {tokenInfo.symbol}</h3>
        {rageTaxInfo?.wouldTrigger && (
          <div className="mb-3 p-3 bg-red-900/30 border border-red-500 rounded-lg">
            <p className="text-red-400 font-bold">⚠️ RAGE TAX WARNING</p>
            <p className="text-sm text-red-300">
              Selling at a loss &gt;10%. Rage tax: {parseFloat(rageTaxInfo.taxAmount).toFixed(4)} ETH (2%)
            </p>
          </div>
        )}
        <div className="flex gap-2 mb-2">
          <input
            type="number"
            value={sellAmount}
            onChange={(e) => setSellAmount(e.target.value)}
            placeholder="0.0 Tokens"
            step="0.01"
            min="0"
            className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={() => handleSell(false)}
            disabled={loading || curveInfo.migrated || parseFloat(userBalance) === 0}
            className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition disabled:opacity-50"
          >
            Sell
          </button>
        </div>

        {/* RAGE SELL BUTTON */}
        {rageTaxInfo?.wouldTrigger && (
          <button
            onClick={() => handleSell(true)}
            disabled={loading || curveInfo.migrated}
            className="w-full mt-2 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-black rounded-lg hover:from-red-700 hover:to-orange-700 transition disabled:opacity-50 animate-pulse"
          >
            😱 RAGE SELL (Accept 2% Tax)
          </button>
        )}
        <p className="text-xs text-gray-400 mt-2">Max balance: {parseFloat(userBalance).toFixed(2)}</p>
      </div>

      {/* Progress to Migration */}
      <div className="bg-gray-700 p-4 rounded-lg">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-400">Progress to DEX Migration</span>
          <span className="text-sm font-bold text-white">
            {curveInfo.marketCap} / 85 ETH
          </span>
        </div>
        <div className="w-full bg-gray-600 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-cyan-600 to-blue-600 h-3 rounded-full transition-all"
            style={{ width: `${Math.min((parseFloat(curveInfo.marketCap) / 85) * 100, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
