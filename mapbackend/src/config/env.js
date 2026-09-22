/**
 * 集中读取环境变量；密钥不入库，仅从 process.env 读取。
 * 本地开发可在 mapbackend/.env 中配置。
 */

require('dotenv').config();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  mongoUri: process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/justgo',
  jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-change-me',

  /** 高德 Web 服务 Key（IP / 地理 / POI / 路径） */
  amapMapsApiKey: process.env.AMAP_MAPS_API_KEY || '',

  /** 文本 / 视觉大模型（ModelScope 等） */
  aiApiKey: process.env.AI_API_KEY || process.env.MODELSCOPE_API_KEY || '',
  aiBaseUrl: process.env.AI_BASE_URL || 'https://api-inference.modelscope.cn/v1',
  aiModel: process.env.AI_MODEL || 'Qwen/Qwen3-Next-80B-A3B-Instruct',
  visionModel: process.env.VISION_MODEL || 'Qwen/Qwen2.5-VL-72B-Instruct',

  /** 本地开发模拟城市（避免内网 IP 总落到北京） */
  mockCity: process.env.MOCK_CITY || '',
  mockAdcode: process.env.MOCK_ADCODE || '',
  mockLat: process.env.MOCK_LAT ? parseFloat(process.env.MOCK_LAT) : null,
  mockLng: process.env.MOCK_LNG ? parseFloat(process.env.MOCK_LNG) : null,

  /** L0 兜底城（仅极端失败） */
  defaultCity: process.env.DEFAULT_CITY || '北京',
  defaultAdcode: process.env.DEFAULT_ADCODE || '110000',
  defaultLat: parseFloat(process.env.DEFAULT_LAT || '39.908823'),
  defaultLng: parseFloat(process.env.DEFAULT_LNG || '116.397470')
};

/**
 * 启动时可选校验：生产环境缺少关键 Key 时打警告（不阻断启动，便于渐进迁移）
 */
function warnMissingSecrets() {
  if (!env.amapMapsApiKey) {
    console.warn('[config] AMAP_MAPS_API_KEY 未设置，高德相关能力将失败');
  }
  if (!env.aiApiKey) {
    console.warn('[config] AI_API_KEY / MODELSCOPE_API_KEY 未设置，LLM 能力将失败');
  }
}

module.exports = { env, warnMissingSecrets };
