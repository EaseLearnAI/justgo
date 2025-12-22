/**
 * 视觉AI服务模块 - 基于大模型的图片分析
 * 使用 ModelScope 的 Qwen3-VL-30B-A3B-Thinking 视觉模型
 */

const { uploadFile, uploadBuffer } = require('./ossService');
const path = require('path');

// ModelScope Vision API 配置
const VISION_CONFIG = {
  baseUrl: 'https://api-inference.modelscope.cn/v1',
  apiKey: 'ms-4cb486c3-62bc-472c-bc30-fd6931a9eaf9',
  model: 'Qwen/Qwen3-VL-30B-A3B-Thinking'
};

/**
 * 调用视觉大模型 API
 * @param {Array} messages - 消息数组
 * @param {boolean} useStream - 是否使用流式（默认 false）
 * @returns {Promise<{reasoning: string, answer: string}>} - 模型响应
 */
const callVisionLLM = async (messages, useStream = false) => {
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
        messages: messages,
        stream: useStream,
        max_tokens: 4000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vision API 调用失败: ${response.status} - ${errorText}`);
    }

    let reasoning = '';
    let answer = '';

    if (useStream) {
      // 处理流式响应
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let doneReasoning = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;
              
              if (delta) {
                if (delta.reasoning_content && delta.reasoning_content !== '') {
                  reasoning += delta.reasoning_content;
                }
                if (delta.content && delta.content !== '') {
                  if (!doneReasoning && reasoning !== '') {
                    doneReasoning = true;
                  }
                  answer += delta.content;
                }
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } else {
      // 处理非流式响应
      const data = await response.json();
      
      const choice = data.choices?.[0];
      if (choice) {
        reasoning = choice.message?.reasoning_content || '';
        answer = choice.message?.content || '';
      }
    }

    const endTime = Date.now();

    return { reasoning, answer };
  } catch (error) {
    throw error;
  }
};

/**
 * 分析图片中的食物热量
 * @param {string} imageUrl - 图片 URL
 * @param {string} userId - 用户 ID (用于绑定记录)
 * @returns {Promise<Object>} - 分析结果
 */
const analyzeImageCalories = async (imageUrl, userId) => {
  const systemPrompt = `你是一个专业的营养师和食物识别专家。请分析图片中的食物，识别每种食物并估算其热量。

重要：由于食物大小、制作方式、配料等因素，热量不可能是精确值。你需要提供三个值：
- calorie_min: 热量下限（最保守估计）
- calorie_estimated: 估算值（最可能的值）
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
  "scientificNote": "简短说明热量范围的原因，如份量大小、配料差异等",
  "imageDescription": "对图片内容的简短描述"
}

注意：
1. 仔细观察图片中的食物种类和份量
2. 热量估算基于标准食物热量数据
3. 如果图片中没有食物，返回 success: false 和相应错误信息
4. 所有热量数字必须是数字类型，不要加单位`;

  const messages = [
    {
      role: 'user',
      content: [
        { type: 'text', text: systemPrompt },
        { type: 'image_url', image_url: { url: imageUrl } }
      ]
    }
  ];

  try {
    const { reasoning, answer } = await callVisionLLM(messages);

    // 尝试提取 JSON
    let jsonStr = answer;
    
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

    // 添加用户 ID 绑定
    result.userId = userId;
    result.imageUrl = imageUrl;
    result.analyzedAt = new Date().toISOString();

    // 添加推理过程（可选，用于调试）
    if (reasoning) {
      result.reasoning = reasoning.substring(0, 500) + (reasoning.length > 500 ? '...' : '');
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: '无法分析图片中的食物热量: ' + error.message,
      userId: userId,
      imageUrl: imageUrl
    };
  }
};

/**
 * 上传图片并分析食物热量
 * @param {string} localPath - 本地图片路径
 * @param {string} userId - 用户 ID
 * @returns {Promise<Object>} - 包含图片 URL 和分析结果
 */
const uploadAndAnalyzeImage = async (localPath, userId) => {
  try {
    // Step 1: 上传图片到 OSS
    
    const uploadResult = await uploadFile(localPath, `food-images/${userId}`);
    
    if (!uploadResult.success) {
      throw new Error('图片上传失败: ' + uploadResult.error);
    }

    // Step 2: 调用视觉模型分析
    
    const analysisResult = await analyzeImageCalories(uploadResult.url, userId);

    // 合并结果
    const finalResult = {
      ...analysisResult,
      ossInfo: {
        url: uploadResult.url,
        objectName: uploadResult.objectName
      }
    };

    return finalResult;
  } catch (error) {
    return {
      success: false,
      error: error.message,
      userId: userId
    };
  }
};

/**
 * 上传 Buffer 图片并分析
 * @param {Buffer} buffer - 图片 Buffer
 * @param {string} fileName - 文件名
 * @param {string} userId - 用户 ID
 * @returns {Promise<Object>} - 包含图片 URL 和分析结果
 */
const uploadBufferAndAnalyze = async (buffer, fileName, userId) => {
  try {
    // Step 1: 上传 Buffer 到 OSS
    
    const uploadResult = await uploadBuffer(buffer, fileName, `food-images/${userId}`);
    
    if (!uploadResult.success) {
      throw new Error('图片上传失败: ' + uploadResult.error);
    }

    // Step 2: 调用视觉模型分析
    
    const analysisResult = await analyzeImageCalories(uploadResult.url, userId);

    // 合并结果
    const finalResult = {
      ...analysisResult,
      ossInfo: {
        url: uploadResult.url,
        objectName: uploadResult.objectName
      }
    };

    return finalResult;
  } catch (error) {
    
    return {
      success: false,
      error: error.message,
      userId: userId
    };
  }
};

module.exports = {
  callVisionLLM,
  analyzeImageCalories,
  uploadAndAnalyzeImage,
  uploadBufferAndAnalyze,
  VISION_CONFIG
};
