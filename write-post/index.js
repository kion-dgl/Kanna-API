import { TwitterApi } from "twitter-api-v2";
import { createClient } from "@libsql/client";
import OpenAI from "openai";
import "dotenv/config";

// Initialize the OpenAI client
const client = new OpenAI({
  apiKey: process.env["OPENAPI_TOKEN"], // Ensure your API key is set in the environment variables
});

async function tweetHello(text) {
  try {
    // Debug: Check if env variables are loaded (will show first few characters)
    console.log("Checking credentials...");
    console.log("X_API_KEY:", process.env.X_API_KEY?.slice(0, 4) + "...");
    console.log("X_API_SECRET:", process.env.X_API_SECRET?.slice(0, 4) + "...");
    console.log(
      "X_ACCESS_TOKEN:",
      process.env.X_ACCESS_TOKEN?.slice(0, 4) + "...",
    );
    console.log(
      "X_ACCESS_TOKEN_SECRET:",
      process.env.X_ACCESS_TOKEN_SECRET?.slice(0, 4) + "...",
    );

    // Create Twitter client with OAuth 1.0a credentials
    const client = new TwitterApi({
      appKey: process.env.X_API_KEY,
      appSecret: process.env.X_API_SECRET,
      accessToken: process.env.X_ACCESS_TOKEN,
      accessSecret: process.env.X_ACCESS_TOKEN_SECRET,
    });

    // Verify credentials before tweeting
    console.log("Verifying credentials...");
    await client.v2.me();

    // Weebfit Community
    const communityId = "1882640483719249956";

    console.log("Credentials verified, posting tweet...");
    const tweet = await client.v2.post("tweets", {
      text,
      community_id: communityId,
    });
    console.log("Tweet posted successfully!");
    console.log("Tweet ID:", tweet.data.id);
    return tweet.data.id;
  } catch (error) {
    console.error("Error:", error.message);
    if (error.data) {
      console.error("API Error Details:", error.data);
    }
  }
}

async function interactWithAssistant() {
  try {
    const thread = await client.beta.threads.create({
      messages: [
        {
          role: "user",
          content: '"What should i do today?"',
        },
      ],
    });

    let threadId = thread.id;
    console.log("Created thread with Id: " + threadId);

    const assistantId = "asst_Li7yn9kdsLCnwyMaJZPhPy7m";
    const run = await client.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistantId,
      // instructions:
      //   "Do not give the user a name. Answer the question as a command.",
    });

    console.log("Run finished with status: " + run.status);

    if (run.status == "completed") {
      const messages = await client.beta.threads.messages.list(thread.id);
      const msg = messages.getPaginatedItems();
      return msg[0].content[0].text.value;
    }
  } catch (error) {
    console.error("Error interacting with the assistant:", error);
  }
}

const storePost = async (id, text) => {
  const turso = createClient({
    url: process.env.TURSO_DB_URL,
    authToken: process.env.TURSO_TOKEN,
  });

  try {
    // Ensure table exists
    await turso.execute(`
          CREATE TABLE IF NOT EXISTS kanna_posts (
              id TEXT PRIMARY KEY,
              text TEXT NOT NULL
          );
      `);

    // Insert data
    await turso.execute("INSERT INTO kanna_posts (id, text) VALUES (?, ?)", [
      id,
      text,
    ]);

    console.log("Data inserted successfully!");
  } catch (error) {
    console.error("Database error:", error);
  } finally {
    turso.close();
  }
};

const text = await interactWithAssistant();
console.log(text);
const id = await tweetHello(text);
console.log(id);
await storePost(id, text);
