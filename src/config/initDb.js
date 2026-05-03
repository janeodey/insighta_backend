const pool = require("./db");

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      github_id VARCHAR(255) UNIQUE NOT NULL,
      username VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      avatar_url TEXT,
      role VARCHAR(20) DEFAULT 'analyst' CHECK (role IN ('admin', 'analyst')),
      is_active BOOLEAN DEFAULT true,
      last_login_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      is_revoked BOOLEAN DEFAULT false,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS profiles (
      id UUID PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      gender VARCHAR(50),
      gender_probability NUMERIC,
      sample_size INTEGER,
      age INTEGER,
      age_group VARCHAR(50),
      country_id VARCHAR(10),
      country_name VARCHAR(255),
      country_probability NUMERIC,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS request_logs (
      id SERIAL PRIMARY KEY,
      method VARCHAR(10),
      endpoint TEXT,
      status_code INTEGER,
      response_time_ms INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log("PostgreSQL tables created ✅");
}

module.exports = initDb;