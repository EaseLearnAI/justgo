// 全局错误处理中间件
exports.errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // 日志输出错误
  console.error('错误详情:', err);

  // Mongoose 验证错误
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    return res.status(400).json({
      success: false,
      message: message || '数据验证失败'
    });
  }

  // Mongoose 重复键错误
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    const message = field === 'phone' ? '该手机号已被注册' : '该数据已存在';
    return res.status(400).json({
      success: false,
      message
    });
  }

  // Mongoose 无效 ObjectId
  if (err.name === 'CastError') {
    return res.status(404).json({
      success: false,
      message: '资源未找到'
    });
  }

  // JWT 错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token 无效'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token 已过期'
    });
  }

  // 默认错误
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || '服务器错误'
  });
};

// 404 处理
exports.notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `未找到路由 - ${req.originalUrl}`
  });
};
