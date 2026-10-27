import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';
import Note from '../models/Note.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRootDir = path.resolve(__dirname, '../../');

/**
 * Helper to resolve absolute file path from stored relative or filename
 */
const resolveFilePath = (filePath) => {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }
  return path.resolve(serverRootDir, filePath);
};

/**
 * @route   POST /api/notes
 * @desc    Upload an ephemeral audio note
 */
export const createNote = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    const customId = nanoid(10);
    // Relative path to uploaded file in uploads/
    const relativeFilePath = path.join('uploads', req.file.filename);
    const duration = parseFloat(req.body.duration) || 0;

    const newNote = new Note({
      customId,
      filePath: relativeFilePath,
      duration,
      isListened: false,
      createdAt: new Date()
    });

    await newNote.save();

    return res.status(201).json({
      success: true,
      id: customId,
      url: `/listen/${customId}`
    });
  } catch (error) {
    console.error('Error creating note:', error);
    // Clean up uploaded file if DB save fails
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        // ignore unlink error
      }
    }
    return res.status(500).json({ error: 'Server error while creating voice note' });
  }
};

/**
 * @route   GET /api/notes/:id
 * @desc    Fetch note metadata; checks expiration / listen state
 */
export const getNote = async (req, res) => {
  try {
    const { id } = req.params;
    const note = await Note.findOne({ customId: id });

    if (!note || note.isListened === true) {
      return res.status(404).json({ error: 'Message expired or destroyed' });
    }

    // Verify file still exists on disk
    const absolutePath = resolveFilePath(note.filePath);
    if (!fs.existsSync(absolutePath)) {
      // Auto-cleanup stale DB record if file missing
      await Note.deleteOne({ customId: id });
      return res.status(404).json({ error: 'Message expired or destroyed' });
    }

    return res.status(200).json({
      success: true,
      note: {
        id: note.customId,
        duration: note.duration,
        createdAt: note.createdAt,
        isListened: note.isListened
      }
    });
  } catch (error) {
    console.error('Error fetching note:', error);
    return res.status(500).json({ error: 'Server error while checking note' });
  }
};

/**
 * @route   GET /api/notes/:id/stream
 * @desc    Stream the raw audio file from disk
 */
export const streamNote = async (req, res) => {
  try {
    const { id } = req.params;
    const note = await Note.findOne({ customId: id });

    if (!note || note.isListened === true) {
      return res.status(404).json({ error: 'Message expired or destroyed' });
    }

    const absolutePath = resolveFilePath(note.filePath);

    if (!fs.existsSync(absolutePath)) {
      await Note.deleteOne({ customId: id });
      return res.status(404).json({ error: 'Message expired or destroyed' });
    }

    const stat = fs.statSync(absolutePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Support HTTP range requests for smooth media playback & seeking
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize || start > end) {
        res.status(416).set('Content-Range', `bytes */${fileSize}`);
        return res.end();
      }

      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(absolutePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'audio/webm'
      });

      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Accept-Ranges': 'bytes',
        'Content-Type': 'audio/webm'
      });

      fs.createReadStream(absolutePath).pipe(res);
    }
  } catch (error) {
    console.error('Error streaming audio:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to stream audio' });
    }
    res.end();
  }
};

/**
 * @route   POST /api/notes/:id/destroy
 * @desc    Permanently delete audio file and remove note document
 */
export const destroyNote = async (req, res) => {
  try {
    const { id } = req.params;
    const note = await Note.findOne({ customId: id });

    if (note) {
      const absolutePath = resolveFilePath(note.filePath);
      try {
        if (fs.existsSync(absolutePath)) {
          fs.unlinkSync(absolutePath);
        }
      } catch (err) {
        console.error(`Failed to delete file ${absolutePath}:`, err.message);
      }

      await Note.deleteOne({ customId: id });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error destroying note:', error);
    return res.status(500).json({ error: 'Server error while destroying note' });
  }
};

