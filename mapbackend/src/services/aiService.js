/**
 * AI 服务模块 - 封装大模型 API 调用
 * 使用 ModelScope 的 Qwen3-Next-80B-A3B-Instruct 模型
 */

// ModelScope API 配置
const AI_CONFIG = {
  baseUrl: 'https://api-inference.modelscope.cn/v1',
  apiKey: 'ms-4cb486c3-62bc-472c-bc30-fd6931a9eaf9',
  model: 'Qwen/Qwen3-Next-80B-A3B-Instruct'
};

/**
 * 调用大模型 API
 * @param {Array} messages - 消息数组
 * @param {boolean} stream - 是否使用流式输出
 * @returns {Promise<string>} - 模型响应
 */
const callLLM = async (messages, stream = false) => {
  try {
    const response = await fetch(`${AI_CONFIG.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_CONFIG.apiKey}`
      },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        messages: messages,
        stream: stream,
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API 调用失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    return content;
  } catch (error) {
    throw error;
  }
};

/**
 * 分析食物热量
 * @param {string} text - 用户输入的食物描述
 * @returns {Promise<Object>} - 分析结果
 */
const analyzeCalories = async (text) => {
  const systemPrompt = `你是一个专业的营养师和热量分析专家。用户会告诉你他们吃了什么食物，你需要分析并返回每种食物的热量信息。

重要：由于食物大小、制作方式、配料等因素，热量不可能是精确值。你需要提供三个值：
- calorie_min: 热量下限（最保守估计）
- calorie_estimated: 估算值（最可能的值，用于计算）
- calorie_max: 热量上限（最宽松估计）

请严格按照以下 JSON 格式返回结果（不要包含任何其他文字说明）：
{
  "success": true,
  "foods": [
    {
      "name": "食物名称",
      "quantity": "数量描述",
      "calorie_min": 数字,
      "calorie_estimated": 数字,
      "calorie_max": 数字,
      "unit": "个/份/克等"
    }
  ],
  "totalCalories": {
    "min": 总热量下限,
    "estimated": 总热量估算值,
    "max": 总热量上限
  },
  "summary": "简短的营养建议",
  "scientificNote": "简短说明热量范围的原因，如食材大小、配料差异等"
}

注意事项：
1. 热量值请基于常见食物的标准热量来估算
2. 如果数量不明确，默认按1份计算
3. 请确保返回的是合法的 JSON 格式
4. 所有热量数字必须是数字类型，不要加单位
5. calorie_min 和 calorie_max 的差距一般在 15%-30% 左右`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: text }
  ];

  try {
    const response = await callLLM(messages);

    // 尝试提取 JSON
    let jsonStr = response;
    
    // 移除可能的 markdown 代码块标记
    if (jsonStr.includes('```json')) {
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonStr.includes('```')) {
      jsonStr = jsonStr.replace(/```\n?/g, '');
    }
    
    // 尝试找到 JSON 对象
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    // 解析 JSON
    const result = JSON.parse(jsonStr.trim());

    // 确保返回结果符合新格式
    if (result.foods) {
      result.foods = result.foods.map(food => ({
        name: food.name,
        quantity: food.quantity || '1份',
        calorie_min: food.calorie_min || Math.floor(food.calories * 0.85) || 0,
        calorie_estimated: food.calorie_estimated || food.calories || 0,
        calorie_max: food.calorie_max || Math.ceil(food.calories * 1.15) || 0,
        unit: food.unit || '份'
      }));
    }

    // 确保 totalCalories 符合新格式
    if (typeof result.totalCalories === 'number') {
      const total = result.totalCalories;
      result.totalCalories = {
        min: Math.floor(total * 0.85),
        estimated: total,
        max: Math.ceil(total * 1.15)
      };
    }

    return result;
  } catch (error) {
    // 返回错误结果
    return {
      success: false,
      error: '无法分析食物热量: ' + error.message
    };
  }
};

/**
 * 分析运动消耗
 * @param {string} text - 用户输入的运动描述
 * @returns {Promise<Object>} - 分析结果
 */
const analyzeExercise = async (text) => {
  const systemPrompt = `你是一个专业的健身教练和运动消耗分析专家。用户会告诉你他们做了什么运动，你需要分析并返回运动消耗的热量信息。

请严格按照以下 JSON 格式返回结果（不要包含任何其他文字说明）：
{
  "success": true,
  "exercises": [
    {
      "name": "运动名称",
      "duration": 时长(分钟),
      "distance": 距离(公里,如适用则填写,否则为0),
      "calories": 消耗热量(kcal),
      "exerciseType": "walk/run/bike/other"
    }
  ],
  "totalCalories": 总消耗热量数字,
  "totalDuration": 总时长(分钟),
  "summary": "简短的运动建议"
}

注意事项：
1. 热量消耗请基于标准体重(65kg)来估算
2. 如果时长不明确，请合理估计
3. 请确保返回的是合法的 JSON 格式
4. 所有数字字段必须是数字类型`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: text }
  ];

  try {
    const response = await callLLM(messages);
    
    // 尝试提取 JSON
    let jsonStr = response;
    
    if (jsonStr.includes('```json')) {
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonStr.includes('```')) {
      jsonStr = jsonStr.replace(/```\n?/g, '');
    }
    
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const result = JSON.parse(jsonStr.trim());

    return result;
  } catch (error) {
    
    return {
      success: false,
      error: '无法分析运动消耗: ' + error.message
    };
  }
};

module.exports = {
  callLLM,
  analyzeCalories,
  analyzeExercise,
  AI_CONFIG
};
