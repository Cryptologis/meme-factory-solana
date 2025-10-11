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
    if (!wallet.connected) {
      alert('Please connect your wallet to create tokens!');
      return;
    }
    
    const cleanTitle = meme.title.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    const words = cleanTitle.split(' ');
    const suggestedSymbol = words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
    
    setTokenName(cleanTitle.slice(0, 32));
    setTokenSymbol(suggestedSymbol.slice(0, 10));
    
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);
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
      
      const { transaction, mintPDA } = await createMemeTokenTransaction(
        connection,
        wallet,
        tokenName,
        tokenSymbol,
        metadataUri,
        imageHash
      );
      
      const signature = await wallet.sendTransaction(transaction, connection, {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });
      
      await connection.confirmTransaction(signature, 'confirmed');
      
      alert(`Success! Token created!`);
      
      setTokenName('');
      setTokenSymbol('');
    } catch (error) {
      console.error('Error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };
  
  if (!wallet.connected) {
    return (
      <div style={{ minHeight: '100vh', padding: '32px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>🚀</div>
            <h1 style={{ 
              fontSize: '48px', 
              fontWeight: '900', 
              background: 'linear-gradient(135deg, #a855f7, #ec4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '16px'
            }}>
              MEME FACTORY
            </h1>
            <p style={{ color: '#9ca3af', marginBottom: '40px', fontSize: '18px' }}>
              Launch viral meme tokens on Solana
            </p>
            <WalletMultiButton />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '32px' }}>
            <TrendingMemes onCreateFromMeme={handleCreateFromMeme} />
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div style={{ minHeight: '100vh', padding: '32px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '48px',
          padding: '20px',
          background: 'rgba(31, 41, 55, 0.5)',
          borderRadius: '20px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(139, 92, 246, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '40px' }}>🚀</div>
            <h1 style={{ 
              fontSize: '32px', 
              fontWeight: '900', 
              background: 'linear-gradient(135deg, #a855f7, #ec4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: 0
            }}>
              MEME FACTORY
            </h1>
          </div>
          <WalletMultiButton />
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '32px' }}>
          <div>
            <TrendingMemes onCreateFromMeme={handleCreateFromMeme} />
            
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '20px', 
              padding: '40px',
              backdropFilter: 'blur(10px)',
              marginTop: '32px'
            }}>
              <h2 style={{ color: 'white', fontSize: '28px', fontWeight: '800', marginBottom: '32px' }}>
                🎯 Launch Your Token
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', color: '#d1d5db', marginBottom: '12px', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase' }}>
                    Token Name
                  </label>
                  <input
                    value={tokenName}
                    onChange={(e) => setTokenName(e.target.value)}
                    placeholder="Uptober Moon"
                    disabled={creating}
                    style={{ 
                      width: '100%', 
                      padding: '16px', 
                      background: 'rgba(31, 41, 55, 0.8)',
                      color: 'white', 
                      borderRadius: '12px', 
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      fontSize: '16px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', color: '#d1d5db', marginBottom: '12px', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase' }}>
                    Symbol
                  </label>
                  <input
                    value={tokenSymbol}
                    onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
                    placeholder="MOON"
                    maxLength="10"
                    disabled={creating}
                    style={{ 
                      width: '100%', 
                      padding: '16px', 
                      background: 'rgba(31, 41, 55, 0.8)',
                      color: 'white', 
                      borderRadius: '12px', 
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      fontSize: '16px'
                    }}
                  />
                </div>
              </div>
              
              <button
                onClick={createToken}
                disabled={creating || !tokenName || !tokenSymbol}
                style={{ 
                  width: '100%', 
                  padding: '20px', 
                  background: creating ? 'rgba(107, 114, 128, 0.5)' : 'linear-gradient(135deg, #a855f7, #ec4899)', 
                  color: 'white', 
                  borderRadius: '16px', 
                  fontWeight: '800', 
                  border: 'none', 
                  cursor: creating ? 'not-allowed' : 'pointer', 
                  fontSize: '18px',
                  opacity: (!tokenName || !tokenSymbol) ? 0.5 : 1,
                  textTransform: 'uppercase'
                }}
              >
                {creating ? '⏳ Creating...' : '🚀 Launch Token'}
              </button>
            </div>
          </div>
          
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
          <div style={{ 
            minHeight: '100vh', 
            background: 'linear-gradient(180deg, #0f0f23 0%, #1a0b2e 50%, #160b28 100%)'
          }}>
            <DashboardContent />
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
