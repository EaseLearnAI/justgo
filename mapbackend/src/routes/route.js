/**
 * 路线 HTTP 层 — 参数校验与响应映射；编排在 services/route
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  generateAndPersist,
  startRoute,
  completeRoute
} = require('../services/route/route.service');
const {
  getClientIP,
  isLocalIP,
  getLocationByIP,
  defaultLocation,
  LOCATION_LEVEL
} = require('../services/route/locationResolver');

/**
 * @route   POST /api/route/generate
 * @desc    生成个性化运动路径（IP 粗定位默认可出规划卡）
 * @access  Private
 */
router.post('/generate', protect, async (req, res, next) => {
  try {
    const { responseData, location } = await generateAndPersist(req);
    res.status(200).json({
      success: true,
      message: '个性化路径生成成功',
      data: responseData,
      location
    });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.statusCode === 404) {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
});

/**
 * @route   POST /api/route/:routeId/start
 * @desc    开始运动
 * @access  Private
 */
router.post('/:routeId/start', protect, async (req, res, next) => {
  try {
    const data = await startRoute(req.user._id, req.params.routeId);
    res.status(200).json({
      success: true,
      message: '运动已开始',
      data
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
});

/**
 * @route   POST /api/route/:routeId/complete
 * @desc    完成运动
 * @access  Private
 */
router.post('/:routeId/complete', protect, async (req, res, next) => {
  try {
    const data = await completeRoute(req.user._id, req.params.routeId, req.body);
    res.status(200).json({
      success: true,
      message: '运动已完成',
      data
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
});

/**
 * @route   GET /api/route/ip-location
 * @desc    通过 IP 获取粗位置（L1）
 * @access  Public
 */
router.get('/ip-location', async (req, res) => {
  try {
    const clientIP = getClientIP(req);

    // 与 resolveLocation / getLocationByIP 一致：本地 IP 优先 MOCK_*，否则 L0 兜底
    try {
      const location = await getLocationByIP(clientIP);
      const isMockOrDefault =
        location.source === 'mock' || location.source === 'default';
      return res.status(200).json({
        success: true,
        message: isMockOrDefault
          ? location.source === 'mock'
            ? '本地开发：使用 MOCK 城市'
            : '本地IP，使用默认位置'
          : 'IP定位成功',
        data: {
          lat: location.lat,
          lng: location.lng,
          city: location.city,
          province: location.province,
          address: location.address,
          adcode: location.adcode,
          level: location.level || LOCATION_LEVEL.L1,
          source: location.source || 'ip_location',
          clientIP
        }
      });
    } catch (ipError) {
      const fallback = defaultLocation(
        isLocalIP(clientIP) ? '本地IP，使用默认位置' : ipError.message
      );
      return res.status(200).json({
        success: true,
        message: isLocalIP(clientIP)
          ? '本地IP，使用默认位置'
          : 'IP定位失败，使用默认位置',
        data: {
          ...fallback,
          clientIP,
          error: ipError.message
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'IP定位服务错误',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/route/health
 * @desc    路由服务健康检查
 * @access  Public
 */
router.get('/health', async (req, res) => {
  res.status(200).json({
    success: true,
    message: '路由服务运行正常',
    data: {
      mcpConnected: false,
      decisionEngine: true,
      locationResolver: true,
      timestamp: new Date().toISOString()
    }
  });
});

module.exports = router;
