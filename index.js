const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Groq = require('groq-sdk');
const { clerkMiddleware, requireAuth } = require('@clerk/express');
const Rephrase = require('./models/Rephrase');

const app = express();
app.use(cors({
  origin: 'https://reverbwithsujal.vercel.app', // <-- This is your new VIP pass
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS', 'PUT', 'PATCH'],
  credentials: true
}));
app.use(express.json());
app.use(clerkMiddleware());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://database:27017/reverbai';

mongoose.connect(MONGO_URI)
  .then(() => console.log("Connected to ReverbAI Database"))
  .catch(err => console.error("Database connection error:", err));

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

// GET /history - Returns history for the logged-in user only
app.get('/history', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const history = await Rephrase.find({ userId }).sort({ createdAt: -1 });
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: "Error fetching history" });
  }
});

// POST /rephrase - Saves rephrase linked to logged-in user
app.post('/rephrase', requireAuth(), async (req, res) => {
  const { originalText, tone } = req.body;
  const userId = req.auth.userId;

  if (!originalText || !tone) {
    return res.status(400).json({ message: "Missing text or tone" });
  }

  const rephrasedText = await performRephrase(originalText, tone);

  const newEntry = new Rephrase({
    originalText,
    rephrasedText,
    tone,
    userId
  });

  try {
    const savedEntry = await newEntry.save();
    res.status(201).json(savedEntry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /history/:id - Only delete if it belongs to the logged-in user
app.delete('/history/:id', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    await Rephrase.findOneAndDelete({ _id: req.params.id, userId });
    res.status(200).json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Delete failed' });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Reverb AI Server running on port ${PORT}`));


