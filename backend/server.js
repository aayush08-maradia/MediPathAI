const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Initialize Firebase first
const firebase = require('./config/firebase');

const hospitalRoutes = require('./routes/hospitals');
const searchRoutes = require('./routes/search');
const nlpRoutes = require('./routes/nlp');
const costRoutes = require('./routes/cost');
const rankingRoutes = require('./routes/ranking');
const confidenceRoutes = require('./routes/confidence');
const authRoutes = require('./routes/auth');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://localhost:8080'],
  credentials: true
}));

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/nlp', nlpRoutes);
app.use('/api/cost', costRoutes);
app.use('/api/ranking', rankingRoutes);
app.use('/api/confidence', confidenceRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
