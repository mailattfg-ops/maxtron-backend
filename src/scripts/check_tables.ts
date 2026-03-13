import { Pool } from 'pg'; 
import dotenv from 'dotenv'; 
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({ 
    connectionString: process.env.SUPABASE_DB_URL, 
    ssl: { rejectUnauthorized: false } 
});

import { VehicleRepairModel } from '../modules/keil/models/vehicleRepairModel';
async function check() { 
    try { 
        const data = await VehicleRepairModel.getAll('5be36c2a-c42e-4469-8551-115ede9ca728'); 
        console.log('REPAIR DATA:', JSON.stringify(data, null, 2)); 
    } catch (e: any) {
        console.error('MODEL ERROR:', e.message);
    } 
} 
check();
