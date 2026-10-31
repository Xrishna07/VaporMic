import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import noteRoutes from './routes/noteRoutes.js';
import fs from 'fs/promises';


dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Connect to MongoDB
connectDB();

// CORS configuration
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000'
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Blocked by CORS policy'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Range']
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploads statically only if ever needed for debugging (optional, streaming endpoint is primary)
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));

// API Routes
app.use('/api', noteRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'VaporMic API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error'
  });
});

// Background cleanup for expired audio files
const cleanupOrphanFiles = async () => {
  const uploadsDir = path.resolve(__dirname, 'uploads');
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  const now = Date.now();

  try {
    const files = await fs.readdir(uploadsDir, { withFileTypes: true });

    for (const file of files) {
      if (file.name === '.gitkeep' || !file.isFile()) continue;

      const filePath = path.join(uploadsDir, file.name);
      const stats = await fs.stat(filePath);

      if (now - stats.mtimeMs > maxAge) {
        await fs.unlink(filePath);
        console.log(`[Cleanup] Deleted expired audio: ${file.name}`);
      }
    }
  } catch (error) {
    console.error('[Cleanup] Error:', error.message);
  }
};

// Run on startup and every hour
cleanupOrphanFiles();
setInterval(cleanupOrphanFiles, 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`[VaporMic Server] Running on http://localhost:${PORT}`);
  console.log(`[VaporMic Server] Allowed Client URL: ${CLIENT_URL}`);
});

