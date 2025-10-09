import { useState, useEffect } from 'react';

export function useRedditTrending() {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchTrending() {
      try {
        const response = await fetch('https://preperitoneal-asher-prognathous.ngrok-free.app/api/trending');
        const data = await response.json();
        
        if (data.success) {
          setTrending(data.data);
        } else {
          setError('Failed to fetch trending memes');
        }
      } catch (err) {
        setError('Reddit API not available');
        console.error('Reddit API error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchTrending();
    
    const interval = setInterval(fetchTrending, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { trending, loading, error };
}
