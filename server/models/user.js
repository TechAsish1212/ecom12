import database from "../database/db.js";

export async function createUser() {
    try {
        const query = `
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(200) NOT NULL CHECK (char_length(name) >= '3'),
                email VARCHAR(200) NOT NULL UNIQUE CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'),
                password TEXT NOT NULL CHECK (char_length(password) >= '8'),
                role VARCHAR(200) NOT NULL CHECK (role IN ('user', 'admin')) DEFAULT 'user',
                avatar JSONB DEFAULT NULL,
                reset_password_token TEXT DEFAULT NULL,
                reset_password_expire TIMESTAMP DEFAULT NULL,
                otp_code VARCHAR(6) DEFAULT NULL,
                otp_expire TIMESTAMP DEFAULT NULL,
                is_verified BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await database.query(query);
    } catch (error) {
        console.log("Error creating user", error);
        process.exit(1);
    }
}