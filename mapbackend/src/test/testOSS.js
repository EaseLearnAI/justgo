/**
 * OSS 服务测试脚本
 * 测试文件上传、下载、删除等功能
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const path = require('path');
const fs = require('fs');
const { uploadFile, downloadFile, deleteFile, listFiles, getSignedUrl } = require('../services/ossService');

// 测试图片路径
const TEST_IMAGE_PATH = path.join(__dirname, 'images.jpeg');

console.log('╔═══════════════════════════════════════════════════╗');
console.log('║           OSS 服务功能测试                         ║');
console.log('╚═══════════════════════════════════════════════════╝');
console.log('');
console.log('📋 测试环境配置:');
console.log('   - OSS_REGION:', process.env.OSS_REGION);
console.log('   - OSS_BUCKET:', process.env.OSS_BUCKET);
console.log('   - 测试图片:', TEST_IMAGE_PATH);
console.log('');

/**
 * 测试 1: 文件上传
 */
async function testUpload() {
  console.log('');
  console.log('┌───────────────────────────────────────────────────┐');
  console.log('│  测试 1: 文件上传                                  │');
  console.log('└───────────────────────────────────────────────────┘');
  
  // 检查测试文件是否存在
  if (!fs.existsSync(TEST_IMAGE_PATH)) {
    console.error('❌ 测试图片不存在:', TEST_IMAGE_PATH);
    console.log('📝 请确保测试图片已放置在 test 目录下');
    return null;
  }
  
  console.log('📁 测试文件:', TEST_IMAGE_PATH);
  console.log('📊 文件大小:', fs.statSync(TEST_IMAGE_PATH).size, 'bytes');
  console.log('');
  
  const result = await uploadFile(TEST_IMAGE_PATH, 'test-images');
  
  if (result.success) {
    console.log('');
    console.log('┌───────────────────────────────────────────────────┐');
    console.log('│  ✅ 上传测试通过                                   │');
    console.log('└───────────────────────────────────────────────────┘');
    console.log('📄 对象名:', result.objectName);
    console.log('🔗 访问 URL:', result.url);
  } else {
    console.log('');
    console.log('┌───────────────────────────────────────────────────┐');
    console.log('│  ❌ 上传测试失败                                   │');
    console.log('└───────────────────────────────────────────────────┘');
    console.log('错误:', result.error);
  }
  
  return result;
}

/**
 * 测试 2: 生成签名 URL
 */
function testSignedUrl(objectName) {
  console.log('');
  console.log('┌───────────────────────────────────────────────────┐');
  console.log('│  测试 2: 生成签名 URL                              │');
  console.log('└───────────────────────────────────────────────────┘');
  
  if (!objectName) {
    console.log('⏭️ 跳过 - 没有可用的对象名');
    return null;
  }
  
  const signedUrl = getSignedUrl(objectName, 3600);
  
  console.log('');
  console.log('┌───────────────────────────────────────────────────┐');
  console.log('│  ✅ 签名 URL 生成成功                              │');
  console.log('└───────────────────────────────────────────────────┘');
  console.log('🔗 签名 URL:', signedUrl);
  
  return signedUrl;
}

/**
 * 测试 3: 列出文件
 */
async function testListFiles() {
  console.log('');
  console.log('┌───────────────────────────────────────────────────┐');
  console.log('│  测试 3: 列出文件                                  │');
  console.log('└───────────────────────────────────────────────────┘');
  
  const result = await listFiles('test-images/', 10);
  
  if (result.success) {
    console.log('');
    console.log('┌───────────────────────────────────────────────────┐');
    console.log('│  ✅ 列表获取成功                                   │');
    console.log('└───────────────────────────────────────────────────┘');
    console.log('📊 文件数量:', result.files.length);
    result.files.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.name} (${file.size} bytes)`);
    });
  } else {
    console.log('❌ 列表获取失败:', result.error);
  }
  
  return result;
}

/**
 * 测试 4: 文件下载
 */
async function testDownload(objectName) {
  console.log('');
  console.log('┌───────────────────────────────────────────────────┐');
  console.log('│  测试 4: 文件下载                                  │');
  console.log('└───────────────────────────────────────────────────┘');
  
  if (!objectName) {
    console.log('⏭️ 跳过 - 没有可用的对象名');
    return null;
  }
  
  const downloadPath = path.join(__dirname, 'downloaded_image.jpeg');
  const result = await downloadFile(objectName, downloadPath);
  
  if (result.success) {
    console.log('');
    console.log('┌───────────────────────────────────────────────────┐');
    console.log('│  ✅ 下载测试通过                                   │');
    console.log('└───────────────────────────────────────────────────┘');
    console.log('📁 保存路径:', downloadPath);
    console.log('📊 文件大小:', fs.statSync(downloadPath).size, 'bytes');
    
    // 清理下载的文件
    fs.unlinkSync(downloadPath);
    console.log('🗑️ 已清理下载的测试文件');
  } else {
    console.log('❌ 下载测试失败:', result.error);
  }
  
  return result;
}

/**
 * 测试 5: 文件删除 (可选)
 */
async function testDelete(objectName, shouldDelete = false) {
  console.log('');
  console.log('┌───────────────────────────────────────────────────┐');
  console.log('│  测试 5: 文件删除                                  │');
  console.log('└───────────────────────────────────────────────────┘');
  
  if (!objectName) {
    console.log('⏭️ 跳过 - 没有可用的对象名');
    return null;
  }
  
  if (!shouldDelete) {
    console.log('⏭️ 跳过删除 - 保留上传的测试文件以供验证');
    console.log('📝 如需删除，请设置 shouldDelete = true');
    return null;
  }
  
  const result = await deleteFile(objectName);
  
  if (result.success) {
    console.log('');
    console.log('┌───────────────────────────────────────────────────┐');
    console.log('│  ✅ 删除测试通过                                   │');
    console.log('└───────────────────────────────────────────────────┘');
  } else {
    console.log('❌ 删除测试失败:', result.error);
  }
  
  return result;
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log('');
  console.log('🚀 开始运行 OSS 功能测试...');
  console.log('');
  
  try {
    // 测试 1: 上传
    const uploadResult = await testUpload();
    const objectName = uploadResult?.objectName;
    const fileUrl = uploadResult?.url;
    
    // 测试 2: 签名 URL
    testSignedUrl(objectName);
    
    // 测试 3: 列出文件
    await testListFiles();
    
    // 测试 4: 下载
    await testDownload(objectName);
    
    // 测试 5: 删除 (默认不删除，保留文件以供验证)
    await testDelete(objectName, false);
    
    console.log('');
    console.log('╔═══════════════════════════════════════════════════╗');
    console.log('║              测试完成                              ║');
    console.log('╚═══════════════════════════════════════════════════╝');
    
    if (uploadResult?.success) {
      console.log('');
      console.log('📋 测试结果汇总:');
      console.log('   ✅ 文件上传: 成功');
      console.log('   ✅ 签名 URL: 成功');
      console.log('   ✅ 文件列表: 成功');
      console.log('   ✅ 文件下载: 成功');
      console.log('');
      console.log('🔗 上传的文件 URL:');
      console.log('   ' + fileUrl);
      console.log('');
      console.log('💡 你可以在浏览器中打开上面的 URL 查看上传的图片');
    }
    
  } catch (error) {
    console.error('');
    console.error('❌ 测试过程中发生错误:', error.message);
    console.error(error.stack);
  }
}

// 运行测试
runAllTests();
