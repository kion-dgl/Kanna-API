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

import { createClient } from "@libsql/client";
import "dotenv/config";

const turso = createClient({
  url: process.env.TURSO_DB_URL,
  authToken: process.env.TURSO_TOKEN,
});

const getRecentPosts = async () => {
  try {
    const selectSql = `
      SELECT id, post_id, post_text, thread_id, time
      FROM kanna_posts
      ORDER BY time DESC
      LIMIT 10`;

    const { rows } = await turso.execute(selectSql);
    return rows;
  } catch (err) {
    throw err;
  }
};

const getAllReplies = async (post_id) => {
  let replies = [];
  let nextCursor = null;
  const options = {
    method: "GET",
    headers: { "X-API-Key": process.env.TWITTER_API_KEY },
  };

  do {
    const url =
      `https://api.twitterapi.io/twitter/tweet/replies?tweetId=${post_id}` +
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

  return replies;
};

const posts = await getRecentPosts();
for (const post of posts) {
  const { post_id } = post;
  const replies = await getAllReplies(post_id);
  console.log(`--- ${post_id} ---`);
  console.log(replies);
}
