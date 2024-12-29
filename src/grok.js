import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import { writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });


async function askKanna(messages) {
    try {
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.X_AI_BEARER_TOKEN}`
            },
            body: JSON.stringify({
                messages,
                model: "grok-beta",
                stream: false,
                temperature: 0
            })
        });

        const data = await response.json();
        writeFileSync("grok.json", JSON.stringify(data, null, 2))

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