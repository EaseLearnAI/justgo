const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: [true, '手机号不能为空'],
    unique: true,
    trim: true,
    match: [/^1\d{10}$/, '请输入有效的手机号']
  },
  password: {
    type: String,
    required: [true, '密码不能为空'],
    minlength: [6, '密码至少6个字符'],
    select: false // 查询时默认不返回密码
  },
  name: {
    type: String,
    default: function() {
      return this.phone;
    }
  },
  avatar: {
    type: String,
    default: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'
  },
  // 身体数据
  bodyStats: {
    height: {
      type: Number, // cm
      default: 170
    },
    weight: {
      type: Number, // kg
      default: 65
    },
    age: {
      type: Number,
      default: 25
    },
    gender: {
      type: String,
      enum: ['male', 'female'],
      default: 'male'
    }
  },
  // 活动水平（用于计算 TDEE）
  activityLevel: {
    type: String,
    enum: ['sedentary', 'light', 'moderate', 'active', 'very_active'],
    default: 'moderate'
  },
  // 目标取向
  goalOrientation: {
    type: String,
    enum: ['lose', 'maintain', 'gain'],
    default: 'maintain'
  },
  // 运动感受偏好（用户希望运动结束后的状态）
  exerciseFeeling: {
    type: String,
    enum: ['relaxed', 'moderate', 'intense'],
    default: 'moderate'
  },
  // 运动后状态偏好（用户希望运动结束后的状态）
  preferredPostExerciseState: {
    type: String,
    enum: ['relaxed', 'moderate', 'intense'],
    default: 'moderate'
  },
  // 缓存计算结果（每次更新身体数据时更新）
  cachedStats: {
    bmr: { type: Number, default: 0 },
    tdee: { type: Number, default: 0 },
    baseMetabolism: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  },
  // 累计统计
  totalStats: {
    totalCaloriesBurned: { type: Number, default: 0 },
    totalExerciseMinutes: { type: Number, default: 0 },
    totalDistance: { type: Number, default: 0 }
  },
  // 打卡统计
  streakDays: {
    type: Number,
    default: 0
  },
  lastCheckIn: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 保存前加密密码
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// 验证密码方法
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// 计算基础代谢率 (BMR) - Mifflin-St Jeor 公式
userSchema.methods.calculateBMR = function() {
  const { weight, height, age, gender } = this.bodyStats;
  
  let bmr;
  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }
  
  return Math.round(bmr);
};

// 活动系数配置
const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9
};

// NEAT 系数配置（基础代谢估算）
const NEAT_MULTIPLIERS = {
  sedentary: 1.05,
  light: 1.15,
  moderate: 1.25,
  active: 1.35,
  very_active: 1.45
};

// 计算 TDEE (每日总能量消耗)
userSchema.methods.calculateTDEE = function() {
  const bmr = this.calculateBMR();
  const multiplier = ACTIVITY_MULTIPLIERS[this.activityLevel] || ACTIVITY_MULTIPLIERS.moderate;
  return Math.round(bmr * multiplier);
};

// 计算基础代谢估算 (BMR + NEAT)
userSchema.methods.calculateBaseMetabolism = function() {
  const bmr = this.calculateBMR();
  const neatMultiplier = NEAT_MULTIPLIERS[this.activityLevel] || NEAT_MULTIPLIERS.moderate;
  return Math.round(bmr * neatMultiplier);
};

// 更新缓存的统计数据
userSchema.methods.updateCachedStats = async function() {
  this.cachedStats = {
    bmr: this.calculateBMR(),
    tdee: this.calculateTDEE(),
    baseMetabolism: this.calculateBaseMetabolism(),
    lastUpdated: new Date()
  };
  await this.save();
  return this.cachedStats;
};

// 保存前自动更新缓存统计
userSchema.pre('save', function(next) {
  if (this.isModified('bodyStats') || this.isModified('activityLevel')) {
    this.cachedStats = {
      bmr: this.calculateBMR(),
      tdee: this.calculateTDEE(),
      baseMetabolism: this.calculateBaseMetabolism(),
      lastUpdated: new Date()
    };
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
