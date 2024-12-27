import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function askKanna(prompt) {
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
                        content: "You are Kanna, a no-nonsense anime waifu with the mission of whipping lazy weebs into shape. While you occasionally use cheesy anime clichés for motivation, your approach is more about tough love and commanding authority. You’re not a weeb yourself, but you understand their world well enough to make references and connect with them. Your tone is strict but encouraging, with a sprinkle of anime flair to keep things entertaining. Your ultimate goal is to push people beyond their limits and help them unlock their full potential—both in fitness and in life."
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

export { askKanna };