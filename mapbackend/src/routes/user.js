const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const ossService = require('../services/ossService');

// 配置 multer 上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB 限制
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('只允许上传图片文件 (jpeg, jpg, png, gif, webp)'));
  }
});

// 所有路由都需要认证
router.use(protect);

/**
 * @route   GET /api/user/profile
 * @desc    获取当前用户信息
 * @access  Private
 */
router.get('/profile', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          phone: user.phone,
          name: user.name,
          avatar: user.avatar,
          bodyStats: user.bodyStats,
          goalOrientation: user.goalOrientation,
          activityLevel: user.activityLevel,
          exerciseFeeling: user.exerciseFeeling,
          streakDays: user.streakDays,
          lastCheckIn: user.lastCheckIn,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/user/profile
 * @desc    更新用户基本信息
 * @access  Private
 */
router.put('/profile', async (req, res, next) => {
  try {
    const { name, avatar } = req.body;
    
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (avatar) user.avatar = avatar;

    await user.save();

    res.status(200).json({
      success: true,
      message: '信息更新成功',
      data: {
        user: {
          id: user._id,
          phone: user.phone,
          name: user.name,
          avatar: user.avatar,
          bodyStats: user.bodyStats,
          goals: user.goals,
          streakDays: user.streakDays
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/user/avatar
 * @desc    上传用户头像到 OSS
 * @access  Private
 */
router.post('/avatar', upload.single('avatar'), async (req, res, next) => {
  console.log('===================================');
  console.log('🖼️ 开始处理头像上传');
  console.log('===================================');
  
  try {
    if (!req.file) {
      console.error('❌ 没有上传文件');
      return res.status(400).json({
        success: false,
        message: '请选择要上传的图片'
      });
    }

    console.log('📁 接收到文件:', req.file.originalname);
    console.log('📁 文件大小:', req.file.size, 'bytes');
    console.log('📁 临时路径:', req.file.path);

    // 上传到 OSS
    console.log('-----------------------------------');
    console.log('🚀 开始上传到 OSS...');
    console.log('-----------------------------------');
    
    const ossResult = await ossService.uploadFile(req.file.path, 'avatars');

    // 删除临时文件
    fs.unlink(req.file.path, (err) => {
      if (err) console.error('删除临时文件失败:', err);
      else console.log('🗑️ 临时文件已删除');
    });

    if (!ossResult.success) {
      console.error('❌ OSS 上传失败:', ossResult.error);
      return res.status(500).json({
        success: false,
        message: '头像上传失败，请稍后重试'
      });
    }

    console.log('✅ OSS 上传成功!');
    console.log('🔗 文件 URL:', ossResult.url);

    // 更新用户头像
    const user = await User.findById(req.user._id);
    user.avatar = ossResult.url;
    await user.save();

    console.log('✅ 用户头像已更新');
    console.log('===================================');
    console.log('🏁 头像上传流程结束');
    console.log('===================================');

    res.status(200).json({
      success: true,
      message: '头像上传成功',
      data: {
        avatar: ossResult.url,
        user: {
          id: user._id,
          name: user.name,
          avatar: user.avatar
        }
      }
    });
  } catch (error) {
    console.error('❌ 头像上传异常:', error);
    
    // 删除临时文件
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, () => {});
    }
    
    next(error);
  }
});

/**
 * @route   PUT /api/user/body-stats
 * @desc    更新身体数据
 * @access  Private
 */
router.put('/body-stats', async (req, res, next) => {
  try {
    const { height, weight, age, gender } = req.body;
    
    const user = await User.findById(req.user._id);

    if (height) user.bodyStats.height = height;
    if (weight) user.bodyStats.weight = weight;
    if (age) user.bodyStats.age = age;
    if (gender && (gender === 'male' || gender === 'female')) {
      user.bodyStats.gender = gender;
    }

    await user.save();

    const bmr = user.calculateBMR();

    res.status(200).json({
      success: true,
      message: '身体数据更新成功',
      data: {
        bodyStats: user.bodyStats,
        bmr
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/user/goal-orientation
 * @desc    更新目标导向
 * @access  Private
 */
router.put('/goal-orientation', async (req, res, next) => {
  try {
    const { goalOrientation } = req.body;
    
    const validOrientations = ['lose', 'maintain', 'gain'];
    if (!validOrientations.includes(goalOrientation)) {
      return res.status(400).json({
        success: false,
        message: '无效的目标导向'
      });
    }
    
    const user = await User.findById(req.user._id);
    user.goalOrientation = goalOrientation;
    await user.save();

    res.status(200).json({
      success: true,
      message: '目标导向更新成功',
      data: {
        goalOrientation: user.goalOrientation
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/user/exercise-intensity
 * @desc    获取用户运动强度偏好
 * @access  Private
 */
router.get('/exercise-intensity', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      data: {
        exerciseIntensityPreference: user.exerciseFeeling
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/user/post-exercise-state
 * @desc    获取用户运动后状态偏好
 * @access  Private
 */
router.get('/post-exercise-state', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      data: {
        preferredPostExerciseState: user.preferredPostExerciseState
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/user/exercise-feeling
 * @desc    更新运动感受偏好
 * @access  Private
 */
router.put('/exercise-feeling', async (req, res, next) => {
  try {
    const { exerciseFeeling } = req.body;
    
    const validFeelings = ['relaxed', 'moderate', 'intense'];
    if (!validFeelings.includes(exerciseFeeling)) {
      return res.status(400).json({
        success: false,
        message: '无效的运动感受选项'
      });
    }
    
    const user = await User.findById(req.user._id);
    user.exerciseFeeling = exerciseFeeling;
    await user.save();

    res.status(200).json({
      success: true,
      message: '运动感受偏好更新成功',
      data: {
        exerciseFeeling: user.exerciseFeeling
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/user/post-exercise-state
 * @desc    更新用户运动后状态偏好
 * @access  Private
 */
router.put('/post-exercise-state', async (req, res, next) => {
  try {
    const { preferredPostExerciseState } = req.body;
    
    const validStates = ['relaxed', 'moderate', 'intense'];
    if (!validStates.includes(preferredPostExerciseState)) {
      return res.status(400).json({
        success: false,
        message: '无效的运动后状态选项'
      });
    }
    
    const user = await User.findById(req.user._id);
    user.preferredPostExerciseState = preferredPostExerciseState;
    await user.save();

    res.status(200).json({
      success: true,
      message: '运动后状态偏好更新成功',
      data: {
        preferredPostExerciseState: user.preferredPostExerciseState
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/user/activity-level
 * @desc    更新日常活动水平
 * @access  Private
 */
router.put('/activity-level', async (req, res, next) => {
  try {
    const { activityLevel } = req.body;
    
    const validLevels = ['sedentary', 'light', 'moderate', 'active', 'very_active'];
    if (!validLevels.includes(activityLevel)) {
      return res.status(400).json({
        success: false,
        message: '无效的活动水平'
      });
    }
    
    const user = await User.findById(req.user._id);
    user.activityLevel = activityLevel;
    await user.save();

    res.status(200).json({
      success: true,
      message: '活动水平更新成功',
      data: {
        activityLevel: user.activityLevel
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/user/check-in
 * @desc    用户签到
 * @access  Private
 */
router.post('/check-in', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 检查是否已签到
    if (user.lastCheckIn) {
      const lastCheckIn = new Date(user.lastCheckIn);
      lastCheckIn.setHours(0, 0, 0, 0);

      if (lastCheckIn.getTime() === today.getTime()) {
        return res.status(400).json({
          success: false,
          message: '今天已经签到过了'
        });
      }

      // 检查是否连续
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (lastCheckIn.getTime() === yesterday.getTime()) {
        user.streakDays += 1;
      } else {
        user.streakDays = 1;
      }
    } else {
      user.streakDays = 1;
    }

    user.lastCheckIn = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: '签到成功',
      data: {
        streakDays: user.streakDays
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/user/bmr
 * @desc    获取基础代谢率
 * @access  Private
 */
router.get('/bmr', async (req, res, next) => {
  try {
    const bmr = req.user.calculateBMR();

    res.status(200).json({
      success: true,
      data: {
        bmr,
        bodyStats: req.user.bodyStats
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
