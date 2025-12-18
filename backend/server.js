const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors()); // Enable All CORS Requests
app.use(express.json());
app.use(morgan('combined'));

// Configuration from environment variables
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const APP_VERSION = process.env.APP_VERSION || '1.0.0';
const INSTANCE_ID = process.env.HOSTNAME || 'unknown';

// In-memory task storage (stateless - for demo purposes)
let tasks = [
  { id: 1, title: 'Deploy to Kubernetes', completed: false, priority: 'high' },
  { id: 2, title: 'Configure Ingress', completed: false, priority: 'medium' },
  { id: 3, title: 'Setup HPA', completed: false, priority: 'high' }
];

// Health check endpoint (for Kubernetes liveness probe)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    instance: INSTANCE_ID
  });
});

// Readiness check endpoint (for Kubernetes readiness probe)
app.get('/ready', (req, res) => {
  // In production, check dependencies (DB, cache, etc.)
  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    instance: INSTANCE_ID
  });
});

// Metrics endpoint (for monitoring/HPA)
app.get('/metrics', (req, res) => {
  res.status(200).json({
    instance: INSTANCE_ID,
    version: APP_VERSION,
    environment: NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    tasksCount: tasks.length
  });
});

// API Info
app.get('/api/info', (req, res) => {
  res.json({
    service: 'Task Manager API',
    version: APP_VERSION,
    environment: NODE_ENV,
    instance: INSTANCE_ID,
    timestamp: new Date().toISOString()
  });
});

// Get all tasks
app.get('/api/tasks', (req, res) => {
  res.json({
    success: true,
    data: tasks,
    instance: INSTANCE_ID
  });
});

// Get task by ID
app.get('/api/tasks/:id', (req, res) => {
  const task = tasks.find(t => t.id === parseInt(req.params.id));
  if (!task) {
    return res.status(404).json({ success: false, message: 'Task not found' });
  }
  res.json({ success: true, data: task });
});

// Create new task
app.post('/api/tasks', (req, res) => {
  const { title, priority = 'medium' } = req.body;

  if (!title) {
    return res.status(400).json({ success: false, message: 'Title is required' });
  }

  const newTask = {
    id: tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1,
    title,
    completed: false,
    priority,
    createdAt: new Date().toISOString(),
    instance: INSTANCE_ID
  };

  tasks.push(newTask);
  res.status(201).json({ success: true, data: newTask });
});

// Update task
app.put('/api/tasks/:id', (req, res) => {
  const taskIndex = tasks.findIndex(t => t.id === parseInt(req.params.id));

  if (taskIndex === -1) {
    return res.status(404).json({ success: false, message: 'Task not found' });
  }

  tasks[taskIndex] = {
    ...tasks[taskIndex],
    ...req.body,
    id: tasks[taskIndex].id, // Prevent ID change
    updatedAt: new Date().toISOString()
  };

  res.json({ success: true, data: tasks[taskIndex] });
});

// Delete task
app.delete('/api/tasks/:id', (req, res) => {
  const taskIndex = tasks.findIndex(t => t.id === parseInt(req.params.id));

  if (taskIndex === -1) {
    return res.status(404).json({ success: false, message: 'Task not found' });
  }

  const deletedTask = tasks.splice(taskIndex, 1)[0];
  res.json({ success: true, data: deletedTask });
});

// Simulate CPU load (for testing HPA)
app.get('/api/stress', (req, res) => {
  const duration = parseInt(req.query.duration) || 5000;
  const start = Date.now();

  while (Date.now() - start < duration) {
    Math.sqrt(Math.random());
  }

  res.json({
    success: true,
    message: `CPU stressed for ${duration}ms`,
    instance: INSTANCE_ID
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend API running on port ${PORT}`);
  console.log(`📦 Instance: ${INSTANCE_ID}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`📌 Version: ${APP_VERSION}`);
});
