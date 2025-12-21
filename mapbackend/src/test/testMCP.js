import fs from 'fs';
import path from 'path';

async function testMCPConnection() {
  console.log('🧪 开始MCP连接测试...');
  
  try {
    // 动态导入MCP客户端
    console.log('🔧 正在动态导入MCP客户端...');
    const { MCPClient } = await import('@modelcontextprotocol/sdk');
    
    // 读取MCP配置
    const mcpConfigPath = path.join(__dirname, '..', 'MCP', 'mcp-config.json');
    const mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
    
    console.log('📄 MCP配置:', JSON.stringify(mcpConfig, null, 2));
    
    // 初始化MCP客户端
    console.log('🔧 正在初始化MCP客户端...');
    const mcpClient = new MCPClient(mcpConfig);
    await mcpClient.connect();
    console.log('✅ MCP客户端初始化成功');
    
    // 测试高德地图API调用
    console.log('📍 测试高德地图步行路径规划...');
    
    // 构建测试请求（北京天安门附近）
    const mcpRequest = {
      method: 'amap.direction.walking',
      params: {
        origin: '116.397470,39.908823', // 天安门广场
        destination: '116.401000,39.910000', // 简单的目的地
        alternatives: 1
      }
    };
    
    console.log('📤 发送MCP请求:', JSON.stringify(mcpRequest, null, 2));
    
    // 调用高德地图MCP
    const mcpResponse = await mcpClient.callTool(
      mcpRequest.method,
      mcpRequest.params
    );
    
    console.log('📥 收到MCP响应:', JSON.stringify(mcpResponse, null, 2));
    
    // 检查响应数据
    if (mcpResponse && mcpResponse.data && mcpResponse.data.route) {
      const route = mcpResponse.data.route.paths[0];
      if (route) {
        console.log('✅ 路线规划成功!');
        console.log('📏 距离:', route.distance, '米');
        console.log('⏱️ 时间:', Math.round(route.duration / 60), '分钟');
      } else {
        console.warn('⚠️ 路线数据格式异常');
      }
    } else {
      console.warn('⚠️ 响应数据不完整');
    }
    
    console.log('🎉 MCP测试完成!');
  } catch (error) {
    console.error('❌ MCP测试失败:', error);
  }
}

// 运行测试
if (require.main === module) {
  testMCPConnection();
}

module.exports = { testMCPConnection };