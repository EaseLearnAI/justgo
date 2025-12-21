# 数据库查询和GET接口数据来源说明

## 📊 数据库查询结果

### 1. ExerciseRoute 集合

**查询结果**：
- 找到 1 条路线
- ID: `69451eefbc6be4119a8b2954`
- 状态: `generated` ⚠️（应该是 `started` 或 `completed`）
- 消耗: 118 kcal
- 距离: 1765 米
- 时长: 1412 秒
- 生成时间: 2025-12-19 17:46:23
- 开始时间: 未开始 ⚠️
- 完成时间: 未完成

**问题**：路线状态是 `generated`，说明用户还没有成功点击"开始运动"按钮，或者API调用失败。

### 2. FoodRecord 集合 (type='consume')

**查询结果**：
- 找到 0 条消耗记录 ⚠️

**问题**：没有消耗记录，说明 `POST /api/route/:routeId/start` 接口没有被成功调用，或者调用失败。

### 3. User 集合 (totalStats)

**查询结果**：
- `totalCaloriesBurned`: 0 kcal ⚠️
- `totalExerciseMinutes`: 0 分钟 ⚠️
- `totalDistance`: 0 km ⚠️
- `streakDays`: 0 天

**问题**：`totalStats` 都是0，说明没有成功更新用户累计统计。

## 🔍 GET接口数据来源

### 1. GET /api/stats/daily-summary (DailySummaryCard.vue)

**数据来源**：

#### 1.1 FoodRecord 集合
```javascript
// 查询条件
{
  user: req.user._id,
  time: { $gte: today, $lt: tomorrow }
}

// 使用的字段
- type === 'intake': record.calories → intake
- type === 'consume': record.calories → consume (运动消耗)
```

**字段说明**：
- `calories`: Number，热量值（kcal）
- `type`: String，'intake' 或 'consume'
- `time`: Date，记录时间

#### 1.2 ExerciseRoute 集合
```javascript
// 查询条件
{
  user: req.user._id,
  $or: [
    { generatedAt: { $gte: today, $lt: tomorrow } },
    { startedAt: { $gte: today, $lt: tomorrow } },
    { completedAt: { $gte: today, $lt: tomorrow } }
  ]
}

// 过滤条件
route.status === 'started' || route.status === 'completed'

// 使用的字段
- route.actualCalories || route.estimatedCalories → routeCalories
- route.actualDistance || route.distance → routeDistance (米)
- route.actualDuration || route.duration → routeDuration (秒)
```

**字段说明**：
- `estimatedCalories`: Number，估算消耗（kcal）
- `actualCalories`: Number，实际消耗（kcal），优先使用
- `distance`: Number，距离（米）
- `actualDistance`: Number，实际距离（米），优先使用
- `duration`: Number，时长（秒）
- `actualDuration`: Number，实际时长（秒），优先使用
- `status`: String，'generated' | 'started' | 'completed' | 'cancelled'
- `generatedAt`: Date，生成时间
- `startedAt`: Date，开始时间
- `completedAt`: Date，完成时间

**计算公式**：
```javascript
totalExercise = FoodRecord.consume + ExerciseRoute.routeCalories
netCalories = intake - totalExercise - baseMetabolism
```

### 2. GET /api/stats/user-stats (StatsCard.vue)

**数据来源**：

#### 2.1 FoodRecord 集合
```javascript
// 查询条件
{
  user: req.user._id,
  type: 'consume'
}

// 使用的字段
- record.calories → totalCaloriesBurned
- record.duration → totalExerciseMinutes (分钟)
- record.distance → totalDistance (公里)
```

**字段说明**：
- `calories`: Number，消耗热量（kcal）
- `duration`: Number，运动时长（分钟）
- `distance`: Number，运动距离（公里）

#### 2.2 ExerciseRoute 集合
```javascript
// 查询条件
{
  user: req.user._id,
  status: { $in: ['started', 'completed'] }
}

// 使用的字段
- route.actualCalories || route.estimatedCalories → routeCalories
- route.actualDistance || route.distance → routeDistance (米，转换为公里)
- route.actualDuration || route.duration → routeMinutes (秒，转换为分钟)
```

**字段说明**：同 daily-summary

#### 2.3 User 集合
```javascript
// 查询条件
{
  _id: req.user._id
}

// 使用的字段
- user.streakDays → streakDays (打卡天数)
```

**字段说明**：
- `streakDays`: Number，连续打卡天数

**计算公式**：
```javascript
totalCaloriesBurned = FoodRecord累计消耗 + ExerciseRoute累计消耗
totalExerciseMinutes = FoodRecord累计时长 + ExerciseRoute累计时长
totalDistance = FoodRecord累计距离 + ExerciseRoute累计距离
```

### 3. GET /api/stats/goal-progress (GoalProgress.vue)

**数据来源**：

#### 3.1 FoodRecord 集合
```javascript
// 查询条件（今日）
{
  user: req.user._id,
  time: { $gte: today, $lt: tomorrow }
}

// 使用的字段
- type === 'intake': record.calories → intake
- type === 'consume': record.calories → consume
```

#### 3.2 ExerciseRoute 集合
```javascript
// 查询条件（今日，所有状态）
{
  user: req.user._id,
  $or: [
    { generatedAt: { $gte: today, $lt: tomorrow } },
    { startedAt: { $gte: today, $lt: tomorrow } },
    { completedAt: { $gte: today, $lt: tomorrow } }
  ]
}

// 过滤条件
route.status === 'started' || route.status === 'completed'

// 使用的字段
- route.actualCalories || route.estimatedCalories → routeCalories
- route.actualDuration || route.duration → routeMinutes (秒，转换为分钟)
```

#### 3.3 User 集合
```javascript
// 查询条件
{
  _id: req.user._id
}

// 使用的字段
- user.goalOrientation → 目标取向 ('lose' | 'maintain' | 'gain')
- user.bodyStats → 身体数据（计算TDEE）
- user.activityLevel → 活动水平（计算TDEE）
```

**计算公式**：
```javascript
// 根据目标取向计算目标
if (goalOrientation === 'lose') {
  dailyCalorieGoal = TDEE - 500;
  dailyExerciseGoal = 60; // 分钟
} else if (goalOrientation === 'gain') {
  dailyCalorieGoal = TDEE + 500;
  dailyExerciseGoal = 30; // 分钟
} else {
  dailyCalorieGoal = TDEE;
  dailyExerciseGoal = 45; // 分钟
}

// 计算进度
exerciseProgress = (totalExerciseMinutes / dailyExerciseGoal) * 100
calorieProgress = (根据目标取向计算)
overallProgress = (exerciseProgress + calorieProgress) / 2
```

## ⚠️ 当前问题分析

### 问题1：路线状态是 `generated`

**原因**：
- 用户点击"启动高德地图开始运动"按钮
- 前端调用 `POST /api/route/:routeId/start`
- 但是从终端日志看，API返回了404错误：
  ```
  🚀 POST /api/route/generate/69451eefbc6be4119a8b2954/start 404 3.858 ms - {}
  ```

**问题**：API路径错误！
- 实际请求：`POST /api/route/generate/69451eefbc6be4119a8b2954/start` ❌
- 正确路径：`POST /api/route/69451eefbc6be4119a8b2954/start` ✅

**解决方案**：
- 前端代码已经修复，使用 `${API_ENDPOINTS.ROUTE.BASE}/${routeId}/start`
- 但可能前端还没有重新加载，或者浏览器缓存了旧代码

### 问题2：没有 FoodRecord 消耗记录

**原因**：
- `POST /api/route/:routeId/start` 接口没有被成功调用
- 所以没有创建 FoodRecord 消耗记录

**解决方案**：
- 修复API路径后，重新测试

### 问题3：User.totalStats 都是0

**原因**：
- `POST /api/route/:routeId/start` 接口没有被成功调用
- 所以没有更新 User.totalStats

**解决方案**：
- 修复API路径后，重新测试

## ✅ 数据流程

### 正常流程

1. **生成路线** → `POST /api/route/generate`
   - 创建 ExerciseRoute 记录（状态：`generated`）
   - 保存路线信息（距离、时长、消耗等）

2. **开始运动** → `POST /api/route/:routeId/start`
   - 更新 ExerciseRoute 状态：`generated` → `started`
   - 设置 `startedAt` 时间
   - 创建 FoodRecord 消耗记录（type='consume'）
   - 更新 User.totalStats（累计消耗、时长、距离）

3. **查询统计** → `GET /api/stats/*`
   - 查询 FoodRecord（type='consume'）
   - 查询 ExerciseRoute（status='started' 或 'completed'）
   - 合并两个数据源
   - 返回给前端

### 当前状态

- ✅ 路线已生成并保存（状态：`generated`）
- ❌ 开始运动接口调用失败（404错误）
- ❌ 没有创建 FoodRecord 消耗记录
- ❌ 没有更新 User.totalStats
- ❌ 统计API查询不到数据（因为状态是 `generated`，不是 `started`）

## 🔧 修复建议

1. **确认前端代码已更新**：检查 `mapvue/src/api/route.ts` 中的 `startExercise` 函数
2. **清除浏览器缓存**：强制刷新前端页面
3. **重新测试**：
   - 生成新路线
   - 点击"启动高德地图开始运动"按钮
   - 检查API调用是否成功（应该是200，不是404）
   - 检查数据库是否更新

## 📝 数据字段映射表

| 前端显示 | 数据来源 | 集合 | 字段 | 说明 |
|---------|---------|------|------|------|
| 今日运动消耗 | FoodRecord + ExerciseRoute | foodrecords, exerciseroutes | calories, estimatedCalories | 合并两个数据源 |
| 累计消耗 | FoodRecord + ExerciseRoute | foodrecords, exerciseroutes | calories, estimatedCalories | 历史累计 |
| 累计时长 | FoodRecord + ExerciseRoute | foodrecords, exerciseroutes | duration, duration | 分钟 |
| 累计距离 | FoodRecord + ExerciseRoute | foodrecords, exerciseroutes | distance, distance | 公里 |
| 打卡天数 | User | users | streakDays | 连续打卡天数 |

## 🎯 关键点

1. **只有 `started` 或 `completed` 状态的路线才会被计入统计**
2. **FoodRecord 和 ExerciseRoute 两个数据源都会合并计算**
3. **优先使用实际值（actualCalories, actualDistance, actualDuration），否则使用估算值**



