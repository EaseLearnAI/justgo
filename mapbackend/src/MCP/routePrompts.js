/**
 * 路线生成提示词模板
 *
 * LLM 只润色「已选定」的真实 POI + 路径指标，禁止未选点前编造终点/途经地名。
 */

const ROUTE_SYSTEM_PROMPT = `你是一个专业的运动路线文案助手。终点与路径已由系统根据真实地图数据选定，你的任务只是解释、激励与安全提示。

## 硬性规则（必须严格遵守）

1. **不得改终点**：不得更换、否定或另荐系统给出的 selected_destination。
2. **不得编造地名**：route_description 与 route_highlights 中出现的地名，必须 ⊆ 输入中的允许地名列表；禁止编造未给出的景点/道路名。
3. **绝对不能超过 burn_cap**；**绝对不能超过 max_duration_min**。
4. **优先使用系统给出的实际距离/时长**；热量可按体重粗估，并在 note 中说明为估算。
5. **不诱导过量运动**。

## 输出格式

请严格按照以下 JSON 格式返回（不要包含任何其他文字）：

{
  "success": true,
  "route": {
    "sport_type": "walk/run/bike",
    "distance_km": 数字(公里),
    "duration_min": 数字(分钟),
    "estimated_calories": 数字(kcal),
    "intensity_level": "low/moderate/high",
    "route_description": "基于已选真实终点的路线描述",
    "route_highlights": ["亮点1", "亮点2"],
    "safety_tips": ["安全提示1", "安全提示2"]
  },
  "motivation": "一句积极的运动鼓励语",
  "note": "关于热量估算的简短说明"
}

## 计算参考（基于 65kg 标准体重）

- 步行：约 5km/h，每分钟消耗约 5.5 kcal
- 跑步：约 8km/h，每分钟消耗约 10 kcal
- 骑行：约 15km/h，每分钟消耗约 8 kcal
`;

/**
 * 选点前不再调用；保留空 nearby 兼容旧测试时用约束估算。
 * @deprecated 主路径请用 generatePolishPrompt
 */
const generateUserPrompt = (context, nearbyPOIs = []) => {
  return generatePolishPrompt(context, {
    selectedPOI: nearbyPOIs[0] || null,
    routeMetrics: null,
    allowedPlaceNames: (nearbyPOIs || []).map((p) => p.name).filter(Boolean)
  });
};

/**
 * LLM 后置润色提示词
 */
const generatePolishPrompt = (context, selection = {}) => {
  const {
    userProfile,
    location,
    calorieContext,
    exerciseConstraints,
    preferences
  } = context;

  const { selectedPOI, routeMetrics, allowedPlaceNames = [] } = selection;

  const destName = selectedPOI?.name || '系统计算终点';
  const destType = selectedPOI?.type || '未标注类型';
  const destDistance = selectedPOI?.distance != null
    ? `${Math.round(selectedPOI.distance)} 米`
    : '未知';

  const distanceKm = routeMetrics?.distance_m != null
    ? (routeMetrics.distance_m / 1000).toFixed(2)
    : null;
  const durationMin = routeMetrics?.duration_s != null
    ? Math.round(routeMetrics.duration_s / 60)
    : null;

  const allowed = allowedPlaceNames.length
    ? allowedPlaceNames.map((n) => `- ${n}`).join('\n')
    : `- ${destName}`;

  const hour = new Date().getHours();
  let timeContext = '请注意当前时段的交通与安全。';
  if (hour >= 5 && hour < 9) timeContext = '现在是清晨，适合晨练。';
  else if (hour >= 9 && hour < 12) timeContext = '现在是上午。';
  else if (hour >= 12 && hour < 14) timeContext = '现在是中午，建议注意防晒与补水。';
  else if (hour >= 14 && hour < 17) timeContext = '现在是下午。';
  else if (hour >= 17 && hour < 20) timeContext = '现在是傍晚，适合户外运动。';
  else timeContext = '现在是晚间，请注意照明与安全。';

  return `请为已选定的真实路线撰写描述与激励，不要改终点。

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

## 热量与约束
- 今日已摄入: ${calorieContext.today_estimated_intake} kcal
- 历史欠账参考: ${calorieContext.historical_backlog} kcal
- 🔒 burn_cap: ${calorieContext.burn_cap} kcal
- 🔒 max_duration_min: ${exerciseConstraints.max_duration_min} 分钟
- 运动类型: ${exerciseConstraints.sport_type === 'walk' ? '步行' : exerciseConstraints.sport_type === 'run' ? '跑步' : '骑行'}
- 强度偏好: ${exerciseConstraints.intensity_preference}
- 路线风格: ${preferences.route_style.join(', ') || '无特殊要求'}
- 心情: ${preferences.mood || '一般'}

## 已选定终点（不可更改）
- 名称: ${destName}
- 类型: ${destType}
- 直线/检索距离: ${destDistance}
${distanceKm != null ? `- 规划路径距离: ${distanceKm} km` : ''}
${durationMin != null ? `- 规划路径时长: ${durationMin} 分钟` : ''}

## 允许出现在文案中的地名（不得超出）
${allowed}

请输出 JSON。distance_km / duration_min 请优先采用上方规划路径数值；若缺失再按约束估算且不超过上限。`;
};

/**
 * 构建完整的 LLM 输入上下文
 * @param {Object} user
 * @param {Object} location
 * @param {Object} todayStats
 * @param {Object} exerciseOptions
 * @param {Object} [executionMemory]
 */
const buildRouteContext = (user, location, todayStats, exerciseOptions, executionMemory = null) => {
  const { EXERCISE_PARAMS, INTENSITY_PARAMS, GOAL_STRATEGIES } = require('./mcpConfig');

  const bodyStats = user.bodyStats || {};
  const weight = bodyStats.weight || 65;
  const height = bodyStats.height || 170;
  const age = bodyStats.age || 25;
  const gender = bodyStats.gender || 'male';

  const goalOrientation = user.goalOrientation || 'maintain';
  const intensityPreference = user.exerciseIntensityPreference || 'moderate';

  const sportType = exerciseOptions.sportType || 'walk';
  const sportParams = EXERCISE_PARAMS[sportType] || EXERCISE_PARAMS.walk;
  const intensityParams = INTENSITY_PARAMS[intensityPreference] || INTENSITY_PARAMS.moderate;
  const goalStrategy = GOAL_STRATEGIES[goalOrientation] || GOAL_STRATEGIES.maintain;

  let bmr;
  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }

  const todayIntake = todayStats.intake || 0;
  const todayConsume = todayStats.consume || 0;
  const todayNet = todayIntake - todayConsume;
  const todayCalorieBalance = todayNet;

  const historicalBacklog = Math.max(0, todayNet);

  const isRecoveryDay = todayCalorieBalance < -300;

  const intensityIntentMultiplier = {
    relaxed: 0.6,
    moderate: 0.85,
    challenging: 1.05
  };
  const intentMultiplier = intensityIntentMultiplier[intensityPreference] || 0.85;

  const baseMaxDuration = 30;
  const rawTargetDuration = Math.round(baseMaxDuration * intentMultiplier);

  let targetDuration;
  const perceivedIntensity = intensityPreference;

  if (todayCalorieBalance < -200 && perceivedIntensity === 'relaxed') {
    targetDuration = Math.max(8, Math.min(12, rawTargetDuration));
  } else if (isRecoveryDay || perceivedIntensity === 'relaxed') {
    targetDuration = Math.max(8, Math.min(18, rawTargetDuration * 0.6));
  } else if (perceivedIntensity === 'moderate') {
    targetDuration = Math.max(12, Math.min(20, rawTargetDuration * 0.65));
  } else {
    targetDuration = Math.max(20, Math.min(26, rawTargetDuration * 0.85));
  }

  // ExecutionMemory：完成率低时缩短目标时长
  const distanceMultiplier = executionMemory?.distanceMultiplier ?? 1;
  if (executionMemory?.preferNear) {
    targetDuration = Math.max(5, Math.round(targetDuration * 0.75));
  } else if (distanceMultiplier !== 1) {
    targetDuration = Math.max(5, Math.round(targetDuration * distanceMultiplier));
  }

  const ABSOLUTE_MIN = { duration: 5, calories: 20 };
  const adjustedMaxDuration = Math.max(targetDuration, ABSOLUTE_MIN.duration);

  const caloriesPerMin = sportParams.caloriesPerMin * (weight / 65);
  const baseBurnCap = Math.round(adjustedMaxDuration * caloriesPerMin);
  const burnCap = Math.max(
    Math.round(baseBurnCap * goalStrategy.calorieMultiplier),
    ABSOLUTE_MIN.calories
  );

  const targetDistanceKm =
    (adjustedMaxDuration / 60) * sportParams.speed * distanceMultiplier;

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
    targetDistanceKm,
    executionMemorySummary: executionMemory
      ? {
          sampleSize: executionMemory.sampleSize,
          completionRate: executionMemory.completionRate,
          distanceMultiplier: executionMemory.distanceMultiplier
        }
      : null,
    _meta: {
      sportParams,
      intensityParams,
      goalStrategy,
      caloriesPerMin: Math.round(caloriesPerMin * 10) / 10
    }
  };
};

const INTENSITY_DESCRIPTIONS = {
  relaxed: '😌 轻松（还能继续聊天，不喘）',
  moderate: '🙂 微微累（出汗，但还能坚持）',
  challenging: '😤 明显累（挑战一下自己）'
};

const SPORT_TYPE_DESCRIPTIONS = {
  walk: '🚶 步行',
  run: '🏃 跑步',
  bike: '🚴 骑行'
};

module.exports = {
  ROUTE_SYSTEM_PROMPT,
  generateUserPrompt,
  generatePolishPrompt,
  buildRouteContext,
  INTENSITY_DESCRIPTIONS,
  SPORT_TYPE_DESCRIPTIONS
};
