#!/usr/bin/env node

/**
 * OAuth token generator for YouTube API
 */

const { google } = require('googleapis');
const readline = require('readline');
require('dotenv').config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function getTokens() {
  console.log('🔐 YouTube OAuth Token Generator');
  console.log('================================\n');

  const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
  const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
  const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ Missing YOUTUBE_CLIENT_ID or YOUTUBE_CLIENT_SECRET in .env file');
    console.log('Please run "npm run setup" first or check your .env file');
    rl.close();
    return;
  }

  console.log('This will generate OAuth tokens that allow your bot to send messages to chat.');
  console.log('If you only want to read chat (not send messages), you can skip this step.\n');

  const proceed = await question('Do you want to continue? (y/N): ');
  if (proceed.toLowerCase() !== 'y') {
    console.log('Token generation cancelled.');
    rl.close();
    return;
  }

  const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/youtube']
  });

  console.log('\n🔗 Step 1: Visit this URL to authorize the application:');
  console.log('━'.repeat(80));
  console.log(`${authUrl}`);
  console.log('━'.repeat(80));
  console.log('\n📋 Instructions:');
  console.log('1. Click the link above (or copy/paste into your browser)');
  console.log('2. Sign in with the YouTube account that owns the channel');
  console.log('3. Click "Allow" to grant permissions');
  console.log('4. Copy the authorization code from the page');
  console.log('5. Paste it below');

  const code = await question('\n🔑 Step 2: Enter the authorization code: ');

  if (!code || code.trim().length === 0) {
    console.log('❌ No authorization code provided. Exiting.');
    rl.close();
    return;
  }

  try {
    console.log('\n⏳ Exchanging authorization code for tokens...');
    
    const { tokens } = await oauth2Client.getToken(code.trim());
    
    console.log('\n✅ Success! OAuth tokens generated successfully');
    console.log('━'.repeat(60));
    console.log('📋 Your OAuth Tokens:');
    console.log('━'.repeat(60));
    console.log(JSON.stringify(tokens, null, 2));
    console.log('━'.repeat(60));
    
    console.log('\n📝 Next Steps:');
    console.log('1. Copy the entire JSON object above');
    console.log('2. Add this line to your .env file:');
    console.log(`   OAUTH_TOKENS=${JSON.stringify(tokens)}`);
    console.log('\n   OR if deploying to Railway:');
    console.log('   Add OAUTH_TOKENS as an environment variable with the JSON value');
    
    console.log('\n⚠️  Security Notes:');
    console.log('   - Keep these tokens secure and never share them publicly');
    console.log('   - These tokens allow sending messages as your account');
    console.log('   - If compromised, revoke access in your Google Account settings');
    console.log('   - Tokens will refresh automatically when they expire');
    
    console.log('\n🎉 Your bot can now send messages to chat!');
    
    // Offer to save directly to .env file
    const saveToEnv = await question('\n💾 Save directly to .env file? (y/N): ');
    if (saveToEnv.toLowerCase() === 'y') {
      await saveTokensToEnv(tokens);
    }
    
  } catch (error) {
    console.error('\n❌ Error retrieving tokens:');
    
    if (error.code === 'invalid_grant') {
      console.error('   - The authorization code has expired or is invalid');
      console.error('   - Please try again with a fresh authorization code');
    } else if (error.code === 'invalid_client') {
      console.error('   - Invalid client credentials');
      console.error('   - Check your YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET');
    } else {
      console.error(`   - ${error.message}`);
    }
    
    console.log('\n🔧 Troubleshooting:');
    console.log('   - Ensure you copied the entire authorization code');
    console.log('   - Make sure your OAuth client is configured for "Desktop application"');
    console.log('   - Verify your .env file has correct CLIENT_ID and CLIENT_SECRET');
    console.log('   - Try generating a new authorization code');
  }

  rl.close();
}

async function saveTokensToEnv(tokens) {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const envPath = path.join(process.cwd(), '.env');
    
    if (!fs.existsSync(envPath)) {
      console.log('❌ .env file not found. Please run "npm run setup" first.');
      return;
    }
    
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Remove existing OAUTH_TOKENS line if present
    envContent = envContent.replace(/^OAUTH_TOKENS=.*$/m, '');
    
    // Add new OAUTH_TOKENS line
    const tokenLine = `OAUTH_TOKENS=${JSON.stringify(tokens)}`;
    
    // Add to the OAuth section or at the end
    if (envContent.includes('# OAuth Tokens')) {
      envContent = envContent.replace(
        /(# OAuth Tokens.*?\n)/s,
        `$1${tokenLine}\n`
      );
    } else {
      envContent += `\n# OAuth Tokens (for sending messages)\n${tokenLine}\n`;
    }
    
    // Clean up extra newlines
    envContent = envContent.replace(/\n{3,}/g, '\n\n');
    
    fs.writeFileSync(envPath, envContent);
    
    console.log('✅ Tokens saved to .env file successfully!');
    console.log('🚀 Your bot is now ready to send messages');
    
  } catch (error) {
    console.error('❌ Failed to save tokens to .env file:', error.message);
    console.log('Please add the tokens manually to your .env file');
  }
}

// Validate existing tokens
async function validateTokens() {
  console.log('🔍 Validating existing OAuth tokens...\n');
  
  const tokensStr = process.env.OAUTH_TOKENS;
  if (!tokensStr) {
    console.log('❌ No OAUTH_TOKENS found in environment');
    console.log('Run "npm run get-tokens" to generate tokens');
    return false;
  }
  
  try {
    const tokens = JSON.parse(tokensStr);
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      'urn:ietf:wg:oauth:2.0:oob'
    );
    
    oauth2Client.setCredentials(tokens);
    
    // Try to refresh tokens if they're expired
    if (tokens.expiry_date && Date.now() >= tokens.expiry_date) {
      console.log('⏳ Tokens expired, attempting to refresh...');
      const { credentials } = await oauth2Client.refreshAccessToken();
      console.log('✅ Tokens refreshed successfully');
      
      // Offer to save refreshed tokens
      const save = await question('💾 Save refreshed tokens to .env? (y/N): ');
      if (save.toLowerCase() === 'y') {
        await saveTokensToEnv(credentials);
      }
    } else {
      console.log('✅ Tokens are valid and not expired');
    }
    
    // Test tokens by making a simple API call
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    
    try {
      await youtube.channels.list({
        part: ['snippet'],
        mine: true
      });
      console.log('✅ Tokens work correctly - API test passed');
      return true;
    } catch (apiError) {
      console.log('❌ Tokens exist but API test failed:', apiError.message);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Invalid token format:', error.message);
    console.log('Please run "npm run get-tokens" to generate new tokens');
    return false;
  }
}

// Revoke tokens
async function revokeTokens() {
  console.log('🗑️  Revoking OAuth tokens...\n');
  
  const tokensStr = process.env.OAUTH_TOKENS;
  if (!tokensStr) {
    console.log('❌ No tokens found to revoke');
    return;
  }
  
  const confirm = await question('⚠️  This will permanently revoke your bot\'s access. Continue? (y/N): ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('Revocation cancelled');
    return;
  }
  
  try {
    const tokens = JSON.parse(tokensStr);
    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      'urn:ietf:wg:oauth:2.0:oob'
    );
    
    oauth2Client.setCredentials(tokens);
    await oauth2Client.revokeCredentials();
    
    console.log('✅ Tokens revoked successfully');
    console.log('💡 Remove OAUTH_TOKENS from your .env file');
    console.log('🤖 Your bot will now run in read-only mode');
    
  } catch (error) {
    console.error('❌ Failed to revoke tokens:', error.message);
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🔐 OAuth Token Generator Help

Commands:
  npm run get-tokens              Generate new OAuth tokens
  npm run get-tokens -- --validate    Validate existing tokens  
  npm run get-tokens -- --revoke      Revoke existing tokens
  npm run get-tokens -- --help        Show this help

What are OAuth tokens?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OAuth tokens allow your bot to send messages to YouTube chat.
Without tokens, your bot can only read chat messages.

The tokens are tied to your YouTube account and allow the bot to:
- Send messages to live chat
- Act as your account in chat
- Access your channel information

Security:
- Tokens are stored locally in your .env file
- Never share tokens publicly
- Tokens refresh automatically when they expire
- You can revoke access anytime

Required Setup:
1. Google Cloud Project with YouTube Data API v3 enabled
2. OAuth 2.0 Client ID (Desktop application type)
3. Valid YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in .env
    `);
    rl.close();
    return;
  }
  
  if (args.includes('--validate')) {
    await validateTokens();
  } else if (args.includes('--revoke')) {
    await revokeTokens();
  } else {
    await getTokens();
  }
}

// Handle interruption gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 Token generation cancelled by user');
  rl.close();
  process.exit(0);
});

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Script failed:', error.message);
    rl.close();
    process.exit(1);
  });
}

module.exports = { getTokens, validateTokens, revokeTokens };