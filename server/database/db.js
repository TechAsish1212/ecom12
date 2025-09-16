import pkg from 'pg';
import { config } from 'dotenv';
config({ path: './config/.env' }); 
const { Client } = pkg;

const database = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: "postgres",
    password: "1227",
    database: process.env.DB_NAME,
});

try {
    await database.connect();
    console.log('Connected to the database successfully');
} catch (error) {
    console.log("Database connection failed", error);
    process.exit(1);
}


export default database; 