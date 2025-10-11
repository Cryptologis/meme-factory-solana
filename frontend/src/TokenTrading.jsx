import React, { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PROGRAM_ID } from './constants';
import IDL from './meme_chain_solana.json';

export function TokenTrading({ tokenData }) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [buyAmount, setBuyAmount] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [estimatedReturn, setEstimatedReturn] = useState(0);
  const [loading, setLoading] = useState(false);
  const [antiBundleActive, setAntiBundleActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [maxBuyAmount, setMaxBuyAmount] = useState(0);

  useEffect(() => {
    if (!tokenData) return;
    
    const now = Math.floor(Date.now() / 1000);
    const timeSinceLaunch = now - tokenData.createdAt;
    const antiBundleDuration = 900;
    
    if (timeSinceLaunch < antiBundleDuration) {
      setAntiBundleActive(true);
      setTimeRemaining(antiBundleDuration - timeSinceLaunch);
      const maxAllowed = (tokenData.totalSupply * 250) / 10000;
      setMaxBuyAmount(maxAllowed);
      
      const interval = setInterval(() => {
        const newTimeRemaining = antiBundleDuration - (Math.floor(Date.now() / 1000) - tokenData.createdAt);
        if (newTimeRemaining <= 0) {
          setAntiBundleActive(false);
          setTimeRemaining(0);
          clearInterval(interval);
        } else {
          setTimeRemaining(newTimeRemaining);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [tokenData]);

  useEffect(() => {
    if (buyAmount && !isNaN(buyAmount) && tokenData) {
      const amount = parseFloat(buyAmount);
      const avgPrice = tokenData.currentPrice + (amount * 0.00001);
      const cost = (amount * avgPrice) / 1e9;
      setEstimatedCost(cost.toFixed(4));
    } else {
      setEstimatedCost(0);
    }
  }, [buyAmount, tokenData]);

  useEffect(() => {
    if (sellAmount && !isNaN(sellAmount) && tokenData) {
      const amount = parseFloat(sellAmount);
      const avgPrice = tokenData.currentPrice - (amount * 0.00001);
      const returnAmount = (amount * avgPrice) / 1e9;
      setEstimatedReturn(returnAmount.toFixed(4));
    } else {
      setEstimatedReturn(0);
    }
  }, [sellAmount, tokenData]);

  const handleBuy = async () => {
    if (!wallet.connected || !buyAmount) return;
    
    const amount = parseFloat(buyAmount);
    
    if (antiBundleActive && amount > maxBuyAmount) {
      alert(`Anti-bundling active! Maximum purchase: ${maxBuyAmount.toLocaleString()} tokens (2.5% of supply)`);
      return;
    }
    
    setLoading(true);
    try {
      const provider = new anchor.AnchorProvider(connection, wallet, {});
      const program = new anchor.Program(IDL, new PublicKey(PROGRAM_ID), provider);

      const memePubkey = new PublicKey(tokenData.publicKey);
      
      const [protocolPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('protocol')],
        program.programId
      );

      const [buyerTokenAccount] = PublicKey.findProgramAddressSync(
        [
          wallet.publicKey.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          memePubkey.toBuffer()
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const [bondingCurveVault] = PublicKey.findProgramAddressSync(
        [Buffer.from('bonding_curve_vault'), memePubkey.toBuffer()],
        program.programId
      );

      const maxSolCost = Math.floor(parseFloat(estimatedCost) * 1.05 * 1e9);

      const tx = await program.methods
        .buyTokens(new anchor.BN(amount), new anchor.BN(maxSolCost))
        .accounts({
          buyer: wallet.publicKey,
          meme: memePubkey,
          protocol: protocolPDA,
          buyerTokenAccount,
          bondingCurveVault,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .rpc();

      alert(`Success! Bought ${amount} tokens. TX: ${tx}`);
      setBuyAmount('');
    } catch (error) {
      console.error('Buy error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSell = async () => {
    alert('Sell functionality coming soon!');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!tokenData) return null;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
      border: '1px solid rgba(139, 92, 246, 0.3)',
      borderRadius: '20px',
      padding: '32px',
      backdropFilter: 'blur(10px)',
      marginTop: '32px'
    }}>
      <h3 style={{ color: 'white', fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>
        💰 Trade {tokenData.name} ({tokenData.symbol})
      </h3>

      {antiBundleActive && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.5)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ color: '#fbbf24', fontWeight: '700', marginBottom: '8px' }}>
            ⚠️ Anti-Bundling Protection Active
          </div>
          <div style={{ color: '#d1d5db', fontSize: '14px', marginBottom: '8px' }}>
            Max purchase: <strong>{maxBuyAmount.toLocaleString()} tokens</strong> (2.5% of supply)
          </div>
          <div style={{ color: '#9ca3af', fontSize: '13px' }}>
            Time remaining: {formatTime(timeRemaining)}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div>
          <h4 style={{ color: '#10b981', fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
            🟢 Buy Tokens
          </h4>
          
          <input
            type="number"
            value={buyAmount}
            onChange={(e) => setBuyAmount(e.target.value)}
            placeholder="Enter amount"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: 'rgba(31, 41, 55, 0.8)',
              color: 'white',
              borderRadius: '10px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              fontSize: '16px',
              marginBottom: '12px'
            }}
          />

          {buyAmount && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '12px',
              fontSize: '14px',
              color: '#d1d5db'
            }}>
              Cost: <strong style={{ color: '#10b981' }}>{estimatedCost} SOL</strong>
            </div>
          )}

          <button
            onClick={handleBuy}
            disabled={loading || !buyAmount}
            style={{
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white',
              borderRadius: '12px',
              fontWeight: '700',
              border: 'none',
              cursor: !buyAmount ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              opacity: !buyAmount ? 0.5 : 1
            }}
          >
            {loading ? '⏳ Buying...' : '🟢 Buy Now'}
          </button>
        </div>

        <div>
          <h4 style={{ color: '#ef4444', fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
            🔴 Sell Tokens
          </h4>
          
          <input
            type="number"
            value={sellAmount}
            onChange={(e) => setSellAmount(e.target.value)}
            placeholder="Enter amount"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: 'rgba(31, 41, 55, 0.8)',
              color: 'white',
              borderRadius: '10px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              fontSize: '16px',
              marginBottom: '12px'
            }}
          />

          {sellAmount && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '12px',
              fontSize: '14px',
              color: '#d1d5db'
            }}>
              Receive: <strong style={{ color: '#ef4444' }}>{estimatedReturn} SOL</strong>
            </div>
          )}

          <button
            onClick={handleSell}
            disabled={loading || !sellAmount}
            style={{
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: 'white',
              borderRadius: '12px',
              fontWeight: '700',
              border: 'none',
              cursor: !sellAmount ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              opacity: !sellAmount ? 0.5 : 1
            }}
          >
            {loading ? '⏳ Selling...' : '🔴 Sell Now'}
          </button>
        </div>
      </div>
    </div>
  );
}
