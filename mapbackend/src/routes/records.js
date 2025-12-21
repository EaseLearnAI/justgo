const express = require('express');
const router = express.Router();
const FoodRecord = require('../models/FoodRecord');
const { protect } = require('../middleware/auth');

// 所有路由都需要认证
router.use(protect);

/**
 * @route   GET /api/records
 * @desc    获取用户所有记录
 * @access  Private
 */
router.get('/', async (req, res, next) => {
  try {
    const { type, limit = 50, page = 1 } = req.query;
    
    const query = { user: req.user._id };
    if (type && (type === 'intake' || type === 'consume')) {
      query.type = type;
    }

    const records = await FoodRecord.find(query)
      .sort({ time: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await FoodRecord.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        records,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/records/today
 * @desc    获取今日记录
 * @access  Private
 */
router.get('/today', async (req, res, next) => {
  try {
    const records = await FoodRecord.getTodayRecords(req.user._id);

    res.status(200).json({
      success: true,
      data: {
        records
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/records/by-date
 * @desc    根据日期获取记录
 * @access  Private
 * @query   date - 日期字符串 (YYYY-MM-DD 格式)
 */
router.get('/by-date', async (req, res, next) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: '请提供日期参数'
      });
    }

    // 解析日期
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: '日期格式无效'
      });
    }

    // 设置查询范围（当天 00:00:00 到 23:59:59）
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const records = await FoodRecord.find({
      user: req.user._id,
      time: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).sort({ time: -1 });

    // 计算当天统计
    let intake = 0;
    let consume = 0;
    
    records.forEach(record => {
      if (record.type === 'intake') {
        intake += record.calories;
      } else {
        consume += record.calories;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        records,
        date: date,
        stats: {
          intake,
          consume,
          net: intake - consume,
          recordCount: records.length
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/records/by-date/stats
 * @desc    根据日期获取统计数据
 * @access  Private
 * @query   date - 日期字符串 (YYYY-MM-DD 格式)
 */
router.get('/by-date/stats', async (req, res, next) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: '请提供日期参数'
      });
    }

    // 解析日期
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: '日期格式无效'
      });
    }

    // 设置查询范围
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const records = await FoodRecord.find({
      user: req.user._id,
      time: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    let intake = 0;
    let consume = 0;
    
    records.forEach(record => {
      if (record.type === 'intake') {
        intake += record.calories;
      } else {
        consume += record.calories;
      }
    });

    const bmr = req.user.calculateBMR();

    res.status(200).json({
      success: true,
      data: {
        date: date,
        intake,
        consume,
        base: bmr,
        net: intake - consume - bmr,
        recordCount: records.length
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/records/today/stats
 * @desc    获取今日统计
 * @access  Private
 */
router.get('/today/stats', async (req, res, next) => {
  try {
    const stats = await FoodRecord.getTodayStats(req.user._id);
    const bmr = req.user.calculateBMR();

    res.status(200).json({
      success: true,
      data: {
        intake: stats.intake,
        consume: stats.consume,
        base: bmr,
        net: stats.intake - stats.consume - bmr,
        recordCount: stats.recordCount
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/records
 * @desc    创建新记录
 * @access  Private
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, type, calories, duration, distance, exerciseType, preferences } = req.body;

    // 验证必填字段
    if (!name || !type || !calories) {
      return res.status(400).json({
        success: false,
        message: '请填写完整信息'
      });
    }

    // 验证类型
    if (type !== 'intake' && type !== 'consume') {
      return res.status(400).json({
        success: false,
        message: '类型必须是 intake 或 consume'
      });
    }

    const record = await FoodRecord.create({
      user: req.user._id,
      name,
      type,
      calories,
      duration: duration || 0,
      distance: distance || 0,
      exerciseType: exerciseType || 'other',
      preferences: preferences || []
    });

    res.status(201).json({
      success: true,
      message: '记录创建成功',
      data: {
        record
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/records/:id
 * @desc    更新记录
 * @access  Private
 */
router.put('/:id', async (req, res, next) => {
  try {
    let record = await FoodRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: '记录不存在'
      });
    }

    // 确保用户只能更新自己的记录
    if (record.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: '无权限更新此记录'
      });
    }

    const { name, calories, duration, distance, preferences } = req.body;
    
    if (name) record.name = name;
    if (calories) record.calories = calories;
    if (duration !== undefined) record.duration = duration;
    if (distance !== undefined) record.distance = distance;
    if (preferences) record.preferences = preferences;

    await record.save();

    res.status(200).json({
      success: true,
      message: '记录更新成功',
      data: {
        record
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/records/:id
 * @desc    删除记录
 * @access  Private
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const record = await FoodRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: '记录不存在'
      });
    }

    // 确保用户只能删除自己的记录
    if (record.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: '无权限删除此记录'
      });
    }

    await record.deleteOne();

    res.status(200).json({
      success: true,
      message: '记录删除成功'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
