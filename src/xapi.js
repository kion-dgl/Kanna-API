import { TwitterApi } from 'twitter-api-v2';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// Initialize Twitter client once
function initializeTwitterClient() {
  if (!process.env.X_API_KEY || !process.env.X_API_SECRET ||
      !process.env.X_ACCESS_TOKEN || !process.env.X_ACCESS_TOKEN_SECRET) {
    throw new Error('Missing required environment variables');
  }

  return new TwitterApi({
    appKey: process.env.X_API_KEY.trim(),
    appSecret: process.env.X_API_SECRET.trim(),
    accessToken: process.env.X_ACCESS_TOKEN.trim(),
    accessSecret: process.env.X_ACCESS_TOKEN_SECRET.trim(),
  });
}

const twitterClient = initializeTwitterClient();

/**
 * Sends a request to Grok API and returns the response text
 * @param {string} prompt - The text prompt to send to Grok
 * @returns {Promise<string>} The response text from Grok
 */
async function askGrok(prompt) {
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
            content: prompt
          }
        ],
        model: "grok-beta",
        stream: false,
        temperature: 0
      })
    });

    const data = await response.json();
    if (!data.choices || !data.choices[0]) {
      throw new Error('Invalid response from Grok API');
    }
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error in askGrok:', error);
    throw error;
  }
}

/**
 * Posts a tweet with the [grok] prefix
 * @param {string} text - The text to tweet
 * @returns {Promise<string>} The ID of the created tweet
 */
async function writePost(text) {
  try {
    const tweet = await twitterClient.v2.tweet('[grok] ' + text);
    return tweet.data.id;
  } catch (error) {
    console.error('Error in writePost:', error);
    throw error;
  }
}

/**
 * Reads a tweet by its ID and logs the response
 * @param {string} id - The ID of the tweet to read
 * @returns {Promise<void>}
 */
async function readPost(id) {
  try {
    const tweet = await twitterClient.v2.singleTweet(id);
    console.log('Tweet data:', JSON.stringify(tweet, null, 2));
  } catch (error) {
    console.error('Error in readPost:', error);
    throw error;
  }
}

// Example usage:
// const response = await askGrok("Say something interesting");
// const tweetId = await writePost(response);
// await readPost(tweetId);

export { askGrok, writePost, readPost };