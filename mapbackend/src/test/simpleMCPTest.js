import { MCPClient } from '@modelcontextprotocol/sdk';

console.log('🧪 开始简单MCP测试...');

// 简单的MCP配置
const mcpConfig = {
  mcpServers: {
    "amap-maps": {
      "args": [
        "-y",
        "@amap/amap-maps-mcp-server"
      ],
      "command": "npx",
      "env": {
        "AMAP_MAPS_API_KEY": "8675340586e27a73c7b6178e64f37583"
      }
    }
  }
};

console.log('🔧 正在初始化MCP客户端...');
const mcpClient = new MCPClient(mcpConfig);
console.log('✅ MCP客户端创建成功');

console.log('🎉 简单MCP测试完成!');