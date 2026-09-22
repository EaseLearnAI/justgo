const mongoose = require('mongoose');

/**
 * DailySummary — 遗留日摘要集合
 * 新代码统一用 `user`；保留 `userId` 读写兼容旧文档
 */
const dailySummarySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  /** @deprecated 使用 user；读写时与 user 同步 */
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  date: {
    type: String,
    required: true
  },
  intake: { type: Number, default: 0 },
  exercise: { type: Number, default: 0 },
  base: { type: Number, default: 1600 },
  netCalories: { type: Number, default: 0 },
  duration: { type: Number, default: 0 },
  distance: { type: Number, default: 0 },
  completed: { type: Boolean, default: false },
  goalProgress: { type: Number, default: 0 }
}, {
  timestamps: true
});

dailySummarySchema.pre('validate', function (next) {
  if (this.user && !this.userId) this.userId = this.user;
  if (this.userId && !this.user) this.user = this.userId;
  if (!this.user && !this.userId) {
    return next(new Error('DailySummary 需要 user / userId'));
  }
  next();
});

dailySummarySchema.index({ user: 1, date: 1 }, { unique: true, sparse: true });
dailySummarySchema.index({ userId: 1, date: 1 }, { unique: true, sparse: true });

dailySummarySchema.statics.getOrCreateToday = async function (userId, baseBMR = 1600) {
  const today = new Date().toISOString().split('T')[0];

  let summary = await this.findOne({
    date: today,
    $or: [{ user: userId }, { userId }]
  });

  if (!summary) {
    summary = await this.create({
      user: userId,
      userId,
      date: today,
      base: baseBMR
    });
  }

  return summary;
};

dailySummarySchema.statics.updateTodaySummary = async function (userId, data) {
  const today = new Date().toISOString().split('T')[0];

  return this.findOneAndUpdate(
    { date: today, $or: [{ user: userId }, { userId }] },
    { $set: { ...data, user: userId, userId } },
    { new: true, upsert: true }
  );
};

dailySummarySchema.statics.getMonthlyStats = async function (userId, yearMonth) {
  const startDate = `${yearMonth}-01`;
  const endDate = `${yearMonth}-31`;

  const summaries = await this.find({
    $or: [{ user: userId }, { userId }],
    date: { $gte: startDate, $lte: endDate }
  }).sort({ date: 1 });

  const completedDays = summaries.filter((s) => s.completed).length;
  const totalCalories = summaries.reduce((sum, s) => sum + s.exercise, 0);
  const totalDistance = summaries.reduce((sum, s) => sum + s.distance, 0);

  const dailyData = {};
  summaries.forEach((s) => {
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
