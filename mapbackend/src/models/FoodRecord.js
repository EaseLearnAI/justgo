const mongoose = require('mongoose');

const foodRecordSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, '记录名称不能为空']
  },
  type: {
    type: String,
    enum: ['intake', 'consume'],
    required: true
  },
  // 热量估算值（主要显示值）
  calories: {
    type: Number,
    required: [true, '卡路里不能为空'],
    min: 0
  },
  // 热量最小值（科学范围下限）
  calorieMin: {
    type: Number,
    default: 0,
    min: 0
  },
  // 热量最大值（科学范围上限）
  calorieMax: {
    type: Number,
    default: 0,
    min: 0
  },
  // 数量描述
  quantity: {
    type: String,
    default: '1份'
  },
  // 单位
  unit: {
    type: String,
    default: '份'
  },
  // 运动相关（仅 type='consume' 时使用）
  duration: {
    type: Number, // 分钟
    default: 0
  },
  distance: {
    type: Number, // 公里
    default: 0
  },
  exerciseType: {
    type: String,
    enum: ['walk', 'run', 'bike', 'other'],
    default: 'other'
  },
  // 关联运动路线（complete 入账时写入，避免 start/generate 双计）
  routeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExerciseRoute',
    index: true
  },
  // 路线偏好（运动时）
  preferences: [{
    type: String
  }],
  // 图片 URL（图片分析时）
  imageUrl: {
    type: String,
    default: ''
  },
  // 记录来源
  source: {
    type: String,
    enum: ['text', 'vision', 'manual'],
    default: 'text'
  },
  time: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 索引优化查询
foodRecordSchema.index({ user: 1, time: -1 });
foodRecordSchema.index({ user: 1, type: 1, time: -1 });

// 静态方法：获取用户今日记录
foodRecordSchema.statics.getTodayRecords = function(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return this.find({
    user: userId,
    time: {
      $gte: today,
      $lt: tomorrow
    }
  }).sort({ time: -1 });
};

// 静态方法：获取用户今日统计
foodRecordSchema.statics.getTodayStats = async function(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const records = await this.find({
    user: userId,
    time: {
      $gte: today,
      $lt: tomorrow
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
  
  return {
    intake,
    consume,
    net: intake - consume,
    recordCount: records.length
  };
};

module.exports = mongoose.model('FoodRecord', foodRecordSchema);
