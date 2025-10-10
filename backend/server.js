// server.js - Reddit-powered meme discovery backend
const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Reddit API configuration
const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID;
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;
const REDDIT_USER_AGENT = process.env.REDDIT_USER_AGENT;

// Cache for Reddit access token
let redditAccessToken = null;
let tokenExpiry = 0;

// Cache for trending memes (refresh every 5 minutes)
let trendingCache = null;
let cacheExpiry = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Subreddits to monitor
const MEME_SUBREDDITS = [
  'CryptoCurrency',
  'CryptoMoonShots', 
  'SatoshiStreetBets',
  'wallstreetbets',
  'memes',
  'dankmemes'
];

// Get Reddit OAuth token
async function getRedditToken() {
  if (redditAccessToken && Date.now() < tokenExpiry) {
    return redditAccessToken;
  }

  try {
    const auth = Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString('base64');
    
    const response = await axios.post(
      'https://www.reddit.com/api/v1/access_token',
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': REDDIT_USER_AGENT
        }
      }
    );

    redditAccessToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in * 1000);
    
    console.log('✅ Reddit token obtained');
    return redditAccessToken;
  } catch (error) {
    console.error('❌ Error getting Reddit token:', error.response?.data || error.message);
    throw error;
  }
}

// Calculate virality score
function calculateViralityScore(post) {
  const now = Date.now() / 1000;
  const postAge = now - post.created_utc;
  const ageInHours = postAge / 3600;
  
  // Engagement metrics
  const upvotes = post.ups || 0;
  const comments = post.num_comments || 0;
  const upvoteRatio = post.upvote_ratio || 0.5;
  
  // Velocity (upvotes per hour - more important for new posts)
  const velocity = ageInHours > 0 ? upvotes / ageInHours : 0;
  
  // Engagement ratio (comments/upvotes - indicates discussion)
  const engagementRatio = upvotes > 0 ? comments / upvotes : 0;
  
  // Weighted score
  const viralityScore = (
    (upvotes * 1.0) +           // Raw popularity
    (velocity * 50) +           // Growth rate (heavily weighted)
    (comments * 2) +            // Engagement
    (upvoteRatio * 500) +       // Quality indicator
    (engagementRatio * 1000)    // Discussion depth
  );
  
  return Math.round(viralityScore);
}

// Fetch trending posts from a subreddit
async function fetchSubredditPosts(subreddit, token, timeFilter = 'day') {
  try {
    const response = await axios.get(
      `https://oauth.reddit.com/r/${subreddit}/hot`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': REDDIT_USER_AGENT
        },
        params: {
          limit: 25,
          t: timeFilter
        }
      }
    );

    return response.data.data.children
      .map(child => child.data)
      .filter(post => {
        // Filter for meme-worthy content
        return (
          !post.stickied &&
          !post.over_18 &&
          (post.post_hint === 'image' || post.is_gallery || post.url.includes('imgur'))
        );
      });
  } catch (error) {
    console.error(`Error fetching r/${subreddit}:`, error.message);
    return [];
  }
}

// Get all trending memes across subreddits
async function getTrendingMemes() {
  // Check cache
  if (trendingCache && Date.now() < cacheExpiry) {
    console.log('📦 Returning cached trending memes');
    return trendingCache;
  }

  console.log('🔄 Fetching fresh trending memes from Reddit...');
  
  const token = await getRedditToken();
  const allPosts = [];

  // Fetch from all subreddits in parallel
  const fetchPromises = MEME_SUBREDDITS.map(subreddit => 
    fetchSubredditPosts(subreddit, token)
  );

  const results = await Promise.all(fetchPromises);
  
  results.forEach((posts, index) => {
    const subreddit = MEME_SUBREDDITS[index];
    posts.forEach(post => {
      allPosts.push({
        id: post.id,
        title: post.title,
        subreddit: subreddit,
        author: post.author,
        url: post.url,
        permalink: `https://reddit.com${post.permalink}`,
        thumbnail: post.thumbnail !== 'self' ? post.thumbnail : null,
        created: post.created_utc,
        upvotes: post.ups,
        comments: post.num_comments,
        upvoteRatio: post.upvote_ratio,
        viralityScore: 0,
        imageUrl: post.url,
        preview: post.preview?.images?.[0]?.source?.url?.replace(/&amp;/g, '&'),
      });
    });
  });

  // Calculate virality scores
  allPosts.forEach(post => {
    post.viralityScore = calculateViralityScore(post);
  });

  // Sort by virality score
  const rankedPosts = allPosts
    .sort((a, b) => b.viralityScore - a.viralityScore)
    .slice(0, 50);

  // Update cache
  trendingCache = rankedPosts;
  cacheExpiry = Date.now() + CACHE_DURATION;

  console.log(`✅ Fetched ${rankedPosts.length} trending memes`);
  return rankedPosts;
}

// API Routes

// Get trending memes
app.get('/api/trending', async (req, res) => {
  try {
    const trending = await getTrendingMemes();
    res.json({
      success: true,
      data: trending,
      cached: trendingCache && Date.now() < cacheExpiry,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in /api/trending:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending memes'
    });
  }
});

// Get top memes by subreddit
app.get('/api/subreddit/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const token = await getRedditToken();
    const posts = await fetchSubredditPosts(name, token);
    
    const rankedPosts = posts.map(post => ({
      id: post.id,
      title: post.title,
      subreddit: name,
      url: post.url,
      permalink: `https://reddit.com${post.permalink}`,
      upvotes: post.ups,
      comments: post.num_comments,
      viralityScore: calculateViralityScore(post),
      imageUrl: post.url,
      preview: post.preview?.images?.[0]?.source?.url?.replace(/&amp;/g, '&'),
    })).sort((a, b) => b.viralityScore - a.viralityScore);

    res.json({
      success: true,
      data: rankedPosts
    });
  } catch (error) {
    console.error(`Error fetching r/${req.params.name}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subreddit'
    });
  }
});

// Search for specific meme
app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, error: 'Query required' });
    }

    const trending = await getTrendingMemes();
    const results = trending.filter(post => 
      post.title.toLowerCase().includes(q.toLowerCase())
    );

    res.json({
      success: true,
      data: results,
      query: q
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Search failed'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    uptime: process.uptime(),
    cacheStatus: trendingCache ? 'active' : 'empty'
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Reddit Meme Discovery API running on port ${PORT}`);
  console.log(`📊 Monitoring subreddits: ${MEME_SUBREDDITS.join(', ')}`);
  console.log(`🔄 Cache refresh: every ${CACHE_DURATION / 1000 / 60} minutes`);
});

// YouTube trending videos endpoint
const { google } = require('googleapis');
const youtube = google.youtube('v3');

app.get('/api/youtube/trending', async (req, res) => {
  try {
    const response = await youtube.videos.list({
      key: process.env.YOUTUBE_API_KEY,
      part: 'snippet,statistics',
      chart: 'mostPopular',
      regionCode: 'US',
      maxResults: 10,
      videoCategoryId: '24' // Entertainment category
    });

    const videos = response.data.items.map(video => ({
      id: video.id,
      title: video.snippet.title,
      channel: video.snippet.channelTitle,
      thumbnail: video.snippet.thumbnails.medium.url,
      views: parseInt(video.statistics.viewCount),
      url: `https://youtube.com/watch?v=${video.id}`,
      publishedAt: video.snippet.publishedAt
    }));

    res.json({
      success: true,
      data: videos
    });
  } catch (error) {
    console.error('YouTube API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch YouTube trending'
    });
  }
});
