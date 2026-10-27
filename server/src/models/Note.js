import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  customId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  filePath: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    default: 0
  },
  isListened: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // 24 hours TTL index in seconds
  }
});

const Note = mongoose.model('Note', noteSchema);

export default Note;

