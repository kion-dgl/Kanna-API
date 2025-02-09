/**
 * reply-post.js
 *
 * Copyright (c) 2024 Benjamin Collins (kion@dashgl.com)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { TwitterApi } from "twitter-api-v2";
import { createClient } from "@libsql/client";
import OpenAI from "openai";
import "dotenv/config";

// Initialize the OpenAI client
const client = new OpenAI({
  apiKey: process.env["OPENAPI_TOKEN"], // Ensure your API key is set in the environment variables
});

const turso = createClient({
  url: process.env.TURSO_DB_URL,
  authToken: process.env.TURSO_TOKEN,
});

// Create Twitter client with OAuth 1.0a credentials
const xClient = new TwitterApi({
  appKey: process.env.X_API_KEY,
  appSecret: process.env.X_API_SECRET,
  accessToken: process.env.X_ACCESS_TOKEN,
  accessSecret: process.env.X_ACCESS_TOKEN_SECRET,
});

// Verify credentials before tweeting
console.log("Verifying credentials...");
await xClient.v2.me();

const getRecentPosts = async () => {
  try {
    const selectSql = `
      SELECT id, post_id, post_text, thread_id, since
      FROM kanna_posts
      ORDER BY time DESC
      LIMIT 10`;

    const { rows } = await turso.execute(selectSql);
    return rows;
  } catch (err) {
    throw err;
  }
};

const getAllReplies = async (post_id, since) => {
  let replies = [];
  let nextCursor = null;
  const options = {
    method: "GET",
    headers: { "X-API-Key": process.env.TWITTER_API_KEY },
  };

  const updateSql = `
    UPDATE kanna_posts
    SET since = (strftime('%s', 'now'))
    WHERE post_id = ?
  `;

  await turso.execute(updateSql, [post_id]);

  do {
    const url =
      `https://api.twitterapi.io/twitter/tweet/replies?tweetId=${post_id}&sinceTime=${since}` +
      (nextCursor ? `&cursor=${nextCursor}` : "");

    try {
      const req = await fetch(url, options);
      const data = await req.json();

      if (data.status !== "success") {
        console.error("Error fetching replies:", data.msg);
        break;
      }

      if (data.tweets && Array.isArray(data.tweets)) {
        replies = replies.concat(data.tweets);
      }

      nextCursor = data.has_next_page ? data.next_cursor : null;
    } catch (error) {
      console.error("Fetch error:", error);
      break;
    }
  } while (nextCursor);

  const filteredPosts = replies.filter(
    (post) => post.author.userName.toLowerCase() !== "waifufitness",
  );
  return filteredPosts;
};

const getResponse = async (thread_id, message_text) => {
  const assistantId = "asst_Li7yn9kdsLCnwyMaJZPhPy7m";

  try {
    // Step 1: Append a message to the thread
    await client.beta.threads.messages.create(thread_id, {
      role: "user",
      content: message_text,
    });

    // Step 2: Run the thread
    const run = await client.beta.threads.runs.create(thread_id, {
      assistant_id: assistantId,
    });

    // Step 3: Poll until the run is completed
    let runStatus;
    do {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
      runStatus = await client.beta.threads.runs.retrieve(thread_id, run.id);
    } while (runStatus.status !== "completed");

    // Step 4: Retrieve the latest message from the assistant
    const messages = await client.beta.threads.messages.list(thread_id);
    // Step 5: Find the latest assistant response
    const assistantMessage = messages.data.find(
      (msg) => msg.role === "assistant",
    );

    return assistantMessage ? assistantMessage.content[0].text.value : null;
  } catch (error) {
    console.error("Error in getResponse:", error);
    return null;
  }
};

const postResponse = async (reply_text, tweetIdToReply) => {
  try {
    console.log("Credentials verified, posting tweet...");
    const tweet = await xClient.v2.reply(reply_text, tweetIdToReply);
    console.log("Tweet posted successfully!");
    console.log("Tweet ID:", tweet.data.id);
    return tweet.data.id;
  } catch (error) {
    console.error("Error:", error.message);
    if (error.data) {
      console.error("API Error Details:", error.data);
    }
  }
};

const posts = await getRecentPosts();
for (const post of posts) {
  const { post_id, since, thread_id } = post;
  const replies = await getAllReplies(post_id, since);
  for (const reply of replies) {
    const { id, text } = reply;
    const res = await getResponse(thread_id, text);
    const replyId = await postResponse(res, id);
    console.log(replyId);
  }
}
