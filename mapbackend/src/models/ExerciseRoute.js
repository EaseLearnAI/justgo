const mongoose = require('mongoose');

/**
 * 运动路线记录模型
 * 存储用户生成的个性化运动路线，包括高德地图返回的详细信息
 */
const exerciseRouteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // 路线基本信息
  sportType: {
    type: String,
    enum: ['walk', 'run', 'bike'],
    required: true
  },
  
  // 路线距离和时间（高德地图返回的实际值）
  distance: {
    type: Number, // 米
    required: true,
    min: 0
  },
  duration: {
    type: Number, // 秒
    required: true,
    min: 0
  },
  
  // 计算的热量消耗
  estimatedCalories: {
    type: Number,
    required: true,
    min: 0
  },
  
  // 位置信息
  startLocation: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: String,
    city: String
  },
  endLocation: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: String,
    poiName: String, // 如果终点是POI，存储POI名称
    poiType: String
  },
  
  // 高德地图导航链接
  navigationUrl: {
    type: String,
    required: true
  },
  
  // 路线详情（来自LLM）
  routeDescription: String,
  routeHighlights: [String],
  safetyTips: [String],
  motivationalMessage: String,
  
  // 用户偏好
  preferences: {
    routeStyle: [String],
    mood: String,
    preferredPostExerciseState: String
  },
  
  // 周边POI信息
  nearbyPOIs: {
    type: [{
      name: { type: String, default: '' },
      type: { type: String, default: '' },
      distance: { type: Number, default: 0 }, // 米
      location: {
        lat: { type: Number, default: 0 },
        lng: { type: Number, default: 0 }
      },
      address: { type: String, default: '' }
    }],
    default: []
  },
  
  // 选中的POI（作为终点）
  selectedPOI: {
    name: String,
    type: String,
    distance: Number
  },
  
  // 路线状态
  status: {
    type: String,
    enum: ['generated', 'started', 'completed', 'cancelled'],
    default: 'generated'
  },
  
  // 实际运动数据（运动完成后更新）
  actualDistance: Number, // 米
  actualDuration: Number, // 秒
  actualCalories: Number,
  
  // 时间戳
  startedAt: Date,
  completedAt: Date,
  
  // 生成时间
  generatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 索引优化
exerciseRouteSchema.index({ user: 1, generatedAt: -1 });
exerciseRouteSchema.index({ user: 1, status: 1 });
exerciseRouteSchema.index({ status: 1, generatedAt: -1 });

// 静态方法：获取用户今日路线
exerciseRouteSchema.statics.getTodayRoutes = function(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return this.find({
    user: userId,
    generatedAt: {
      $gte: today,
      $lt: tomorrow
    }
  }).sort({ generatedAt: -1 });
};

// 静态方法：获取用户最近的路线
exerciseRouteSchema.statics.getRecentRoutes = function(userId, limit = 10) {
  return this.find({ user: userId })
    .sort({ generatedAt: -1 })
    .limit(limit);
};

// 实例方法：开始运动
exerciseRouteSchema.methods.start = async function() {
  this.status = 'started';
  this.startedAt = new Date();
  await this.save();
};

// 实例方法：完成运动
exerciseRouteSchema.methods.complete = async function(actualData = {}) {
  this.status = 'completed';
  this.completedAt = new Date();
  
  if (actualData.distance !== undefined) {
    this.actualDistance = actualData.distance;
  }
  if (actualData.duration !== undefined) {
    this.actualDuration = actualData.duration;
  }
  if (actualData.calories !== undefined) {
    this.actualCalories = actualData.calories;
  }
  
  await this.save();
};

module.exports = mongoose.model('ExerciseRoute', exerciseRouteSchema);

