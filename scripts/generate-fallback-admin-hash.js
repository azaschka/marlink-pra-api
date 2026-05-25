#!/usr/bin/env node

/**
 * Generate bcrypt hash for fallback admin password
 * Usage: node scripts/generate-fallback-admin-hash.js "your-secure-password"
 */

const bcrypt = require('bcrypt');

async function generateHash() {
    const password = process.argv[2];

    if (!password) {
        console.error('Error: Please provide a password as argument');
        console.error('Usage: node scripts/generate-fallback-admin-hash.js "your-secure-password"');
        process.exit(1);
    }

    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);

    console.log('\n=== Fallback Admin Configuration ===\n');
    console.log('Add these environment variables to your .env file:\n');
    console.log('FALLBACK_ADMIN_ENABLED=true');
    console.log('FALLBACK_ADMIN_USERNAME=your-chosen-username');
    console.log(`FALLBACK_ADMIN_PASSWORD_HASH=${hash}`);
    console.log(`Fallback plaintext password: ${password}`);
    console.log('\n=====================================\n');
    console.log('⚠️  Keep these credentials secure and never commit to git!');
    console.log('📝 The fallback admin will have Super Admin privileges\n');
}

generateHash().catch((error) => {
    console.error('Error generating hash:', error);
    process.exit(1);
});
