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
  const [lastCreatedToken, setLastCreatedToken] = useState(null);
  
  const handleCreateFromMeme = (meme) => {
    if (!wallet.connected) {
      alert('Please connect your wallet first to create a token!');
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
      
      setLastCreatedToken({ 
        signature: signature, 
        mint: mintPDA.toString(), 
        symbol: tokenSymbol 
      });
      
      alert(`Success! Token "${tokenSymbol}" created!\n\nTransaction: ${signature}\n\nMint: ${mintPDA.toString()}`);
      
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
        
        <TrendingMemes onCreateFromMeme={handleCreateFromMeme} />
        
        {wallet.connected && (
          <div style={{ 
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '20px', 
            padding: '40px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ 
              color: 'white', 
              fontSize: '28px', 
              fontWeight: '800', 
              marginBottom: '32px'
            }}>
              🎯 Launch Your Token
            </h2>
            
            {lastCreatedToken && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '24px'
              }}>
                <div style={{ color: '#10b981', fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>
                  ✅ Token Created Successfully!
                </div>
                <div style={{ color: '#d1d5db', fontSize: '14px', marginBottom: '16px' }}>
                  Symbol: <span style={{ color: 'white', fontWeight: '700' }}>{lastCreatedToken.symbol}</span>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  
                    href={`https://solscan.io/token/${lastCreatedToken.mint}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: 'rgba(168, 85, 247, 0.3)',
                      borderRadius: '8px',
                      textAlign: 'center',
                      color: '#a855f7',
                      fontSize: '13px',
                      fontWeight: '700',
                      textDecoration: 'none',
                      textTransform: 'uppercase'
                    }}
                  >
                    View Token
                  </a>
                  
                    href={`https://solscan.io/tx/${lastCreatedToken.signature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: 'rgba(16, 185, 129, 0.3)',
                      borderRadius: '8px',
                      textAlign: 'center',
                      color: '#10b981',
                      fontSize: '13px',
                      fontWeight: '700',
                      textDecoration: 'none',
                      textTransform: 'uppercase'
                    }}
                  >
                    View Transaction
                  </a>
                </div>
              </div>
            )}
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  color: '#d1d5db', 
                  marginBottom: '12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
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
                    fontSize: '16px',
                    fontWeight: '500'
                  }}
                />
              </div>
              
              <div>
                <label style={{ 
                  display: 'block', 
                  color: '#d1d5db', 
                  marginBottom: '12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
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
                    fontSize: '16px',
                    fontWeight: '500'
                  }}
                />
              </div>
            </div>
            
            <div style={{ 
              background: 'rgba(31, 41, 55, 0.6)',
              padding: '24px', 
              borderRadius: '16px', 
              marginBottom: '32px',
              border: '1px solid rgba(139, 92, 246, 0.2)'
            }}>
              <h3 style={{ 
                color: 'white', 
                fontSize: '18px', 
                fontWeight: '700', 
                marginBottom: '20px'
              }}>
                🛡️ Fair Launch Details
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ 
                  color: '#d1d5db', 
                  fontSize: '15px', 
                  lineHeight: '2',
                  fontWeight: '500'
                }}>
                  <div>💰 Total Supply: <span style={{ color: '#a855f7', fontWeight: '700' }}>1B tokens</span></div>
                  <div>🎯 Creator Gets: <span style={{ color: '#10b981', fontWeight: '700' }}>0% upfront</span></div>
                  <div>💵 Creator Fee: <span style={{ color: '#a855f7', fontWeight: '700' }}>0.5% per trade</span></div>
                </div>
                <div style={{ 
                  color: '#d1d5db', 
                  fontSize: '15px', 
                  lineHeight: '2',
                  fontWeight: '500'
                }}>
                  <div>📈 Bonding Curve: <span style={{ color: '#a855f7', fontWeight: '700' }}>Linear</span></div>
                  <div>🛡️ Protocol Fee: <span style={{ color: '#a855f7', fontWeight: '700' }}>1% per trade</span></div>
                  <div>⚔️ Anti-PVP: <span style={{ color: '#10b981', fontWeight: '700' }}>Protected</span></div>
                </div>
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
                textTransform: 'uppercase',
                letterSpacing: '1px',
                boxShadow: creating ? 'none' : '0 8px 24px rgba(168, 85, 247, 0.3)'
              }}
            >
              {creating ? '⏳ Creating Token...' : '🚀 Launch Token to the Moon'}
            </button>
          </div>
        )}
        
        {!wallet.connected && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '20px',
            padding: '40px',
            textAlign: 'center',
            marginTop: '32px'
          }}>
            <h2 style={{ color: 'white', fontSize: '24px', fontWeight: '800', marginBottom: '16px' }}>
              Ready to Launch Your Token?
            </h2>
            <p style={{ color: '#9ca3af', fontSize: '16px', marginBottom: '24px' }}>
              Connect your wallet to create meme tokens on Solana
            </p>
            <WalletMultiButton />
          </div>
        )}
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
            background: 'linear-gradient(180deg, #0f0f23 0%, #1a0b2e 50%, #160b28 100%)',
            backgroundAttachment: 'fixed'
          }}>
            <DashboardContent />
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
