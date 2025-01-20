import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { initializeTwitterClient } from './src/xinit.js';
import { askKanna } from './src/grok.js';

// Initialize SQLite database
async function initDB() {
    const db = await open({
        filename: 'posts.db',
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            day INTEGER NOT NULL,
            post_id TEXT NOT NULL,
            post_content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    return db;
}

async function getCurrentDay() {
    const startDate = new Date('2024-01-03'); // Set your start date here
    const today = new Date();
    const diffTime = Math.abs(today - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.min(diffDays, 100); // Cap at 100 days
}

async function main() {
    try {
        // Initialize database
        const db = await initDB();
        
        // Get current day
        const currentDay = await getCurrentDay();
        
        // Check if we already posted today
        const lastPost = await db.get('SELECT * FROM posts WHERE day = ?', currentDay);
        if (lastPost) {
            console.log(`Already posted for day ${currentDay}`);
            process.exit(0);
        }

        // Initialize chat history
        const chat = [
            {
                role: "system",
                content: `You are Kanna, a no-nonsense anime waifu with the mission of whipping
                lazy weebs into shape. While you occasionally use cheesy anime clichés for motivation,
                your approach is more about tough love and commanding authority.
                You're not a weeb yourself, but you understand their world well enough to make references
                and connect with them. Your tone is strict but encouraging, with a sprinkle of anime flair
                to keep things entertaining. Your ultimate goal is to push people beyond their limits
                and help them unlock their full potential—both in fitness and in life.`
            },
            {
                role: "user",
                content: `Your goal is to create a balanced daily workout routine for a given day in a 100-day fitness challenge. Use the provided day number as input. The intensity should gradually increase over time: starting with light exercises (~10 reps or 30 seconds on Day 1) and peaking at higher intensity (~50 reps or 1-2 minutes on Day 100). However, the intensity should not increase too quickly—progress should feel manageable.

## List of Exercises
### Strength:
- Push-Ups  
- Squats  
- Sit-Ups  
- Lunges  
- Plank (measured in seconds)  
- Wall Sit (measured in seconds)  
- Leg Lifts  

### Cardio:
- Run/Walk (measured in kilometers)  
- Jumping Jacks  
- High Knees  
- Butt Kicks  

### Core:
- Crunches  
- Russian Twists  
- Flutter Kicks  

### Stretching:
- Forward Fold (Touch Your Toes)  
- Butterfly Stretch  
- Cat-Cow Stretch  
- Side Stretch (Each Side)  
- Cobra Stretch  
- Child's Pose  

## Request
day = day ${currentDay}`
            }
        ];

        // Get response from Grok
        const exerciseRoutine = await askKanna(chat);
        console.log('Generated exercise routine:', exerciseRoutine);

        // Initialize Twitter client and post
        const client = await initializeTwitterClient();
        const tweet = await client.v2.tweet(exerciseRoutine);
        console.log('Posted tweet:', tweet.data.id);

        // Store in database
        await db.run(
            'INSERT INTO posts (day, post_id, post_content) VALUES (?, ?, ?)',
            [currentDay, tweet.data.id, exerciseRoutine]
        );

        console.log(`Successfully stored day ${currentDay} post in database`);
        await db.close();
    } catch (error) {
        console.error('Error in main process:', error);
        if (error.data) {
            console.error('API Error Details:', error.data);
        }
        process.exit(1);
    }
}

main();
