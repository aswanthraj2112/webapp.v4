#!/usr/bin/env node

// Simple JWT token decoder for debugging
// Usage: node debug-jwt.js <token>

const token = process.argv[2];

if (!token) {
    console.log('Usage: node debug-jwt.js <jwt-token>');
    process.exit(1);
}

try {
    // Decode without verification (just for debugging)
    const parts = token.split('.');
    if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
    }

    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

    console.log('=== JWT Header ===');
    console.log(JSON.stringify(header, null, 2));

    console.log('\n=== JWT Payload ===');
    console.log(JSON.stringify(payload, null, 2));

    console.log('\n=== Group Information ===');
    console.log('cognito:groups:', payload['cognito:groups']);
    console.log('Groups type:', typeof payload['cognito:groups']);
    console.log('Is Array?', Array.isArray(payload['cognito:groups']));

    console.log('\n=== User Information ===');
    console.log('Username:', payload.username || payload['cognito:username']);
    console.log('Email:', payload.email);
    console.log('Sub:', payload.sub);

} catch (error) {
    console.error('Error decoding JWT:', error.message);
}