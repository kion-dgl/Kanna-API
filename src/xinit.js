import { TwitterApi } from 'twitter-api-v2';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// Initialize Twitter client once
async function initializeTwitterClient() {
  try {
    // Debug: Check if env variables are loaded (will show first few characters)
    console.log('Checking credentials...');
    console.log('X_API_KEY:', process.env.X_API_KEY?.slice(0, 4) + '...');
    console.log('X_API_SECRET:', process.env.X_API_SECRET?.slice(0, 4) + '...');
    console.log('X_ACCESS_TOKEN:', process.env.X_ACCESS_TOKEN?.slice(0, 4) + '...');
    console.log('X_ACCESS_TOKEN_SECRET:', process.env.X_ACCESS_TOKEN_SECRET?.slice(0, 4) + '...');

    // Create Twitter client with OAuth 1.0a credentials
    const twitterClient = new TwitterApi({
      appKey: process.env.X_API_KEY,
      appSecret: process.env.X_API_SECRET,
      accessToken: process.env.X_ACCESS_TOKEN,
      accessSecret: process.env.X_ACCESS_TOKEN_SECRET,
    });

    // Verify credentials before tweeting
    console.log('Verifying credentials...');
    await twitterClient.v2.me();
    return twitterClient;
  } catch (error) {
    console.error('Error:', error.message);
    if (error.data) {
      console.error('API Error Details:', error.data);
    }
  }

}

export { initializeTwitterClient };