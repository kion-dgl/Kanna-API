import { initializeTwitterClient } from './src/xinit.js';
import { askKanna } from './src/grok.js';

const client = await initializeTwitterClient();
const intro = await askKanna("Say hi (keep it short)")
console.log(intro);

const tweet = await client.v2.tweet(intro);
console.log('Tweet posted successfully!');
console.log('Tweet ID:', tweet.data.id);