import React from 'react';
import { useRedditTrending } from './useRedditTrending';

export function TrendingMemes({ onCreateFromMeme }) {
  const { trending, loading, error } = useRedditTrending();

  if (loading) {
    return (
      <div style={{ backgroundColor: '#1f2937', borderRadius: '12px', padding: '32px', marginBottom: '32px' }}>
        <h2 style={{ color: 'white', fontSize: '24px', marginBottom: '16px' }}>🔥 Trending on Reddit</h2>
        <p style={{ color: '#9ca3af' }}>Loading trending memes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ backgroundColor: '#1f2937', borderRadius: '12px', padding: '32px', marginBottom: '32px' }}>
        <h2 style={{ color: 'white', fontSize: '24px', marginBottom: '16px' }}>🔥 Trending on Reddit</h2>
        <p style={{ color: '#9ca3af' }}>{error}</p>
        <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>
          Make sure the Reddit backend is running on port 3001
        </p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#1f2937', borderRadius: '12px', padding: '32px', marginBottom: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ color: 'white', fontSize: '24px' }}>🔥 Trending on Reddit</h2>
        <span style={{ color: '#9ca3af', fontSize: '14px' }}>{trending.length} memes</span>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', maxHeight: '500px', overflowY: 'auto' }}>
        {trending.slice(0, 12).map((meme) => (
          <div 
            key={meme.id} 
            style={{ 
              backgroundColor: '#374151', 
              borderRadius: '8px', 
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {meme.preview && (
              <img 
                src={meme.preview} 
                alt={meme.title}
                style={{ width: '100%', height: '160px', objectFit: 'cover' }}
                onError={(e) => e.target.style.display = 'none'}
              />
            )}
            
            <div style={{ padding: '12px' }}>
              <h3 style={{ 
                color: 'white', 
                fontSize: '14px', 
                fontWeight: '600', 
                marginBottom: '8px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {meme.title}
              </h3>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ color: '#9ca3af', fontSize: '12px' }}>r/{meme.subreddit}</span>
                <span style={{ 
                  backgroundColor: '#7c3aed', 
                  color: 'white', 
                  padding: '2px 8px', 
                  borderRadius: '12px', 
                  fontSize: '11px',
                  fontWeight: '600'
                }}>
                  {meme.viralityScore.toLocaleString()}
                </span>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#9ca3af', marginBottom: '12px' }}>
                <span>⬆️ {meme.upvotes.toLocaleString()}</span>
                <span>💬 {meme.comments.toLocaleString()}</span>
              </div>
              
              <button
                onClick={() => onCreateFromMeme(meme)}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: 'linear-gradient(to right, #a855f7, #ec4899)',
                  color: 'white',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Create Token
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
