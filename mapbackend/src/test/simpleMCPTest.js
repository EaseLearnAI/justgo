import { MCPClient } from '@modelcontextprotocol/sdk';

console.log('🧪 开始简单MCP测试...');

const apiKey = process.env.AMAP_MAPS_API_KEY || '';
if (!apiKey) {
  console.warn('⚠️ 未设置 AMAP_MAPS_API_KEY，跳过真实 MCP 调用');
}

const mcpConfig = {
  mcpServers: {
    "amap-maps": {
      "args": [
        "-y",
        "@amap/amap-maps-mcp-server"
      ],
      "command": "npx",
      "env": {
        "AMAP_MAPS_API_KEY": apiKey
      }
    }
  }
};

console.log('🔧 正在初始化MCP客户端...');
const mcpClient = new MCPClient(mcpConfig);
console.log('✅ MCP客户端创建成功');

console.log('🎉 简单MCP测试完成!');
