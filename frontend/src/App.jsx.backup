import { Buffer } from 'buffer';
window.Buffer = Buffer;

import React, { useState, useMemo } from 'react';
import { ConnectionProvider, WalletProvider, useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { createMemeTokenTransaction } from './createTokenTx';
import { TrendingMemes } from './TrendingMemes';
import '@solana/wallet-adapter-react-ui/styles.css';

function DashboardContent() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [creating, setCreating] = useState(false);
  
  const handleCreateFromMeme = (meme) => {
    // Extract a potential token name from the meme title
    const cleanTitle = meme.title.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    const words = cleanTitle.split(' ');
    const suggestedSymbol = words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
    
    setTokenName(cleanTitle.slice(0, 32));
    setTokenSymbol(suggestedSymbol.slice(0, 10));
    
    // Scroll to creation form
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };
  
  const createToken = async () => {
    if (!tokenName || !tokenSymbol) {
      alert('Please fill in both token name and symbol');
      return;
    }
    
    setCreating(true);
    
    try {
      const mockImageData = new TextEncoder().encode(tokenName + tokenSymbol + Date.now());
      const imageHashBuffer = await crypto.subtle.digest('SHA-256', mockImageData);
      const imageHash = Array.from(new Uint8Array(imageHashBuffer));
      const metadataUri = `https://mock-metadata.com/${tokenSymbol.toLowerCase()}`;
      
      console.log('Creating token...', { tokenName, tokenSymbol });
      
      const { transaction, mintPDA } = await createMemeTokenTransaction(
        connection,
        wallet,
        tokenName,
        tokenSymbol,
        metadataUri,
        imageHash
      );
      
      console.log('Transaction created:', transaction);
      console.log('Sending transaction...');
      
      const signature = await wallet.sendTransaction(transaction, connection, {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });
      
      console.log('Transaction sent:', signature);
      console.log('Confirming...');
      
      await connection.confirmTransaction(signature, 'confirmed');
      
      alert(`Success! Token "${tokenSymbol}" created!\n\nTransaction: ${signature}\n\nMint: ${mintPDA.toString()}\n\nYou received 100M ${tokenSymbol} tokens!\n\nView:\nhttps://explorer.solana.com/tx/${signature}?cluster=devnet`);
      
      setTokenName('');
      setTokenSymbol('');
    } catch (error) {
      console.error('Full error object:', error);
      console.error('Error message:', error.message);
      console.error('Error logs:', error.logs);
      alert(`Error: ${error.message}\n\nCheck console for details`);
    } finally {
      setCreating(false);
    }
  };
  
  if (!wallet.connected) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🚀</div>
          <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: 'white', marginBottom: '16px' }}>Meme Token Factory</h1>
          <p style={{ color: '#9ca3af', marginBottom: '32px' }}>Launch meme tokens on Solana</p>
          <WalletMultiButton />
        </div>
      </div>
    );
  }
  
  return (
    <div style={{ minHeight: '100vh', padding: '24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: 'white' }}>🚀 Meme Token Factory</h1>
          <WalletMultiButton />
        </div>
        
        <TrendingMemes onCreateFromMeme={handleCreateFromMeme} />
        
        <div style={{ backgroundColor: '#1f2937', borderRadius: '12px', padding: '32px' }}>
          <h2 style={{ color: 'white', fontSize: '24px', marginBottom: '24px' }}>Create Your Token</h2>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#d1d5db', marginBottom: '8px' }}>Token Name</label>
            <input
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              placeholder="Uptober"
              disabled={creating}
              style={{ width: '100%', padding: '12px', backgroundColor: '#374151', color: 'white', borderRadius: '8px', border: 'none' }}
            />
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', color: '#d1d5db', marginBottom: '8px' }}>Symbol</label>
            <input
              value={tokenSymbol}
              onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
              placeholder="UTB"
              maxLength="10"
              disabled={creating}
              style={{ width: '100%', padding: '12px', backgroundColor: '#374151', color: 'white', borderRadius: '8px', border: 'none' }}
            />
          </div>
          
          <div style={{ backgroundColor: '#374151', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
            <h3 style={{ color: 'white', fontSize: '16px', marginBottom: '12px' }}>Token Details</h3>
            <div style={{ color: '#9ca3af', fontSize: '14px', lineHeight: '1.6' }}>
              <div>• Total Supply: 1,000,000,000 tokens</div>
              <div>• Creator Receives: 0% upfront (Fair Launch!)</div>
              <div>• Creator Fee: 0.5% on all trades</div>
              <div>• Bonding Curve: Linear pricing</div>
              <div>• Protocol Fee: 1% on trades</div>
              <div>• Anti-PVP: One token per symbol</div>
            </div>
          </div>
          
          <button
            onClick={createToken}
            disabled={creating || !tokenName || !tokenSymbol}
            style={{ 
              width: '100%', 
              padding: '16px', 
              background: creating ? '#6b7280' : 'linear-gradient(to right, #a855f7, #ec4899)', 
              color: 'white', 
              borderRadius: '8px', 
              fontWeight: '600', 
              border: 'none', 
              cursor: creating ? 'not-allowed' : 'pointer', 
              fontSize: '16px',
              opacity: (!tokenName || !tokenSymbol) ? 0.5 : 1
            }}
          >
            {creating ? 'Creating Token...' : 'Create Token'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);
  
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #111827, #581c87, #111827)' }}>
            <DashboardContent />
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
