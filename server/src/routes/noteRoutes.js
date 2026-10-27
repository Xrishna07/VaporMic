import express from 'express';
import { upload } from '../middleware/upload.js';
import {
  createNote,
  getNote,
  streamNote,
  destroyNote
} from '../controllers/noteController.js';

const router = express.Router();

// Upload audio note
router.post('/notes', upload.single('audio'), createNote);

// Get note metadata / status
router.get('/notes/:id', getNote);

// Stream raw audio
router.get('/notes/:id/stream', streamNote);

// Manually / trigger destroy note
router.post('/notes/:id/destroy', destroyNote);

export default router;

