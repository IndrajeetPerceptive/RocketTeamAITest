import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import { Pool } from 'pg';

const app = express();
app.use(cors());
app.use(express.json());
dotenv.config()
// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
   ssl: {
    rejectUnauthorized: false
  }
});

// ---- SAFETY CHECK (CRITICAL) ----
function isReadOnlyQuery(query) {
  return /^\s*select\s/i.test(query);
}

// ---- SQL EXECUTION ENDPOINT ----
app.post("/execute-sql", async (req, res) => {
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: "SQL query is required" });
  }

  if (!isReadOnlyQuery(query)) {
    return res.status(403).json({
      error: "Only SELECT queries are allowed",
    });
  }

  try {
    console.log(query)

    const result = await pool.query(`${query}`);
    res.json({
      columns: result.fields.map((f) => f.name),
      rows: result.rows,
      rowCount: result.rowCount,
    });
  } catch (err) {
    console.error("SQL error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ---- HEALTH CHECK ----
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// ---- START SERVER ----
app.listen(process.env.PORT, () => {
  console.log(`SQL executor running on port ${process.env.PORT}`);
});
