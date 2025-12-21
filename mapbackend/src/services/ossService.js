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
    console.log('-----------------------------------');
    console.log('🔧 初始化 OSS 客户端');
    console.log('📍 Region:', OSS_CONFIG.region);
    console.log('📦 Bucket:', OSS_CONFIG.bucket);
    console.log('-----------------------------------');
    
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
  console.log('===================================');
  console.log('📤 OSS 文件上传开始');
  console.log('===================================');
  console.log('📁 本地文件路径:', localPath);
  console.log('📂 目标目录:', folder);

  try {
    // 检查文件是否存在
    if (!fs.existsSync(localPath)) {
      console.error('❌ 文件不存在:', localPath);
      throw new Error(`文件不存在: ${localPath}`);
    }

    const ossClient = initClient();
    const fileName = path.basename(localPath);
    const uniqueName = generateUniqueFileName(fileName);
    const objectName = `${folder}/${uniqueName}`;

    console.log('📝 原始文件名:', fileName);
    console.log('📝 OSS 对象名:', objectName);
    console.log('-----------------------------------');
    console.log('🚀 开始上传...');

    const startTime = Date.now();
    const result = await ossClient.put(objectName, localPath);
    const endTime = Date.now();

    console.log('-----------------------------------');
    console.log('✅ 上传成功!');
    console.log('⏱️ 耗时:', endTime - startTime, 'ms');
    console.log('🔗 文件 URL:', result.url);
    console.log('📊 响应状态:', result.res.status);
    console.log('===================================');
    console.log('🏁 OSS 文件上传结束');
    console.log('===================================');

    return {
      success: true,
      url: result.url,
      objectName: objectName,
      name: result.name,
      etag: result.res.headers.etag
    };
  } catch (error) {
    console.error('-----------------------------------');
    console.error('❌ 上传失败:', error.message);
    console.error('📊 错误详情:', error.code || error.name);
    console.error('===================================');
    console.error('🏁 OSS 文件上传结束 (失败)');
    console.error('===================================');

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
  console.log('===================================');
  console.log('📤 OSS Buffer 上传开始');
  console.log('===================================');
  console.log('📝 文件名:', fileName);
  console.log('📦 Buffer 大小:', buffer.length, 'bytes');
  console.log('📂 目标目录:', folder);

  try {
    const ossClient = initClient();
    const uniqueName = generateUniqueFileName(fileName);
    const objectName = `${folder}/${uniqueName}`;

    console.log('📝 OSS 对象名:', objectName);
    console.log('-----------------------------------');
    console.log('🚀 开始上传...');

    const startTime = Date.now();
    const result = await ossClient.put(objectName, buffer);
    const endTime = Date.now();

    console.log('-----------------------------------');
    console.log('✅ 上传成功!');
    console.log('⏱️ 耗时:', endTime - startTime, 'ms');
    console.log('🔗 文件 URL:', result.url);
    console.log('===================================');

    return {
      success: true,
      url: result.url,
      objectName: objectName,
      name: result.name
    };
  } catch (error) {
    console.error('❌ Buffer 上传失败:', error.message);
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
  console.log('===================================');
  console.log('📥 OSS 文件下载开始');
  console.log('===================================');
  console.log('📝 OSS 对象名:', objectName);
  console.log('📁 本地保存路径:', localPath);

  try {
    const ossClient = initClient();

    console.log('-----------------------------------');
    console.log('🚀 开始下载...');

    const startTime = Date.now();
    const result = await ossClient.get(objectName, localPath);
    const endTime = Date.now();

    console.log('-----------------------------------');
    console.log('✅ 下载成功!');
    console.log('⏱️ 耗时:', endTime - startTime, 'ms');
    console.log('📊 响应状态:', result.res.status);
    console.log('===================================');

    return {
      success: true,
      localPath: localPath
    };
  } catch (error) {
    console.error('❌ 下载失败:', error.message);
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
  console.log('===================================');
  console.log('🗑️ OSS 文件删除开始');
  console.log('===================================');
  console.log('📝 OSS 对象名:', objectName);

  try {
    const ossClient = initClient();
    const result = await ossClient.delete(objectName);

    console.log('✅ 删除成功!');
    console.log('===================================');

    return {
      success: true,
      result: result
    };
  } catch (error) {
    console.error('❌ 删除失败:', error.message);
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
  console.log('🔗 生成签名 URL');
  console.log('📝 对象名:', objectName);
  console.log('⏰ 有效期:', expires, '秒');

  const ossClient = initClient();
  const url = ossClient.signatureUrl(objectName, { expires });

  console.log('✅ 签名 URL:', url);
  return url;
};

/**
 * 列出目录下的文件
 * @param {string} prefix - 目录前缀
 * @param {number} maxKeys - 最大返回数量
 * @returns {Promise<{success: boolean, files: Array}>}
 */
const listFiles = async (prefix = '', maxKeys = 100) => {
  console.log('===================================');
  console.log('📋 OSS 文件列表');
  console.log('===================================');
  console.log('📂 目录前缀:', prefix || '(根目录)');

  try {
    const ossClient = initClient();
    const result = await ossClient.list({
      prefix: prefix,
      'max-keys': maxKeys
    });

    const files = result.objects || [];
    console.log('✅ 获取成功!');
    console.log('📊 文件数量:', files.length);
    console.log('===================================');

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
    console.error('❌ 获取列表失败:', error.message);
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
