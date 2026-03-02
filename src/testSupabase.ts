import { UserModel } from './models/userModel';
import dotenv from 'dotenv';
dotenv.config();

console.log('Testing Supabase Connection...');

async function testConnection() {
    try {
        const users = await UserModel.getAll();
        console.log(`✅ Connection Successful! Found ${users.length} users in 'users' table.`);
    } catch (error: any) {
        if (error.message.includes('relation "users" does not exist')) {
            console.error('❌ Connection successful, but the "users" table DOES NOT EXIST YET inside Supabase!');
            console.error('📋 Please run the SQL command provided in the chat to create the table.');
        } else {
            console.error('❌ Supabase Error:', error.message);
        }
    }
}

testConnection();
