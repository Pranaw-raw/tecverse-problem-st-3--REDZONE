const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const { initDatabase } = require('./config/database');
const seedData = require('./seed/seedData');
const { initReminderService } = require('./services/reminderService');

const authRoutes = require('./routes/authRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const server = http.createServer(app);

// Setup Socket.IO for real-time WebSocket communication
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.set('io', io);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`[Socket Connected] Client ID: ${socket.id}`);

  // Join personal user room for private alerts & reminders
  socket.on('join_user_room', (userId) => {
    if (userId) {
      socket.join(`user_${userId}`);
      console.log(`[Socket Room] Client ${socket.id} joined user_${userId}`);
    }
  });

  // Join specific resource calendar room
  socket.on('join_resource_room', (resourceId) => {
    if (resourceId) {
      socket.join(`resource_${resourceId}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket Disconnected] Client ID: ${socket.id}`);
  });
});

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ReserveHub Smart Resource Booking Engine'
  });
});

const PORT = process.env.PORT || 5000;

// Initialize DB, Seed Data, Start Background Schedulers & Server
const startServer = async () => {
  try {
    await initDatabase();
    await seedData();
    initReminderService(io);

    server.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 ReserveHub Backend API Server running on port ${PORT}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
      console.log(`📡 WebSocket server initialized`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();
