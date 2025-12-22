const fs = require('fs');
const path = require('path');
const EventSource = require('eventsource');

/**
 * 路由服务类，负责处理个性化路径生成
 */
class RouteService {
  constructor() {
    // 读取MCP配置
    const mcpConfigPath = path.join(__dirname, '..', 'MCP', 'mcp-config.json');
    this.mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
    
    // 初始化MCP客户端
    this.mcpClient = null;
    this.initializeMCP();
  }

  /**
   * 初始化MCP客户端
   */
  async initializeMCP() {
    try {
      // MCP client initialization
    } catch (error) {
      throw error;
    }
  }

  /**
   * 生成个性化运动路径
   * @param {Object} userData 用户数据
   * @returns {Object} 路径信息
   */
  async generatePersonalizedRoute(userData) {
    try {
      // 1. 调用LLM获取路径建议
      const llmResponse = await this.getLLMRouteSuggestion(userData);

      // 2. 使用高德地图MCP获取实际路线
      const mcpResponse = await this.getMCPRoute(userData, llmResponse);

      // 3. 后处理：统一单位并覆盖LLM估算值
      const finalRoute = this.postProcessRouteData(llmResponse, mcpResponse);

      return finalRoute;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 调用LLM获取路径建议
   * @param {Object} userData 用户数据
   * @returns {Object} LLM响应
   */
  async getLLMRouteSuggestion(userData) {
    try {
      // 读取LLM提示词
      const promptPath = path.join(__dirname, '..', 'MCP', 'llm-prompt.txt');
      const systemPrompt = fs.readFileSync(promptPath, 'utf8');
      
      // 构建LLM请求
      const llmRequest = {
        model: 'Qwen/Qwen3-Next-80B-A3B-Instruct',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: JSON.stringify(userData)
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      };

      // 调用LLM（这里模拟调用，实际应使用相应的LLM API）
      // 在实际实现中，这里应该是真实的LLM API调用
      const mockLLMResponse = {
        thinkingProcess: "Based on the user's preference for a relaxed post-exercise state and their physical profile, I'm recommending a gentle walking route. The user has indicated they want a riverside path with greenery, which I'll incorporate into the suggestion.",
        routeSuggestion: {
          distance_km: 3.5,
          duration_min: 28,
          sportType: "walking",
          intensity: "low",
          description: "A gentle riverside walk with scenic views and green spaces"
        },
        routeDetails: {
          direction: "northeast",
          landmarks: ["river", "park", "bridge"],
          terrain: "flat",
          difficulty: "easy"
        },
        motivationalMessage: "Great choice! This route offers beautiful scenery while keeping within your comfort zone. Perfect for a relaxing walk.",
        safetyTips: [
          "Stay hydrated",
          "Wear comfortable walking shoes",
          "Be aware of cyclists on shared paths"
        ]
      };
      
      return mockLLMResponse;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 调用高德地图MCP获取实际路线
   * @param {Object} userData 用户数据
   * @param {Object} llmResponse LLM响应
   * @returns {Object} MCP响应
   */
  async getMCPRoute(userData, llmResponse) {
    try {
      // 构建MCP请求
      const mcpRequest = {
        method: 'amap.direction.walking',
        params: {
          origin: `${userData.location.lng},${userData.location.lat}`,
          // 使用简单的终点，实际应用中可以根据需要调整
          destination: `${userData.location.lng + 0.01},${userData.location.lat + 0.01}`,
          alternatives: 1
        }
      };

      // 使用SSE连接到MCP服务
      const mcpUrl = this.mcpConfig.mcpServers['amap-maps'].url;
      
      // 这里应该实现真实的MCP调用逻辑
      // 由于MCP的具体实现细节可能比较复杂，我们暂时返回模拟数据
      // 在实际应用中，这里需要根据MCP的具体API进行实现
      
      const mockMCPResponse = {
        data: {
          route: {
            paths: [
              {
                distance: 3500, // 3.5公里
                duration: 1680 // 28分钟
              }
            ]
          }
        }
      };
      
      return mockMCPResponse;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 后处理路线数据，统一单位并覆盖LLM估算值
   * @param {Object} llmResponse LLM响应
   * @param {Object} mcpResponse MCP响应
   * @returns {Object} 处理后的路线数据
   */
  postProcessRouteData(llmResponse, mcpResponse) {
    // 从MCP响应中提取实际距离和时间
    let actualDistanceKm = null;
    let actualDurationMin = null;
    
    if (mcpResponse && mcpResponse.data && mcpResponse.data.route) {
      const route = mcpResponse.data.route.paths[0];
      if (route) {
        // 将距离从米转换为公里
        actualDistanceKm = parseFloat((route.distance / 1000).toFixed(2));
        // 将时间从秒转换为分钟
        actualDurationMin = Math.round(route.duration / 60);
      }
    }
    
    // 构建最终路线对象
    const finalRoute = {
      ...llmResponse,
      navigation: {
        distance_km: actualDistanceKm || llmResponse.routeSuggestion.distance_km,
        duration_min: actualDurationMin || llmResponse.routeSuggestion.duration_min,
        routeDetails: {
          ...llmResponse.routeDetails,
          distance: mcpResponse?.data?.route?.paths[0]?.distance || null,
          duration: mcpResponse?.data?.route?.paths[0]?.duration || null
        }
      }
    };
    
    // 如果有实际数据，用高德的数据覆盖LLM估算
    if (actualDistanceKm !== null && actualDurationMin !== null) {
      finalRoute.routeSuggestion.distance_km = actualDistanceKm;
      finalRoute.routeSuggestion.duration_min = actualDurationMin;
    }
    
    return finalRoute;
  }

  /**
   * 根据用户ID生成个性化路径
   * @param {string} userId 用户ID
   * @param {Object} preferences 用户偏好
   * @param {Object} userProfile 真实用户数据
   * @param {Object} location 位置信息（可选，如果提供则优先使用）
   * @returns {Object} 个性化路径
   */
  async generateRouteForUser(userId, preferences, userProfile, location = null) {
    // 确定使用的位置信息（优先级：传入的location > 用户数据库中的location）
    let finalLocation;
    if (location) {
      finalLocation = location;
    } else if (userProfile?.location?.lat && userProfile?.location?.lng) {
      finalLocation = {
        lat: parseFloat(userProfile.location.lat),
        lng: parseFloat(userProfile.location.lng),
        city: userProfile.location.city || '未知'
      };
    } else {
      // 最后的默认值（不应该到达这里，因为路由层已经处理了位置获取）
      finalLocation = {
        lat: 39.908823,
        lng: 116.397470,
        city: '北京',
        warning: '使用默认位置，可能不准确'
      };
    }
    
    // 使用真实的用户数据
    const userData = {
      userId: userId,
      location: finalLocation,
      profile: {
        age: userProfile.bodyStats?.age || 28,
        gender: userProfile.bodyStats?.gender || "male",
        height_cm: userProfile.bodyStats?.height || 175,
        weight_kg: userProfile.bodyStats?.weight || 70
      },
      calorie_context: {
        today_estimated_intake: 220, // 这个值需要从实际数据中获取
        historical_backlog: 1800, // 这个值需要从实际数据中获取
        recommended_burn_cap: 250 // 这个值需要从实际数据中获取
      },
      exercise_constraints: {
        max_duration_min: 30, // 这个值需要从实际数据中获取
        sport_type: "walking" // 这个值需要从实际数据中获取
      },
      preferences: {
        route_style: preferences.routeStyle || ["沿水路线", "绿化多", "安静"],
        mood: preferences.mood || "放松",
        preferredPostExerciseState: preferences.preferredPostExerciseState || "relaxed"
      }
    };
    
    return await this.generatePersonalizedRoute(userData);
  }
}

module.exports = RouteService;