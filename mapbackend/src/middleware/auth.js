const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 保护路由 - 验证 JWT token
exports.protect = async (req, res, next) => {
  try {
    let token;

    // 从 header 中获取 token
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未授权，请先登录'
      });
    }

    try {
      // 验证 token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 获取用户信息（不包含密码）
      req.user = await User.findById(decoded.id);

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: '用户不存在'
        });
      }

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token 无效或已过期'
      });
    }
  } catch (error) {
    console.error('认证错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

// 生成 JWT Token
exports.generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};
