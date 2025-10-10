import React, { useState, useEffect } from 'react';

export function YouTubeTrending() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVideos() {
      try {
        const response = await fetch('https://meme-factory-solana.onrender.com/api/youtube/trending');
        const data = await response.json();
        if (data.success) {
          setVideos(data.data.slice(0, 5));
        }
      } catch (err) {
        console.error('YouTube API error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchVideos();
  }, []);

  if (loading) {
    return (
      <div style={{ 
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        borderRadius: '20px', 
        padding: '24px',
        backdropFilter: 'blur(10px)'
      }}>
        <h3 style={{ color: 'white', fontSize: '20px', fontWeight: '800' }}>
          🎥 Loading videos...
        </h3>
      </div>
    );
  }

  return (
    <div style={{ 
      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
      border: '1px solid rgba(139, 92, 246, 0.3)',
      borderRadius: '20px', 
      padding: '24px',
      backdropFilter: 'blur(10px)'
    }}>
      <h3 style={{ color: 'white', fontSize: '20px', fontWeight: '800', marginBottom: '20px' }}>
        🎥 Trending Videos
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {videos.map((video) => (
          
            key={video.id}
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              gap: '12px',
              background: 'rgba(31, 41, 55, 0.6)',
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              textDecoration: 'none',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.6)';
              e.currentTarget.style.transform = 'translateX(4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.2)';
              e.currentTarget.style.transform = 'translateX(0)';
            }}
          >
            <img 
              src={video.thumbnail} 
              alt={video.title}
              style={{ width: '120px', height: '90px', borderRadius: '8px', objectFit: 'cover' }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ 
                color: 'white', 
                fontSize: '14px', 
                fontWeight: '600',
                marginBottom: '4px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}>
                {video.title}
              </div>
              <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>
                {video.channel}
              </div>
              <div style={{ color: '#a855f7', fontSize: '12px', fontWeight: '600' }}>
                👁️ {(video.views / 1000000).toFixed(1)}M views
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
