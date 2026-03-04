const mongoose = require('mongoose');

const RephraseSchema = new mongoose.Schema({
  originalText: {
    type: String,
    required: [true, 'Original text is required'],
    trim: true
  },
  rephrasedText: {
    type: String,
    required: [true, 'Rephrased text is required'],
    trim: true
  },
  tone: {
    type: String,
    enum: {
      values: ['formal', 'casual', 'creative'],
      message: '{VALUE} is not a supported tone'
    },
    default: 'formal',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Rephrase', RephraseSchema);