import { TwitterApi } from 'twitter-api-v2';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

// Debug: Print environment variables (masked)
const debugEnv = {
  X_API_KEY: process.env.X_API_KEY ? '✓' : '✗',
  X_API_SECRET: process.env.X_API_SECRET ? '✓' : '✗',
  X_ACCESS_TOKEN: process.env.X_ACCESS_TOKEN ? '✓' : '✗',
  X_ACCESS_TOKEN_SECRET: process.env.X_ACCESS_TOKEN_SECRET ? '✓' : '✗'
};
console.log('Environment variables loaded:', debugEnv);


async function getGrok() {
  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.X_AI_BEARER_TOKEN}`
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: "You are a test assistant."
          },
          {
            role: "user",
            content: "Say something cringe please. Make it really short."
          }
        ],
        model: "grok-beta",
        stream: false,
        temperature: 0
      })
    });

    const data = await response.json();
    const { choices } = data;
    return choices[0].message.content;
  } catch (error) {
    console.error('Error:', error);
  }
}

async function postTweet(text) {
  try {
    // Validate credentials before creating client
    if (!process.env.X_API_KEY || !process.env.X_API_SECRET ||
        !process.env.X_ACCESS_TOKEN || !process.env.X_ACCESS_TOKEN_SECRET) {
      throw new Error('Missing required environment variables');
    }

    const userClient = new TwitterApi({
      appKey: process.env.X_API_KEY.trim(),
      appSecret: process.env.X_API_SECRET.trim(),
      accessToken: process.env.X_ACCESS_TOKEN.trim(),
      accessSecret: process.env.X_ACCESS_TOKEN_SECRET.trim(),
    });

    console.log('Client created, attempting to tweet...');
    const tweet = await userClient.v2.tweet('[Grok via xAPI]: ' + text);
    console.log('Tweet posted successfully:', tweet);
  } catch (error) {
    console.error('Error details:', {
      message: error.message,
      type: error.constructor.name,
      data: error.data || 'No data available'
    });
  }
}

const msg = await getGrok();
console.log(msg)
postTweet(msg);
