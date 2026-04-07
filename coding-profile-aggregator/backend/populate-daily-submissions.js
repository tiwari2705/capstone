/**
 * populate-daily-submissions.js
 * 
 * This script generates sample daily submission data for testing the activity heatmap.
 * In production, this data would be collected from platform APIs during stats refresh.
 * 
 * Run: node populate-daily-submissions.js
 */

require('dotenv').config();
const { pool } = require('./src/config/db');

async function populateDailySubmissions() {
  const client = await pool.connect();
  
  try {
    console.log('Fetching users with stats...');
    
    // Get all users with stats
    const usersResult = await client.query(`
      SELECT DISTINCT user_id FROM stats WHERE problems_solved > 0
    `);

    if (usersResult.rows.length === 0) {
      console.log('No users with stats found. Please add some profiles and refresh stats first.');
      return;
    }

    console.log(`Found ${usersResult.rows.length} users with stats`);

    for (const { user_id } of usersResult.rows) {
      console.log(`\nGenerating daily submissions for user ${user_id}...`);
      
      // Get user's stats
      const statsResult = await client.query(`
        SELECT platform, problems_solved, submissions FROM stats WHERE user_id = $1
      `, [user_id]);

      // Generate daily submissions for last 365 days
      const today = new Date();
      const platforms = statsResult.rows;

      for (const platform of platforms) {
        const totalSubmissions = platform.submissions || platform.problems_solved || 0;
        
        if (totalSubmissions === 0) continue;

        console.log(`  ${platform.platform}: ${totalSubmissions} total submissions`);

        // Distribute submissions across random days in the past year
        const daysWithActivity = Math.min(Math.floor(totalSubmissions * 0.7), 365); // 70% of days have activity
        const activeDays = new Set();

        // Generate random active days
        while (activeDays.size < daysWithActivity) {
          const daysAgo = Math.floor(Math.random() * 365);
          activeDays.add(daysAgo);
        }

        // Distribute submissions across active days
        let remainingSubmissions = totalSubmissions;
        const activeDaysArray = Array.from(activeDays).sort((a, b) => b - a); // Most recent first

        for (let i = 0; i < activeDaysArray.length; i++) {
          const daysAgo = activeDaysArray[i];
          const date = new Date(today);
          date.setDate(date.getDate() - daysAgo);
          const dateStr = date.toISOString().split('T')[0];

          // Random number of submissions for this day (1-10)
          const isLastDay = i === activeDaysArray.length - 1;
          const maxForDay = isLastDay ? remainingSubmissions : Math.min(10, remainingSubmissions);
          const count = Math.max(1, Math.floor(Math.random() * maxForDay) + 1);

          // Insert daily submission
          await client.query(`
            INSERT INTO daily_submissions (user_id, submission_date, platform, count)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id, submission_date, platform) 
            DO UPDATE SET count = EXCLUDED.count
          `, [user_id, dateStr, platform.platform, count]);

          remainingSubmissions -= count;
          if (remainingSubmissions <= 0) break;
        }

        console.log(`    ✓ Generated ${activeDaysArray.length} days of activity`);
      }
    }

    console.log('\n✅ Daily submissions populated successfully!');
    console.log('\nYou can now view the activity heatmap in the dashboard.');

  } catch (error) {
    console.error('Error populating daily submissions:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

populateDailySubmissions();
