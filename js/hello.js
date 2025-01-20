import { TwitterApi } from 'twitter-api-v2';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function tweetHello() {
    try {
        // Debug: Check if env variables are loaded (will show first few characters)
        console.log('Checking credentials...');
        console.log('X_API_KEY:', process.env.X_API_KEY?.slice(0, 4) + '...');
        console.log('X_API_SECRET:', process.env.X_API_SECRET?.slice(0, 4) + '...');
        console.log('X_ACCESS_TOKEN:', process.env.X_ACCESS_TOKEN?.slice(0, 4) + '...');
        console.log('X_ACCESS_TOKEN_SECRET:', process.env.X_ACCESS_TOKEN_SECRET?.slice(0, 4) + '...');

        // Create Twitter client with OAuth 1.0a credentials
        const client = new TwitterApi({
            appKey: process.env.X_API_KEY,
            appSecret: process.env.X_API_SECRET,
            accessToken: process.env.X_ACCESS_TOKEN,
            accessSecret: process.env.X_ACCESS_TOKEN_SECRET,
        });

        // Verify credentials before tweeting
        console.log('Verifying credentials...');
        await client.v2.me();

        console.log('Credentials verified, posting tweet...');
        const tweet = await client.v2.tweet('Hello, Twitter!');
        console.log('Tweet posted successfully!');
        console.log('Tweet ID:', tweet.data.id);

    } catch (error) {
        console.error('Error:', error.message);
        if (error.data) {
            console.error('API Error Details:', error.data);
        }
    }
}

tweetHello();