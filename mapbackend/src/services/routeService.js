/**
 * @deprecated 遗留 mock MCP 路径，主推荐已改用 `MCP/routeService.js` + MapToolGateway（REST）。
 * 真 MCP（SSE / npx）适配为方案第二步；请勿将本文件的 mock 返回当作「MCP 已连通」。
 * 新代码请勿 import 本模块。
 */

const fs = require('fs');
const path = require('path');
const EventSource = require('eventsource');

/**
 * 路由服务类，负责处理个性化路径生成
 * @deprecated
 */
class RouteService {
  constructor() {
    console.warn(
      '[DEPRECATED] services/routeService 为 mock MCP，主路径请用 MCP/routeService + MapToolGateway'
    );
    const mcpConfigPath = path.join(__dirname, '..', 'MCP', 'mcp-config.json');
    this.mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
    this.mcpClient = null;
    this.deprecated = true;
    this.initializeMCP();
  }

  async initializeMCP() {
    try {
      // intentionally empty — mock path
    } catch (error) {
      throw error;
    }
  }

  async generatePersonalizedRoute(userData) {
    try {
      const llmResponse = await this.getLLMRouteSuggestion(userData);
      const mcpResponse = await this.getMCPRoute(userData, llmResponse);
      const finalRoute = this.postProcessRouteData(llmResponse, mcpResponse);
      finalRoute._deprecated = true;
      finalRoute._mcpMock = true;
      return finalRoute;
    } catch (error) {
      throw error;
    }
  }

  async getLLMRouteSuggestion(userData) {
    try {
      const promptPath = path.join(__dirname, '..', 'MCP', 'llm-prompt.txt');
      const systemPrompt = fs.readFileSync(promptPath, 'utf8');

      const llmRequest = {
        model: 'Qwen/Qwen3-Next-80B-A3B-Instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify(userData) }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      };
      void llmRequest;

      const mockLLMResponse = {
        thinkingProcess:
          "Based on the user's preference for a relaxed post-exercise state and their physical profile, I'm recommending a gentle walking route. The user has indicated they want a riverside path with greenery, which I'll incorporate into the suggestion.",
        routeSuggestion: {
          distance_km: 3.5,
          duration_min: 28,
          sportType: 'walking',
          intensity: 'low',
          description: 'A gentle riverside walk with scenic views and green spaces'
        },
        routeDetails: {
          direction: 'northeast',
          landmarks: ['river', 'park', 'bridge'],
          terrain: 'flat',
          difficulty: 'easy'
        },
        motivationalMessage:
          'Great choice! This route offers beautiful scenery while keeping within your comfort zone. Perfect for a relaxing walk.',
        safetyTips: [
          'Stay hydrated',
          'Wear comfortable walking shoes',
          'Be aware of cyclists on shared paths'
        ]
      };

      return mockLLMResponse;
    } catch (error) {
      throw error;
    }
  }

  /**
   * @deprecated 返回 mock，未实现真实 MCP
   */
  async getMCPRoute(userData, llmResponse) {
    try {
      void llmResponse;
      const mcpRequest = {
        method: 'amap.direction.walking',
        params: {
          origin: `${userData.location.lng},${userData.location.lat}`,
          destination: `${userData.location.lng + 0.01},${userData.location.lat + 0.01}`,
          alternatives: 1
        }
      };
      void mcpRequest;
      void this.mcpConfig;

      return {
        data: {
          route: {
            paths: [
              {
                distance: 3500,
                duration: 1680
              }
            ]
          }
        },
        _mcpMock: true
      };
    } catch (error) {
      throw error;
    }
  }

  postProcessRouteData(llmResponse, mcpResponse) {
    let actualDistanceKm = null;
    let actualDurationMin = null;

    if (mcpResponse && mcpResponse.data && mcpResponse.data.route) {
      const route = mcpResponse.data.route.paths[0];
      if (route) {
        actualDistanceKm = parseFloat((route.distance / 1000).toFixed(2));
        actualDurationMin = Math.round(route.duration / 60);
      }
    }

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

    if (actualDistanceKm !== null && actualDurationMin !== null) {
      finalRoute.routeSuggestion.distance_km = actualDistanceKm;
      finalRoute.routeSuggestion.duration_min = actualDurationMin;
    }

    return finalRoute;
  }

  async generateRouteForUser(userId, preferences, userProfile, location = null) {
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
      finalLocation = {
        lat: 39.908823,
        lng: 116.397470,
        city: '北京',
        warning: '使用默认位置，可能不准确'
      };
    }

    const userData = {
      userId: userId,
      location: finalLocation,
      profile: {
        age: userProfile.bodyStats?.age || 28,
        gender: userProfile.bodyStats?.gender || 'male',
        height_cm: userProfile.bodyStats?.height || 175,
        weight_kg: userProfile.bodyStats?.weight || 70
      },
      calorie_context: {
        today_estimated_intake: 220,
        historical_backlog: 1800,
        recommended_burn_cap: 250
      },
      exercise_constraints: {
        max_duration_min: 30,
        sport_type: 'walking'
      },
      preferences: {
        route_style: preferences.routeStyle || ['沿水路线', '绿化多', '安静'],
        mood: preferences.mood || '放松',
        preferredPostExerciseState: preferences.preferredPostExerciseState || 'relaxed'
      }
    };

    return await this.generatePersonalizedRoute(userData);
  }
}

module.exports = RouteService;
