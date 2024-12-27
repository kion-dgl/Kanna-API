import { initializeTwitterClient } from './src/xinit.js';
import { askKanna } from './src/grok.js';

async function calculateWaitTime(resetTimestamp) {
  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  const waitSeconds = resetTimestamp - now + 5; // Add 5 seconds buffer
  return Math.max(waitSeconds * 1000, 30000); // Return in milliseconds, minimum 30 seconds
}

async function monitorReplies(client, tweetId, processedReplies) {
  try {
    // Fetch replies to the tweet, including referenced tweets
    const replies = await client.v2.search(
      `conversation_id:${tweetId} is:reply`,
      {
        expansions: ['referenced_tweets.id'],
        "tweet.fields": ['conversation_id', 'referenced_tweets']
      }
    );

    // Handle the case where there are no replies yet
    if (!replies || !replies._realData?.data) {
      console.log('No replies found in this check');
      return;
    }

    const tweets = replies._realData.data;
    console.log(`Found ${tweets.length} potential replies to check`);

    for (const reply of tweets) {
      if (processedReplies.has(reply.id)) {
        continue;
      }

      const isDirectReply = reply.referenced_tweets?.some(
        ref => ref.id === tweetId && ref.type === 'replied_to'
      );

      if (!isDirectReply) {
        console.log(`Skipping ${reply.id} - not a direct reply`);
        continue;
      }

      console.log(`Processing new direct reply: ${reply.id}`);

      try {
        await client.v2.reply("kk", reply.id);
        console.log(`Successfully responded to tweet ${reply.id}`);
        processedReplies.add(reply.id);

        // Add a small delay between responses
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (replyError) {
        console.error(`Error replying to tweet ${reply.id}:`, replyError);
        if (replyError.code === 429) {
          // Get reset time from error response
          const resetTime = replyError.rateLimit?.reset;
          if (resetTime) {
            const waitTime = await calculateWaitTime(resetTime);
            console.log(`Rate limit hit, waiting ${Math.floor(waitTime / 1000)} seconds...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }
    }
  } catch (error) {
    console.error('Error monitoring replies:', error);
    // Handle rate limiting for the search API
    if (error.code === 429) {
      const resetTime = error.rateLimit?.reset;
      if (resetTime) {
        const waitTime = await calculateWaitTime(resetTime);
        console.log(`Rate limit hit, waiting ${Math.floor(waitTime / 1000)} seconds...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        // Fallback if we can't get the reset time
        console.log('Rate limit hit, waiting 5 minutes...');
        await new Promise(resolve => setTimeout(resolve, 300000));
      }
    }
  }
}

async function main() {
  try {
    const client = await initializeTwitterClient();

    const intro = await askKanna("Say hi (keep it short)");
    console.log('Posting tweet:', intro);
    const tweet = await client.v2.tweet(intro);
    const tweetId = tweet.data.id;
    console.log('Tweet posted successfully! Tweet ID:', tweetId);

    const processedReplies = new Set();

    // Wait 30 seconds before starting to monitor replies
    console.log('Waiting 30 seconds before starting reply monitoring...');
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Monitor loop
    console.log('Starting reply monitoring...');
    while (true) {
      // Wait first, then check replies
      console.log('Waiting before next check...');
      await new Promise(resolve => setTimeout(resolve, 30000));
      await monitorReplies(client, tweetId, processedReplies);
    }
  } catch (error) {
    console.error('Error in main process:', error);
    if (error.data) {
      console.error('API Error Details:', error.data);
    }
  }
}

main();