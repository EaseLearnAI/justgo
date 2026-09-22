require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const { warnMissingSecrets } = require('./config/env');
const logger = require('./middleware/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// 导入路由
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const recordsRoutes = require('./routes/records');
const aiRoutes = require('./routes/ai');
const visionRoutes = require('./routes/vision');
const statsRoutes = require('./routes/stats');
const routeRoutes = require('./routes/route');

warnMissingSecrets();

// 创建 Express 应用
const app = express();

// 连接数据库
connectDB();

// 中间件
app.use(cors()); // 跨域支持
app.use(express.json()); // 解析 JSON 请求体
app.use(express.urlencoded({ extended: true })); // 解析 URL 编码请求体
app.use(logger); // 日志记录

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/records', recordsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/vision', visionRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/route', routeRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Just Go! 后端服务运行正常',
    timestamp: new Date().toISOString()
  });
});

// 根路径
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: '欢迎使用 Just Go! API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      user: '/api/user',
      records: '/api/records',
      ai: '/api/ai',
      vision: '/api/vision',
      route: '/api/route'
    }
  });
});

// 错误处理
app.use(notFound);
app.use(errorHandler);

// 启动服务器
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  // Server started
});

// 优雅关闭
process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  server.close(() => {
    process.exit(0);
  });
});

module.exports = app;
