/**
 * 路线生成提示词模板
 * 
 * 用于生成个性化运动路线的 LLM 系统提示词和用户提示词模板
 */

/**
 * 路线生成系统提示词
 * 严格控制 LLM 行为，确保安全性和合理性
 */
const ROUTE_SYSTEM_PROMPT = `你是一个专业的运动路线规划助手。你的任务是根据用户的身体数据、运动偏好和当前位置，生成安全、合理、个性化的运动路线建议。

## 重要安全规则（必须严格遵守）

1. **绝对不能超过 burn_cap**：生成的运动路线消耗热量必须严格不超过 burn_cap 参数
2. **绝对不能超过 max_duration_min**：运动时长必须严格不超过最大时长限制
3. **不诱导过量运动**：不得建议用户进行超出其能力范围的运动
4. **不承诺精准**：热量消耗是估算值，需在回复中说明

## 你的职责

1. 根据用户的运动类型（步行/跑步/骑行）计算合适的距离
2. 结合用户的路线偏好（沿水、绿化、安静等）给出路线建议
3. 考虑用户的强度偏好（轻松/微微累/明显累）调整建议
4. 提供积极但务实的运动建议

## 输出格式

请严格按照以下 JSON 格式返回结果（不要包含任何其他文字说明）：

{
  "success": true,
  "route": {
    "sport_type": "walk/run/bike",
    "distance_km": 数字(公里),
    "duration_min": 数字(分钟),
    "estimated_calories": 数字(kcal),
    "intensity_level": "low/moderate/high",
    "route_description": "路线描述，包含起点、途经点、终点的文字说明",
    "route_highlights": ["途经亮点1", "途经亮点2"],
    "safety_tips": ["安全提示1", "安全提示2"]
  },
  "motivation": "一句积极的运动鼓励语",
  "note": "关于热量估算的简短说明"
}

## 计算参考（基于 65kg 标准体重）

- 步行：约 5km/h，每分钟消耗约 5.5 kcal
- 跑步：约 8km/h，每分钟消耗约 10 kcal
- 骑行：约 15km/h，每分钟消耗约 8 kcal

实际消耗会根据用户体重调整。`;

/**
 * 生成用户提示词
 * @param {Object} context - 路线生成上下文
 * @param {Array} nearbyPOIs - 附近POI列表（可选）
 * @returns {string} - 用户提示词
 */
const generateUserPrompt = (context, nearbyPOIs = []) => {
  const {
    userProfile,
    location,
    calorieContext,
    exerciseConstraints,
    preferences
  } = context;

  // 构建附近地点信息
  let nearbyInfo = '';
  if (nearbyPOIs && nearbyPOIs.length > 0) {
    const poiList = nearbyPOIs.slice(0, 5).map(poi => 
      `- ${poi.name}（${poi.type || '未知类型'}，距离约${Math.round(poi.distance || 0)}米）`
    ).join('\n');
    nearbyInfo = `

## 附近地点
${poiList}

请结合这些附近地点生成具体的路线建议，可以推荐用户经过其中一些有特色的地方。`;
  }

  // 添加时间信息用于生成更丰富的建议
  const hour = new Date().getHours();
  let timeContext = '';
  if (hour >= 5 && hour < 9) {
    timeContext = '现在是清晨，适合晨练。';
  } else if (hour >= 9 && hour < 12) {
    timeContext = '现在是上午，天气正适合运动。';
  } else if (hour >= 12 && hour < 14) {
    timeContext = '现在是中午，建议避开高温时段。';
  } else if (hour >= 14 && hour < 17) {
    timeContext = '现在是下午，可以进行适度运动。';
  } else if (hour >= 17 && hour < 20) {
    timeContext = '现在是傍晚，非常适合户外运动。';
  } else {
    timeContext = '现在是晚间，请注意安全。';
  }

  return `请为我规划一条运动路线，以下是我的信息：

## 用户基础信息
- 年龄: ${userProfile.age} 岁
- 性别: ${userProfile.gender === 'male' ? '男' : '女'}
- 身高: ${userProfile.height_cm} cm
- 体重: ${userProfile.weight_kg} kg

## 当前位置
- 城市: ${location.city || '未知'}
- 坐标: ${location.lat}, ${location.lng}
${location.address ? `- 地址: ${location.address}` : ''}
${timeContext}

## 热量上下文
- 今日已摄入热量: ${calorieContext.today_estimated_intake} kcal
- 历史累积未消耗: ${calorieContext.historical_backlog} kcal
- 🔒 本次消耗上限（必须遵守）: ${calorieContext.burn_cap} kcal

## 运动约束
- 🔒 最大运动时长（必须遵守）: ${exerciseConstraints.max_duration_min} 分钟
- 运动类型: ${exerciseConstraints.sport_type === 'walk' ? '步行' : exerciseConstraints.sport_type === 'run' ? '跑步' : '骑行'}
- 强度偏好: ${exerciseConstraints.intensity_preference}

## 路线偏好
- 路线风格: ${preferences.route_style.join(', ') || '无特殊要求'}
- 心情: ${preferences.mood || '一般'}${nearbyInfo}

请根据以上信息，生成一条安全、合理的运动路线。记住：消耗热量不能超过 ${calorieContext.burn_cap} kcal，时长不能超过 ${exerciseConstraints.max_duration_min} 分钟。请提供具体的路线描述，包括建议的起点、途经点和终点。`;
};

/**
 * 构建完整的 LLM 输入上下文
 * @param {Object} user - 用户对象（从数据库获取）
 * @param {Object} location - 位置信息 { lat, lng, city }
 * @param {Object} todayStats - 今日统计 { intake, consume }
 * @param {Object} exerciseOptions - 运动选项 { sportType, routePreferences, mood }
 * @returns {Object} - 完整的上下文对象
 */
const buildRouteContext = (user, location, todayStats, exerciseOptions) => {
  const { EXERCISE_PARAMS, INTENSITY_PARAMS, GOAL_STRATEGIES } = require('./mcpConfig');
  
  // 获取用户身体数据
  const bodyStats = user.bodyStats || {};
  const weight = bodyStats.weight || 65;
  const height = bodyStats.height || 170;
  const age = bodyStats.age || 25;
  const gender = bodyStats.gender || 'male';
  
  // 获取用户偏好
  const goalOrientation = user.goalOrientation || 'maintain';
  const intensityPreference = user.exerciseIntensityPreference || 'moderate';
  
  // 获取运动参数
  const sportType = exerciseOptions.sportType || 'walk';
  const sportParams = EXERCISE_PARAMS[sportType] || EXERCISE_PARAMS.walk;
  const intensityParams = INTENSITY_PARAMS[intensityPreference] || INTENSITY_PARAMS.moderate;
  const goalStrategy = GOAL_STRATEGIES[goalOrientation] || GOAL_STRATEGIES.maintain;
  
  // 计算基础代谢率 (BMR) - Mifflin-St Jeor 公式
  let bmr;
  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }
  
  // 计算今日净摄入
  const todayIntake = todayStats.intake || 0;
  const todayConsume = todayStats.consume || 0;
  const todayNet = todayIntake - todayConsume;
  const todayCalorieBalance = todayNet;
  
  // 计算历史欠账（简化：使用今日净摄入作为参考）
  const historicalBacklog = Math.max(0, todayNet);
  
  // ========== 优化方案：四步决策系统 ==========
  
  // Step 1: 判断今天该不该保守（恢复日）
  const isRecoveryDay = todayCalorieBalance < -300;
  
  // Step 2: 根据用户主观强度给意图系数
  const intensityIntentMultiplier = {
    relaxed: 0.6,
    moderate: 0.85,
    challenging: 1.05
  };
  const intentMultiplier = intensityIntentMultiplier[intensityPreference] || 0.85;
  
  // Step 3: 计算基础目标
  const baseMaxDuration = 30; // 基础最大时长 30 分钟
  const rawTargetDuration = Math.round(baseMaxDuration * intentMultiplier);
  
  // 根据状态修正目标时长
  let targetDuration;
  const perceivedIntensity = intensityPreference; // relaxed, moderate, challenging
  
  if (todayCalorieBalance < -200 && perceivedIntensity === 'relaxed') {
    // 情凵 A：热量明显为负 & 用户只是想走走
    targetDuration = Math.max(8, Math.min(12, rawTargetDuration));
  } else if (isRecoveryDay || perceivedIntensity === 'relaxed') {
    // 恢复日或用户想轻松
    targetDuration = Math.max(8, Math.min(18, rawTargetDuration * 0.6));
  } else if (perceivedIntensity === 'moderate') {
    // 情凵 B：正常状态
    targetDuration = Math.max(12, Math.min(20, rawTargetDuration * 0.65));
  } else {
    // 情凵 C：状态好 & 用户愿意累一点
    targetDuration = Math.max(20, Math.min(26, rawTargetDuration * 0.85));
  }
  
  // Step 4: 最终兜底（下限值）
  const ABSOLUTE_MIN = {
    duration: 5,  // 最少5分钟
    calories: 20  // 最少20大卡
  };
  
  const adjustedMaxDuration = Math.max(targetDuration, ABSOLUTE_MIN.duration);
  
  // 根据体重调整每分钟消耗
  const caloriesPerMin = sportParams.caloriesPerMin * (weight / 65);
  
  // 计算消耗上限
  const baseBurnCap = Math.round(adjustedMaxDuration * caloriesPerMin);
  const burnCap = Math.max(
    Math.round(baseBurnCap * goalStrategy.calorieMultiplier),
    ABSOLUTE_MIN.calories
  );
  
  return {
    userProfile: {
      age,
      gender,
      height_cm: height,
      weight_kg: weight,
      bmr: Math.round(bmr)
    },
    location: {
      lat: location?.lat,
      lng: location?.lng,
      city: location?.city || '未知'
    },
    calorieContext: {
      today_estimated_intake: todayIntake,
      historical_backlog: historicalBacklog,
      burn_cap: burnCap
    },
    exerciseConstraints: {
      max_duration_min: adjustedMaxDuration,
      sport_type: sportType,
      intensity_preference: `${intensityParams.emoji} ${intensityParams.name}（${intensityParams.description}）`
    },
    preferences: {
      route_style: exerciseOptions.routePreferences || [],
      mood: exerciseOptions.mood || '一般'
    },
    // 额外信息（用于调试和日志）
    _meta: {
      sportParams,
      intensityParams,
      goalStrategy,
      caloriesPerMin: Math.round(caloriesPerMin * 10) / 10
    }
  };
};

/**
 * 强度偏好描述映射
 */
const INTENSITY_DESCRIPTIONS = {
  relaxed: '😌 轻松（还能继续聊天，不喘）',
  moderate: '🙂 微微累（出汗，但还能坚持）',
  challenging: '😤 明显累（挑战一下自己）'
};

/**
 * 运动类型描述映射
 */
const SPORT_TYPE_DESCRIPTIONS = {
  walk: '🚶 步行',
  run: '🏃 跑步',
  bike: '🚴 骑行'
};

module.exports = {
  ROUTE_SYSTEM_PROMPT,
  generateUserPrompt,
  buildRouteContext,
  INTENSITY_DESCRIPTIONS,
  SPORT_TYPE_DESCRIPTIONS
};
