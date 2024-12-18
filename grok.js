// Install required packages:
// npm install node-fetch dotenv

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

if (!process.env.X_AI_BEARER_TOKEN) {
  throw new Error('X_AI_BEARER_TOKEN is required in .env file');
}

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
            content: "Testing. Just say hi and hello world and nothing else."
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

const msg = await getGrok();
console.log(msg)