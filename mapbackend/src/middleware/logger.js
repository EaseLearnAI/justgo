const morgan = require('morgan');

// 自定义日志格式
morgan.token('body', (req) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    // 不记录敏感信息
    const body = { ...req.body };
    if (body.password) body.password = '***';
    return JSON.stringify(body);
  }
  return '';
});

// 开发环境日志
const devLogger = morgan('🚀 :method :url :status :response-time ms - :body');

// 生产环境日志
const prodLogger = morgan('combined');

// 导出适合当前环境的日志中间件
module.exports = process.env.NODE_ENV === 'production' ? prodLogger : devLogger;
