"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import CreateTokenForm from "@/components/CreateTokenForm";
import TokenCard from "@/components/TokenCard";
import { CONTRACT_ADDRESSES, SCREAM_FACTORY_ABI, BONDING_CURVE_ABI } from "@/lib/contracts";

export default function Home() {
  const [tokens, setTokens] = useState([]);
  const [enrichedTokens, setEnrichedTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedToken, setSelectedToken] = useState(null);

  useEffect(() => {
    loadTokens();
  }, []);

  async function loadTokens() {
    if (!CONTRACT_ADDRESSES.SCREAM_FACTORY) {
      setLoading(false);
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const factory = new ethers.Contract(
        CONTRACT_ADDRESSES.SCREAM_FACTORY,
        SCREAM_FACTORY_ABI,
        provider
      );

      const totalTokens = await factory.getTotalTokens();
      const tokenList = [];

      for (let i = 0; i < totalTokens; i++) {
        const info = await factory.getTokenInfo(i);

        // Get bonding curve metrics
        const curve = new ethers.Contract(info.bondingCurve, BONDING_CURVE_ABI, provider);
        const marketCap = await curve.getMarketCap();
        const totalVolume = await curve.totalVolume();
        const holderCount = await curve.holderCount();
        const migrated = await curve.migrated();

        tokenList.push({
          id: i,
          token: info.token,
          bondingCurve: info.bondingCurve,
          creator: info.creator,
          name: info.name,
          symbol: info.symbol,
          imageUrl: info.imageUrl,
          description: info.description,
          twitter: info.twitter,
          telegram: info.telegram,
          website: info.website,
          createdAt: Number(info.createdAt),
          marketCap: parseFloat(ethers.formatEther(marketCap)),
          totalVolume: parseFloat(ethers.formatEther(totalVolume)),
          holderCount: Number(holderCount),
          migrated,
        });
      }

      setTokens(tokenList);
      setEnrichedTokens(tokenList);
    } catch (error) {
      console.error("Error loading tokens:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleTokenCreated() {
    loadTokens();
  }

  // Filter tokens
  const nonMigratedTokens = enrichedTokens.filter(t => !t.migrated);
  const migratedTokens = enrichedTokens.filter(t => t.migrated);
  const aboutToMigrateTokens = nonMigratedTokens.filter(t => t.marketCap >= 70).sort((a, b) => b.marketCap - a.marketCap);
  const recentlyCreated = nonMigratedTokens.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);

  // King of Scream: highest (volume × marketCap)
  const kingOfScream = nonMigratedTokens.length > 0
    ? nonMigratedTokens.reduce((prev, curr) =>
        (curr.totalVolume * curr.marketCap) > (prev.totalVolume * prev.marketCap) ? curr : prev
      )
    : null;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center py-12">
        <h1 className="text-6xl font-black text-white mb-4">
          Welcome to{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
            SCREAM.FUN
          </span>
        </h1>
        <p className="text-xl text-gray-300 mb-6">
          The fairest meme coin launchpad on Monad. No rugs. No BS. Just vibes.
        </p>
        <div className="flex gap-6 justify-center text-center">
          <div className="bg-gray-800 px-6 py-4 rounded-lg">
            <p className="text-3xl font-bold text-cyan-400">0.4%</p>
            <p className="text-sm text-gray-400">Trading Fee</p>
          </div>
          <div className="bg-gray-800 px-6 py-4 rounded-lg">
            <p className="text-3xl font-bold text-red-400">2%</p>
            <p className="text-sm text-gray-400">Rage Tax</p>
          </div>
          <div className="bg-gray-800 px-6 py-4 rounded-lg">
            <p className="text-3xl font-bold text-green-400">85 ETH</p>
            <p className="text-sm text-gray-400">DEX Migration</p>
          </div>
        </div>
      </div>

      {/* Create Token */}
      <div className="max-w-2xl mx-auto">
        <CreateTokenForm onSuccess={handleTokenCreated} />
      </div>

      {/* Selected Token Detail */}
      {selectedToken && (
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => setSelectedToken(null)}
            className="mb-4 text-cyan-400 hover:text-cyan-300"
          >
            ← Back to all tokens
          </button>
          <TokenCard
            tokenAddress={selectedToken.token}
            bondingCurveAddress={selectedToken.bondingCurve}
          />
        </div>
      )}

      {/* Showcase Sections */}
      {!selectedToken && !loading && enrichedTokens.length > 0 && (
        <div className="space-y-12">
          {/* King of Scream */}
          {kingOfScream && (
            <section>
              <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-6 flex items-center gap-3">
                👑 King of Scream
              </h2>
              <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border-2 border-yellow-500 rounded-lg p-6">
                <TokenPreviewCard token={kingOfScream} onClick={() => setSelectedToken(kingOfScream)} featured />
              </div>
            </section>
          )}

          {/* Recently Created */}
          {recentlyCreated.length > 0 && (
            <section>
              <h2 className="text-3xl font-bold text-white mb-6">🚀 Recently Created</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentlyCreated.map((token) => (
                  <TokenPreviewCard key={token.id} token={token} onClick={() => setSelectedToken(token)} />
                ))}
              </div>
            </section>
          )}

          {/* About to Migrate */}
          {aboutToMigrateTokens.length > 0 && (
            <section>
              <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-6">
                🔥 About to Migrate (70+ ETH)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {aboutToMigrateTokens.map((token) => (
                  <TokenPreviewCard key={token.id} token={token} onClick={() => setSelectedToken(token)} />
                ))}
              </div>
            </section>
          )}

          {/* Migrated */}
          {migratedTokens.length > 0 && (
            <section>
              <h2 className="text-3xl font-bold text-green-400 mb-6">✅ Migrated to DEX</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {migratedTokens.map((token) => (
                  <TokenPreviewCard key={token.id} token={token} onClick={() => setSelectedToken(token)} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Empty State */}
      {!selectedToken && !loading && enrichedTokens.length === 0 && (
        <div>
          {!CONTRACT_ADDRESSES.SCREAM_FACTORY ? (
            <div className="text-center py-12 bg-yellow-900/20 border border-yellow-600 rounded-lg p-6">
              <p className="text-yellow-400 font-bold mb-2">⚠️ Contracts Not Deployed</p>
              <p className="text-gray-300">
                Please deploy the contracts first using: <code className="bg-gray-800 px-2 py-1 rounded">npm run deploy:testnet</code>
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Then update the contract addresses in your .env.local file
              </p>
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-800 rounded-lg">
              <p className="text-2xl mb-4">🚀</p>
              <p className="text-gray-400">Be the first to create a meme token!</p>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <p className="text-gray-400">Loading tokens...</p>
        </div>
      )}
    </div>
  );
}

function TokenPreviewCard({ token, onClick, featured = false }) {
  const progress = (token.marketCap / 85) * 100;
  const score = token.totalVolume * token.marketCap;

  return (
    <div
      onClick={onClick}
      className={`bg-gray-800 p-6 rounded-lg cursor-pointer hover:bg-gray-700 transition border-2 ${
        featured ? 'border-yellow-500' : 'border-transparent hover:border-blue-500'
      }`}
    >
      {/* Image */}
      {token.imageUrl && (
        <div className="mb-4">
          <img
            src={token.imageUrl}
            alt={token.name}
            className="w-full h-48 object-cover rounded-lg"
          />
        </div>
      )}

      {/* Header */}
      <div className="mb-3">
        <h3 className="text-xl font-bold text-white mb-1">{token.name}</h3>
        <p className="text-cyan-400 font-mono">${token.symbol}</p>
        {token.migrated && (
          <span className="inline-block mt-2 px-2 py-1 bg-green-600 text-white text-xs rounded-full">
            Migrated
          </span>
        )}
      </div>

      {/* Description */}
      {token.description && (
        <p className="text-sm text-gray-400 mb-3 line-clamp-2">{token.description}</p>
      )}

      {/* Social Links */}
      {(token.twitter || token.telegram || token.website) && (
        <div className="flex gap-2 mb-3">
          {token.twitter && (
            <a
              href={token.twitter.startsWith('http') ? token.twitter : `https://twitter.com/${token.twitter.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              🐦 Twitter
            </a>
          )}
          {token.telegram && (
            <a
              href={token.telegram}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              ✈️ Telegram
            </a>
          )}
          {token.website && (
            <a
              href={token.website}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              🌐 Website
            </a>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
        <div>
          <p className="text-gray-500">Market Cap</p>
          <p className="text-white font-bold">{token.marketCap.toFixed(2)} ETH</p>
        </div>
        <div>
          <p className="text-gray-500">Volume</p>
          <p className="text-cyan-400 font-bold">{token.totalVolume.toFixed(2)} ETH</p>
        </div>
        <div>
          <p className="text-gray-500">Holders</p>
          <p className="text-blue-400 font-bold">{token.holderCount}</p>
        </div>
        {featured && (
          <div>
            <p className="text-gray-500">Score</p>
            <p className="text-yellow-400 font-bold">{score.toFixed(0)}</p>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {!token.migrated && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Migration Progress</span>
            <span>{progress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-cyan-600 to-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Trade Button */}
      <button className="w-full py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 transition font-bold">
        Trade →
      </button>
    </div>
  );
}
