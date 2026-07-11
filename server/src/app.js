const express = require('express');
const cors = require('cors');
const AppError = require('./utils/AppError');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

app.use((req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});

app.use(errorHandler);

module.exports = app;
