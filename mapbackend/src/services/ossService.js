/**
 * 阿里云 OSS 服务模块
 * 提供文件上传、下载、删除等功能
 */

const OSS = require('ali-oss');
const path = require('path');
const fs = require('fs');

// OSS 配置
const OSS_CONFIG = {
  region: process.env.OSS_REGION || 'oss-cn-beijing',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET || 'abc1567849',
  authorizationV4: process.env.OSS_AUTHORIZATION_V4 === 'true'
};

// 创建 OSS 客户端
let client = null;

/**
 * 初始化 OSS 客户端
 */
const initClient = () => {
  if (!client) {
    client = new OSS({
      region: OSS_CONFIG.region,
      accessKeyId: OSS_CONFIG.accessKeyId,
      accessKeySecret: OSS_CONFIG.accessKeySecret,
      bucket: OSS_CONFIG.bucket,
      authorizationV4: OSS_CONFIG.authorizationV4,
      secure: true  // 强制使用 HTTPS
    });
  }
  return client;
};

/**
 * 生成唯一文件名
 * @param {string} originalName - 原始文件名
 * @returns {string} 唯一文件名
 */
const generateUniqueFileName = (originalName) => {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}_${random}${ext}`;
};

/**
 * 上传文件到 OSS
 * @param {string} localPath - 本地文件路径
 * @param {string} folder - OSS 目录 (可选)
 * @returns {Promise<{success: boolean, url: string, objectName: string}>}
 */
const uploadFile = async (localPath, folder = 'uploads') => {
  try {
    // 检查文件是否存在
    if (!fs.existsSync(localPath)) {
      throw new Error(`文件不存在: ${localPath}`);
    }

    const ossClient = initClient();
    const fileName = path.basename(localPath);
    const uniqueName = generateUniqueFileName(fileName);
    const objectName = `${folder}/${uniqueName}`;

    const startTime = Date.now();
    const result = await ossClient.put(objectName, localPath);
    const endTime = Date.now();

    return {
      success: true,
      url: result.url,
      objectName: objectName,
      name: result.name,
      etag: result.res.headers.etag
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
};

/**
 * 上传 Buffer 到 OSS
 * @param {Buffer} buffer - 文件 Buffer
 * @param {string} fileName - 文件名
 * @param {string} folder - OSS 目录 (可选)
 * @returns {Promise<{success: boolean, url: string, objectName: string}>}
 */
const uploadBuffer = async (buffer, fileName, folder = 'uploads') => {
  try {
    const ossClient = initClient();
    const uniqueName = generateUniqueFileName(fileName);
    const objectName = `${folder}/${uniqueName}`;

    const startTime = Date.now();
    const result = await ossClient.put(objectName, buffer);
    const endTime = Date.now();

    return {
      success: true,
      url: result.url,
      objectName: objectName,
      name: result.name
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
};

/**
 * 从 OSS 下载文件
 * @param {string} objectName - OSS 对象名
 * @param {string} localPath - 本地保存路径
 * @returns {Promise<{success: boolean}>}
 */
const downloadFile = async (objectName, localPath) => {
  try {
    const ossClient = initClient();

    const startTime = Date.now();
    const result = await ossClient.get(objectName, localPath);
    const endTime = Date.now();

    return {
      success: true,
      localPath: localPath
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 删除 OSS 文件
 * @param {string} objectName - OSS 对象名
 * @returns {Promise<{success: boolean}>}
 */
const deleteFile = async (objectName) => {
  try {
    const ossClient = initClient();
    const result = await ossClient.delete(objectName);

    return {
      success: true,
      result: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 生成临时访问 URL (带签名)
 * @param {string} objectName - OSS 对象名
 * @param {number} expires - 过期时间 (秒), 默认 3600
 * @returns {string} 签名 URL
 */
const getSignedUrl = (objectName, expires = 3600) => {
  const ossClient = initClient();
  const url = ossClient.signatureUrl(objectName, { expires });

  return url;
};

/**
 * 列出目录下的文件
 * @param {string} prefix - 目录前缀
 * @param {number} maxKeys - 最大返回数量
 * @returns {Promise<{success: boolean, files: Array}>}
 */
const listFiles = async (prefix = '', maxKeys = 100) => {
  try {
    const ossClient = initClient();
    const result = await ossClient.list({
      prefix: prefix,
      'max-keys': maxKeys
    });

    const files = result.objects || [];

    return {
      success: true,
      files: files.map(f => ({
        name: f.name,
        url: f.url,
        size: f.size,
        lastModified: f.lastModified
      }))
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      files: []
    };
  }
};

module.exports = {
  uploadFile,
  uploadBuffer,
  downloadFile,
  deleteFile,
  getSignedUrl,
  listFiles,
  initClient
};
