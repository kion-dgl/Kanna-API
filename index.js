import { askGrok, writePost, readPost } from './src/xapi.js';

async function main() {
  try {
    // Get a response from Grok
    const grokResponse = await askGrok("What's your opinion on artificial intelligence?");
    console.log('Grok says:', grokResponse);

    // Post the response to Twitter
    const tweetId = await writePost(grokResponse);
    console.log('Posted tweet with ID:', tweetId);

    // Read back the posted tweet
    await readPost(tweetId);
  } catch (error) {
    console.error('Error in main:', error);
  }
}

main();