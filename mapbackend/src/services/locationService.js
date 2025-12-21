/**
 * 位置获取服务
 * 
 * 支持多种方式获取用户位置：
 * 1. 从请求中获取（前端通过浏览器定位API获取）
 * 2. 从用户数据库中获取
 * 3. 使用高德地图 IP 定位 API
 */

const { AMAP_WEB_API } = require('../MCP/mcpConfig');

/**
 * 从请求中提取客户端 IP 地址
 * @param {Object} req - Express 请求对象
 * @returns {string} - IP 地址
 */
const getClientIP = (req) => {
  // 优先从 X-Forwarded-For 获取（代理服务器）
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  // 从 X-Real-IP 获取
  const realIP = req.headers['x-real-ip'];
  if (realIP) {
    return realIP;
  }
  
  // 从连接中获取
  const ip = req.connection?.remoteAddress || req.socket?.remoteAddress || '127.0.0.1';
  
  // 处理 IPv6 本地回环地址
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    return '127.0.0.1';
  }
  
  return ip;
};

/**
 * 检查是否为本地 IP 地址
 * @param {string} ip - IP 地址
 * @returns {boolean} - 是否为本地 IP
 */
const isLocalIP = (ip) => {
  if (!ip) return true;
  
  // IPv4 本地地址
  if (ip === '127.0.0.1' || ip === 'localhost') {
    return true;
  }
  
  // IPv6 本地地址
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    return true;
  }
  
  // 内网地址范围
  if (ip.startsWith('192.168.') || 
      ip.startsWith('10.') || 
      ip.startsWith('172.16.') || 
      ip.startsWith('172.17.') || 
      ip.startsWith('172.18.') || 
      ip.startsWith('172.19.') || 
      ip.startsWith('172.20.') || 
      ip.startsWith('172.21.') || 
      ip.startsWith('172.22.') || 
      ip.startsWith('172.23.') || 
      ip.startsWith('172.24.') || 
      ip.startsWith('172.25.') || 
      ip.startsWith('172.26.') || 
      ip.startsWith('172.27.') || 
      ip.startsWith('172.28.') || 
      ip.startsWith('172.29.') || 
      ip.startsWith('172.30.') || 
      ip.startsWith('172.31.')) {
    return true;
  }
  
  return false;
};

/**
 * 调用高德地图 IP 定位 API
 * @param {string} ip - IP 地址
 * @returns {Promise<Object>} - 位置信息 { lat, lng, city, province, adcode }
 */
const getLocationByIP = async (ip) => {
  console.log('\n===================================');
  console.log('📍 使用高德地图 IP 定位');
  console.log('===================================');
  console.log('🌐 IP 地址:', ip);
  
  // 检查是否为本地 IP
  if (isLocalIP(ip)) {
    console.log('⚠️ 检测到本地 IP 地址，无法使用 IP 定位');
    console.log('💡 提示：本地开发时，请通过以下方式提供位置信息：');
    console.log('   1. 前端通过浏览器定位 API 获取位置并传递');
    console.log('   2. 在请求体中包含 location 参数');
    console.log('   3. 在查询参数中包含 lat/lng 参数');
    throw new Error('本地 IP 地址无法定位，请通过请求传递位置信息');
  }
  
  try {
    const url = new URL(AMAP_WEB_API.baseUrl + AMAP_WEB_API.endpoints.ipLocation);
    url.searchParams.append('key', AMAP_WEB_API.key);
    url.searchParams.append('ip', ip);
    
    console.log('🌐 请求 URL:', url.toString());
    
    const response = await fetch(url.toString());
    const data = await response.json();
    
    console.log('📥 高德 IP 定位完整响应:', JSON.stringify(data, null, 2));
    console.log('📥 高德 IP 定位响应状态:', data.status);
    
    // 检查返回数据格式
    if (data.status !== '1') {
      console.log('⚠️ IP 定位失败:', data.info || '未知错误');
      throw new Error(data.info || 'IP 定位失败');
    }
    
    // 安全地获取城市和省份信息
    const province = data.province || '';
    const city = typeof data.city === 'string' ? data.city : (data.city || '');
    const adcode = data.adcode || '';
    
    if (!province || !city) {
      console.log('⚠️ IP 定位返回数据不完整:', JSON.stringify(data, null, 2));
      throw new Error('IP 定位返回数据不完整');
    }
    
    // 高德 IP 定位返回的是城市信息，需要再次调用地理编码获取坐标
    const cityName = typeof city === 'string' ? city.replace(/市$/, '') : city; // 移除"市"后缀
    const address = `${province}${city}`;
    
    console.log('📍 定位到城市:', address);
    console.log('📍 城市编码:', adcode);
    
    // 调用地理编码获取该城市的中心坐标
    const geocodeUrl = new URL(AMAP_WEB_API.baseUrl + AMAP_WEB_API.endpoints.geocode);
    geocodeUrl.searchParams.append('key', AMAP_WEB_API.key);
    geocodeUrl.searchParams.append('address', address);
    
    console.log('🌐 地理编码请求 URL:', geocodeUrl.toString());
    
    const geocodeResponse = await fetch(geocodeUrl.toString());
    const geocodeData = await geocodeResponse.json();
    
    console.log('📥 地理编码响应:', JSON.stringify(geocodeData, null, 2));
    
    if (geocodeData.status === '1' && geocodeData.geocodes && geocodeData.geocodes.length > 0) {
      const location = geocodeData.geocodes[0].location.split(',');
      const result = {
        lat: parseFloat(location[1]),
        lng: parseFloat(location[0]),
        city: city,
        province: province,
        adcode: adcode,
        address: address
      };
        
      console.log('✅ IP 定位成功:', JSON.stringify(result, null, 2));
      return result;
    } else {
      console.log('⚠️ 地理编码失败，使用默认坐标');
      console.log('📥 地理编码错误信息:', geocodeData.info || '未知错误');
      // 如果地理编码失败，返回城市信息但使用默认坐标
      return {
        lat: 39.908823,
        lng: 116.397470,
        city: city || '北京',
        province: province || '北京',
        adcode: adcode || '110000',
        address: address
      };
    }
  } catch (error) {
    console.error('❌ IP 定位异常:', error.message);
    console.error('❌ 错误堆栈:', error.stack);
    throw error;
  }
};

/**
 * 获取用户位置信息
 * 优先级：请求中的位置 > 用户数据库中的位置 > IP 定位
 * 
 * @param {Object} req - Express 请求对象
 * @param {Object} user - 用户对象（从数据库获取）
 * @returns {Promise<Object>} - 位置信息 { lat, lng, city }
 */
const getUserLocation = async (req, user) => {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║                                                       ║');
  console.log('║   📍 开始获取用户位置信息                             ║');
  console.log('║                                                       ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  
  // 1. 优先从请求体中获取位置（前端通过浏览器定位API获取）
  if (req.body?.location) {
    const location = req.body.location;
    if (location.lat && location.lng) {
      console.log('✅ 从请求体中获取位置信息');
      console.log('📍 位置:', JSON.stringify(location, null, 2));
      return {
        lat: parseFloat(location.lat),
        lng: parseFloat(location.lng),
        city: location.city || '未知',
        source: 'request'
      };
    }
  }
  
  // 2. 从请求查询参数中获取位置
  if (req.query?.lat && req.query?.lng) {
    console.log('✅ 从查询参数中获取位置信息');
    const location = {
      lat: parseFloat(req.query.lat),
      lng: parseFloat(req.query.lng),
      city: req.query.city || '未知',
      source: 'query'
    };
    console.log('📍 位置:', JSON.stringify(location, null, 2));
    return location;
  }
  
  // 3. 从用户数据库中获取位置
  if (user?.location?.lat && user?.location?.lng) {
    console.log('✅ 从用户数据库中获取位置信息');
    const location = {
      lat: parseFloat(user.location.lat),
      lng: parseFloat(user.location.lng),
      city: user.location.city || '未知',
      source: 'database'
    };
    console.log('📍 位置:', JSON.stringify(location, null, 2));
    return location;
  }
  
  // 4. 使用 IP 定位（最后的手段）
  console.log('⚠️ 未找到位置信息，尝试使用 IP 定位');
  try {
    const clientIP = getClientIP(req);
    console.log('🌐 客户端 IP:', clientIP);
    
    // 检查是否为本地 IP
    if (isLocalIP(clientIP)) {
      console.log('⚠️ 检测到本地 IP，无法使用 IP 定位');
      console.log('💡 本地开发建议：');
      console.log('   1. 前端使用浏览器定位 API (navigator.geolocation) 获取位置');
      console.log('   2. 在请求体中传递 location 参数');
      console.log('   3. 或在查询参数中传递 lat/lng 参数');
      throw new Error('本地 IP 无法定位，请通过请求传递位置信息');
    }
    
    const ipLocation = await getLocationByIP(clientIP);
    return {
      lat: ipLocation.lat,
      lng: ipLocation.lng,
      city: ipLocation.city,
      province: ipLocation.province,
      adcode: ipLocation.adcode,
      source: 'ip_location'
    };
  } catch (error) {
    console.error('❌ IP 定位失败:', error.message);
    
    // 如果是本地 IP 错误，提供更友好的提示
    if (error.message.includes('本地 IP')) {
      console.log('⚠️ 本地开发环境提示：');
      console.log('   请在前端使用浏览器定位 API 获取位置信息，然后通过请求传递');
      console.log('   示例代码：');
      console.log('   navigator.geolocation.getCurrentPosition((position) => {');
      console.log('     const location = {');
      console.log('       lat: position.coords.latitude,');
      console.log('       lng: position.coords.longitude');
      console.log('     };');
      console.log('     // 在请求中包含 location');
      console.log('   });');
    }
    
    console.log('⚠️ 使用默认位置（北京）');
    console.log('⚠️ 警告：使用默认位置可能不准确');
    
    // 最后的默认值
    return {
      lat: 39.908823,
      lng: 116.397470,
      city: '北京',
      source: 'default',
      warning: '无法获取用户位置，使用默认位置（北京）。本地开发时请通过请求传递位置信息。'
    };
  }
};

module.exports = {
  getUserLocation,
  getLocationByIP,
  getClientIP,
  isLocalIP
};

