# Just Go! 后端项目

基于 Node.js + Express + MongoDB 的运动健康管理后端服务。

## 项目结构

```
mapbackend/
├── doc/                    # API 文档
│   └── API文档.md
├── src/                    # 源代码目录
│   ├── config/            # 配置文件
│   │   └── database.js    # 数据库连接配置
│   ├── middleware/        # 中间件
│   │   ├── auth.js        # JWT 认证中间件
│   │   ├── errorHandler.js # 错误处理中间件
│   │   └── logger.js      # 日志中间件
│   ├── models/            # 数据模型
│   │   ├── User.js        # 用户模型
│   │   └── FoodRecord.js  # 记录模型
│   ├── routes/            # 路由
│   │   ├── auth.js        # 认证路由(登录/注册)
│   │   ├── user.js        # 用户路由
│   │   └── records.js     # 记录路由
│   └── app.js             # 应用入口文件
├── .env                   # 环境变量配置
├── .gitignore            # Git 忽略文件
└── package.json          # 项目依赖配置
```

## 技术栈

- **运行环境**: Node.js 14+
- **Web 框架**: Express 4.x
- **数据库**: MongoDB 4.x+
- **ODM**: Mongoose 8.x
- **认证**: JWT (jsonwebtoken)
- **密码加密**: bcryptjs
- **日志**: Morgan
- **验证**: Joi

## 快速开始

### 1. 安装依赖

```bash
cd mapbackend
npm install
```

### 2. 配置环境变量

编辑 `.env` 文件，配置以下参数：

```env
# 服务器配置
PORT=3000
NODE_ENV=development

# MongoDB 配置
MONGODB_URI=mongodb://localhost:27017/mapbackend

# JWT 配置
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRE=7d

# 日志配置
LOG_LEVEL=dev
```

### 3. 启动 MongoDB

确保本地 MongoDB 服务已启动：

```bash
# macOS (使用 Homebrew)
brew services start mongodb-community

# 或直接启动
mongod --config /usr/local/etc/mongod.conf

# Linux
sudo systemctl start mongod

# Windows
net start MongoDB
```

### 4. 启动服务

**开发模式** (支持热重载):
```bash
npm run dev
```

**生产模式**:
```bash
npm start
```

### 5. 验证服务

访问健康检查接口：
```bash
curl http://localhost:3000/api/health
```

预期响应：
```json
{
  "success": true,
  "message": "Just Go! 后端服务运行正常",
  "timestamp": "2024-12-17T10:30:00.000Z"
}
```

## API 文档

详细的 API 文档请查看: [doc/API文档.md](./doc/API文档.md)

### 主要接口

#### 认证相关
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录

#### 用户相关
- `GET /api/user/profile` - 获取用户信息
- `PUT /api/user/profile` - 更新用户信息
- `PUT /api/user/body-stats` - 更新身体数据
- `PUT /api/user/goals` - 更新目标设置
- `POST /api/user/check-in` - 用户签到
- `GET /api/user/bmr` - 获取基础代谢率

#### 记录相关
- `GET /api/records` - 获取所有记录
- `GET /api/records/today` - 获取今日记录
- `GET /api/records/today/stats` - 获取今日统计
- `POST /api/records` - 创建新记录
- `PUT /api/records/:id` - 更新记录
- `DELETE /api/records/:id` - 删除记录

## 数据模型

### User (用户)
- 手机号登录认证
- 身体数据 (身高、体重、年龄、性别)
- 目标设置 (每日热量、运动时长、运动天数)
- 打卡统计

### FoodRecord (饮食/运动记录)
- 记录类型 (摄入/消耗)
- 卡路里数值
- 运动详情 (时长、距离、类型)
- 路线偏好标签

## 开发说明

### 添加新路由

1. 在 `src/routes/` 创建新路由文件
2. 在 `src/app.js` 中引入并注册路由
3. 更新 API 文档

### 添加新模型

1. 在 `src/models/` 创建新模型文件
2. 定义 Schema 和方法
3. 在需要的路由中引入使用

### 中间件说明

- **auth.js**: JWT 认证，保护需要登录的路由
- **errorHandler.js**: 统一错误处理，格式化错误响应
- **logger.js**: 请求日志记录

## 环境要求

- Node.js >= 14.0.0
- MongoDB >= 4.0.0
- npm >= 6.0.0

## 常见问题

### 1. MongoDB 连接失败

**错误**: `MongoDB 连接失败: connect ECONNREFUSED`

**解决**:
- 确保 MongoDB 服务已启动
- 检查 `.env` 中的 `MONGODB_URI` 配置是否正确
- 确认 MongoDB 端口 27017 未被占用

### 2. Token 验证失败

**错误**: `Token 无效或已过期`

**解决**:
- 检查请求头是否正确携带 `Authorization: Bearer <token>`
- Token 默认有效期 7 天，过期需重新登录
- 确保 `.env` 中的 `JWT_SECRET` 配置正确

### 3. 端口被占用

**错误**: `Error: listen EADDRINUSE: address already in use :::3000`

**解决**:
```bash
# macOS/Linux 查找并结束占用端口的进程
lsof -ti:3000 | xargs kill -9

# 或修改 .env 中的 PORT 配置
PORT=3001
```

## 测试

使用 Postman 或 curl 测试 API：

### 注册测试
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","password":"123456"}'
```

### 登录测试
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","password":"123456"}'
```

### 获取用户信息 (需要 token)
```bash
curl -X GET http://localhost:3000/api/user/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 部署说明

### 生产环境配置

1. 修改 `.env` 中的配置：
```env
NODE_ENV=production
MONGODB_URI=mongodb://your-production-host:27017/mapbackend
JWT_SECRET=your-very-secure-secret-key
```

2. 使用 PM2 部署：
```bash
npm install -g pm2
pm2 start src/app.js --name justgo-api
pm2 save
pm2 startup
```

### Docker 部署

详见项目根目录的 Dockerfile 和 docker-compose.yml

## 安全建议

1. **生产环境必须修改 JWT_SECRET**
2. **使用 HTTPS 加密传输**
3. **定期备份数据库**
4. **限制 API 访问频率**
5. **验证所有用户输入**

## 许可证

ISC

## 作者

Just Go! Team

## 更新日志

### v1.0.0 (2024-12-17)
- ✅ 完成用户注册登录功能
- ✅ 完成用户信息管理
- ✅ 完成饮食/运动记录管理
- ✅ 完成今日统计功能
- ✅ 添加 JWT 认证
- ✅ 完善 API 文档
