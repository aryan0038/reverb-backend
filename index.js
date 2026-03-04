const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Groq = require('groq-sdk');
const Rephrase = require('./models/Rephrase'); 

const app = express();

// FIXED 1: Removed the trailing slash at the end of the Vercel URL
app.use(cors({
  origin: 'https://reverbwithsujal.vercel.app', 
  methods: ['GET', 'POST', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// Initialize Groq Client
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Updated Connection String
const MONGO_URI = process.env.MONGO_URI || 'mongodb://database:27017/reverbai';

mongoose.connect(MONGO_URI)
  .then(() => console.log("Connected to ReverbAI Database"))
  .catch(err => console.error("Database connection error:", err));

/**
 * Helper: Call Groq AI to rephrase text
 */
async function performRephrase(originalText, tone) {
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a professional writing assistant. Rephrase the user's text to match a ${tone} tone. Keep the output concise and only provide the rephrased text.`
        },
        {
          role: "user",
          content: originalText
        }
      ],
      model: "llama-3.3-70b-versatile", 
    });
    return chatCompletion.choices[0]?.message?.content || "Could not rephrase text.";
  } catch (error) {
    console.error("Groq API Error:", error);
    return "AI Rephrasing failed.";
  }
}

// GET /history - Returns all past rephrasings sorted by newest
app.get('/history', async (req, res) => {
  try {
    const history = await Rephrase.find().sort({ createdAt: -1 });
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: "Error fetching history" });
  }
});

// POST /rephrase - Main rephrasing logic
app.post('/rephrase', async (req, res) => {
  const { originalText, tone } = req.body;

  if (!originalText || !tone) {
    return res.status(400).json({ message: "Missing text or tone" });
  }

  // 1. Get the rephrased version from Groq
  const rephrasedText = await performRephrase(originalText, tone);

  // 2. Save to MongoDB
  const newEntry = new Rephrase({
    originalText,
    rephrasedText,
    tone
  });

  try {
    const savedEntry = await newEntry.save();
    res.status(201).json(savedEntry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// FIXED 2: Moved DELETE route up here where it belongs
app.delete('/history/:id', async (req, res) => {
  try {
    await Rephrase.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Delete failed' });
  }
});

// FIXED 3: Only ONE listen command at the very bottom
const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Reverb AI Server running on port ${PORT}`);
});






