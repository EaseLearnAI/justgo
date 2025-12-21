/**
 * AI 视觉分析服务模块
 * 使用 Qwen3-VL-30B-A3B-Thinking 模型进行图片热量分析
 * 基于科学的热量区间估计系统
 */

// 视觉模型配置
const VISION_CONFIG = {
  baseUrl: 'https://api-inference.modelscope.cn/v1',
  apiKey: 'ms-4cb486c3-62bc-472c-bc30-fd6931a9eaf9',
  model: 'Qwen/Qwen3-VL-30B-A3B-Thinking'
};

/**
 * 调用视觉大模型 API
 * @param {string} imageUrl - 图片 URL
 * @param {string} prompt - 文本提示
 * @returns {Promise<string>} - 模型响应
 */
const callVisionLLM = async (imageUrl, prompt) => {
  console.log('===================================');
  console.log('👁️ 视觉AI服务 - 开始调用视觉模型');
  console.log('===================================');
  console.log('📤 请求模型:', VISION_CONFIG.model);
  console.log('🖼️ 图片URL:', imageUrl);
  console.log('📝 提示词:', prompt.substring(0, 100) + '...');

  try {
    const startTime = Date.now();
    
    const response = await fetch(`${VISION_CONFIG.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VISION_CONFIG.apiKey}`
      },
      body: JSON.stringify({
        model: VISION_CONFIG.model,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        }],
        stream: false,
        temperature: 0.7,
        max_tokens: 3000
      })
    });

    const endTime = Date.now();
    console.log('-----------------------------------');
    console.log('📥 收到响应状态:', response.status);
    console.log('⏱️ 响应耗时:', endTime - startTime, 'ms');

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API 错误:', errorText);
      throw new Error(`视觉API调用失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    let content = data.choices[0]?.message?.content || '';
    
    // 处理可能的 reasoning_content（思考过程）
    const reasoningContent = data.choices[0]?.message?.reasoning_content || '';
    if (reasoningContent) {
      console.log('🧠 模型思考过程:', reasoningContent.substring(0, 200) + '...');
    }

    console.log('✅ 视觉模型响应成功');
    console.log('📥 响应内容:', content.substring(0, 300) + (content.length > 300 ? '...' : ''));
    console.log('===================================');
    console.log('🏁 视觉AI服务 - 调用完成');
    console.log('===================================');

    return content;
  } catch (error) {
    console.error('❌ 视觉模型调用异常:', error.message);
    throw error;
  }
};

/**
 * 分析图片中的食物热量
 * 返回科学的热量区间 (min, estimated, max)
 * @param {string} imageUrl - 食物图片 URL
 * @returns {Promise<Object>} - 分析结果
 */
const analyzeImageCalories = async (imageUrl) => {
  console.log('===================================');
  console.log('🍽️ 开始图片食物热量分析');
  console.log('===================================');
  console.log('🖼️ 图片URL:', imageUrl);

  const systemPrompt = `你是一个专业的营养师和热量分析专家。请分析图片中的食物，并提供科学的热量估计。

【重要科学原则】
1. 热量不是精确值，而是一个合理的区间
2. 考虑食物的大小、制作方式、配料等不确定性
3. 提供保守估计(min)、最佳估计(estimated)、最高估计(max)

请严格按照以下 JSON 格式返回结果（不要包含任何其他文字说明）：
{
  "success": true,
  "foods": [
    {
      "name": "食物名称",
      "quantity": "数量描述（如：1份、1个、约200g）",
      "calorieRange": {
        "min": 最低热量估计(数字),
        "estimated": 最佳热量估计(数字),
        "max": 最高热量估计(数字)
      },
      "unit": "个/份/克等",
      "confidence": "high/medium/low"
    }
  ],
  "totalCalorieRange": {
    "min": 总最低热量,
    "estimated": 总最佳估计热量,
    "max": 总最高热量
  },
  "summary": "简短的营养分析和建议（说明热量区间的原因）",
  "scientificNote": "关于估计不确定性的说明"
}

注意事项：
1. min 通常是 estimated 的 80-90%
2. max 通常是 estimated 的 110-130%
3. 如果识别不确定，增大区间范围
4. confidence 表示识别置信度
5. 所有热量值必须是数字类型`;

  try {
    const response = await callVisionLLM(imageUrl, systemPrompt);
    
    console.log('-----------------------------------');
    console.log('🔍 解析视觉 AI 响应...');

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
    
    // 确保有 analysisSource 标记
    result.analysisSource = 'image';
    result.imageUrl = imageUrl;

    console.log('✅ 图片热量分析完成');
    console.log('📊 分析结果:');
    console.log('   - 识别食物数:', result.foods?.length || 0);
    console.log('   - 热量区间:', JSON.stringify(result.totalCalorieRange));
    console.log('   - 科学说明:', result.scientificNote?.substring(0, 50) + '...');
    console.log('===================================');
    console.log('🏁 图片热量分析流程结束');
    console.log('===================================');

    return result;
  } catch (error) {
    console.error('❌ 图片热量分析异常:', error.message);
    
    return {
      success: false,
      error: '无法分析图片中的食物热量: ' + error.message,
      analysisSource: 'image',
      imageUrl: imageUrl
    };
  }
};

/**
 * 简单的图片描述分析（用于测试）
 * @param {string} imageUrl - 图片 URL
 * @returns {Promise<Object>} - 描述结果
 */
const describeImage = async (imageUrl) => {
  console.log('===================================');
  console.log('🔍 开始图片描述分析');
  console.log('===================================');

  try {
    const response = await callVisionLLM(imageUrl, '请详细描述这张图片中的内容，特别关注是否有食物，如果有请描述食物的种类和大致分量。');
    
    return {
      success: true,
      description: response,
      imageUrl: imageUrl
    };
  } catch (error) {
    console.error('❌ 图片描述失败:', error.message);
    return {
      success: false,
      error: error.message,
      imageUrl: imageUrl
    };
  }
};

module.exports = {
  callVisionLLM,
  analyzeImageCalories,
  describeImage,
  VISION_CONFIG
};
