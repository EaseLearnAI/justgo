const mongoose = require('mongoose');

const dailySummarySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String,  // YYYY-MM-DD 格式
    required: true
  },
  // 热量数据
  intake: {
    type: Number,
    default: 0
  },
  exercise: {
    type: Number,
    default: 0
  },
  base: {
    type: Number,
    default: 1600
  },
  netCalories: {
    type: Number,
    default: 0
  },
  // 运动数据
  duration: {
    type: Number,
    default: 0
  },
  distance: {
    type: Number,
    default: 0
  },
  // 完成状态
  completed: {
    type: Boolean,
    default: false
  },
  goalProgress: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// 复合唯一索引，确保每个用户每天只有一条记录
dailySummarySchema.index({ userId: 1, date: 1 }, { unique: true });

// 静态方法：获取或创建今日摘要
dailySummarySchema.statics.getOrCreateToday = async function(userId, baseBMR = 1600) {
  const today = new Date().toISOString().split('T')[0];
  
  let summary = await this.findOne({ userId, date: today });
  
  if (!summary) {
    summary = await this.create({
      userId,
      date: today,
      base: baseBMR
    });
  }
  
  return summary;
};

// 静态方法：更新今日摘要
dailySummarySchema.statics.updateTodaySummary = async function(userId, data) {
  const today = new Date().toISOString().split('T')[0];
  
  const summary = await this.findOneAndUpdate(
    { userId, date: today },
    { $set: data },
    { new: true, upsert: true }
  );
  
  return summary;
};

// 静态方法：获取月度统计
dailySummarySchema.statics.getMonthlyStats = async function(userId, yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number);
  const startDate = `${yearMonth}-01`;
  const endDate = `${yearMonth}-31`;
  
  const summaries = await this.find({
    userId,
    date: { $gte: startDate, $lte: endDate }
  }).sort({ date: 1 });
  
  const completedDays = summaries.filter(s => s.completed).length;
  const totalCalories = summaries.reduce((sum, s) => sum + s.exercise, 0);
  const totalDistance = summaries.reduce((sum, s) => sum + s.distance, 0);
  
  // 转换为日期数据映射
  const dailyData = {};
  summaries.forEach(s => {
    dailyData[s.date] = {
      completed: s.completed,
      calories: s.exercise,
      duration: s.duration,
      distance: s.distance
    };
  });
  
  return {
    completedDays,
    totalCalories,
    totalDistance,
    dailyData
  };
};

module.exports = mongoose.model('DailySummary', dailySummarySchema);
