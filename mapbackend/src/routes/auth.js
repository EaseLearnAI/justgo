const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');

/**
 * @route   POST /api/auth/register
 * @desc    用户注册
 * @access  Public
 */
router.post('/register', async (req, res, next) => {
  try {
    const { phone, password } = req.body;

    // 验证输入
    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: '请填写完整信息'
      });
    }

    // 验证手机号格式
    if (!/^1\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: '请输入正确的手机号'
      });
    }

    // 验证密码长度
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: '密码至少6个字符'
      });
    }

    // 检查手机号是否已注册
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '该手机号已注册'
      });
    }

    // 创建用户
    const user = await User.create({
      phone,
      password,
      name: phone
    });

    // 生成 token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        token,
        user: {
          id: user._id,
          phone: user.phone,
          name: user.name,
          avatar: user.avatar,
          bodyStats: user.bodyStats,
          goalOrientation: user.goalOrientation,
          activityLevel: user.activityLevel,
          streakDays: user.streakDays
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    用户登录
 * @access  Public
 */
router.post('/login', async (req, res, next) => {
  try {
    const { phone, password } = req.body;

    // 验证输入
    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: '请填写完整信息'
      });
    }

    // 查找用户（包含密码字段）
    const user = await User.findOne({ phone }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '账号或密码错误'
      });
    }

    // 验证密码
    const isPasswordMatch = await user.matchPassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: '账号或密码错误'
      });
    }

    // 生成 token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user._id,
          phone: user.phone,
          name: user.name,
          avatar: user.avatar,
          bodyStats: user.bodyStats,
          goalOrientation: user.goalOrientation,
          activityLevel: user.activityLevel,
          streakDays: user.streakDays
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
