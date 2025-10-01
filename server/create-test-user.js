#!/usr/bin/env node
import userStore from './src/auth/user.store.js';
import passwordStore from './src/auth/password.store.js';

async function createTestUser() {
    console.log('🧪 Creating test user for hybrid authentication system...\n');

    const username = 'testuser';
    const password = 'TempPass123!';
    const email = 'test@example.com';

    try {
        // Step 1: Add to user store (simulating completed Cognito registration)
        const user = await userStore.addUser(username, email, `test_${Date.now()}`);
        console.log('✅ User added to store:', user);

        // Step 2: Set password for internal authentication
        await passwordStore.setPassword(username, password);
        console.log('✅ Password set for user');

        console.log('\n🎉 Test user created successfully!');
        console.log('📋 Test credentials:');
        console.log(`   Username: ${username}`);
        console.log(`   Password: ${password}`);
        console.log(`   Email: ${email}`);

        console.log('\n🧪 You can now test login with:');
        console.log(`curl -X POST http://localhost:8080/api/auth/login \\`);
        console.log(`  -H "Content-Type: application/json" \\`);
        console.log(`  -d '{"username":"${username}","password":"${password}"}'`);

    } catch (error) {
        console.error('❌ Error creating test user:', error);
    }
}

createTestUser();