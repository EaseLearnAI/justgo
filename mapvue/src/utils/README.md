# 工具函数说明

## 位置获取工具 (location.ts)

### 功能说明

提供浏览器定位功能，用于获取用户的当前位置信息。

### 使用方法

#### 1. 基本使用

```typescript
import { getCurrentLocation } from '@/utils/location'

try {
  const location = await getCurrentLocation()
  console.log('位置:', location)
  // { lat: 31.230416, lng: 121.473701, accuracy: 10 }
} catch (error) {
  console.error('定位失败:', error.message)
}
```

#### 2. 自定义选项

```typescript
const location = await getCurrentLocation({
  enableHighAccuracy: true,  // 使用高精度定位
  timeout: 15000,            // 超时时间 15 秒
  maximumAge: 60000          // 允许使用 1 分钟内的缓存
})
```

#### 3. 自动选择最佳方式

```typescript
import { getLocation } from '@/utils/location'

// 自动尝试浏览器定位，失败则尝试高德地图定位
const location = await getLocation()
```

### API 说明

#### `getCurrentLocation(options?: PositionOptions): Promise<LocationInfo>`

使用浏览器原生定位 API 获取位置。

**参数：**
- `options` (可选): 定位选项
  - `enableHighAccuracy`: 是否使用高精度定位（默认: true）
  - `timeout`: 超时时间，毫秒（默认: 10000）
  - `maximumAge`: 允许使用缓存的最大时间，毫秒（默认: 0）

**返回：**
- `Promise<LocationInfo>`: 位置信息对象
  - `lat`: 纬度
  - `lng`: 经度
  - `city`: 城市名称（如果可用）
  - `accuracy`: 精度，米

**错误：**
- `PERMISSION_DENIED`: 用户拒绝了定位请求
- `POSITION_UNAVAILABLE`: 位置信息不可用
- `TIMEOUT`: 定位请求超时

### 注意事项

1. **HTTPS 要求**：在非 HTTPS 环境下，部分浏览器可能无法使用定位功能
2. **用户授权**：首次使用需要用户授权位置权限
3. **移动端**：需要开启 GPS 和位置权限
4. **错误处理**：建议添加友好的错误提示，引导用户开启定位权限

### 浏览器兼容性

- Chrome/Edge: ✅ 完全支持
- Firefox: ✅ 完全支持
- Safari: ✅ 完全支持（需要 HTTPS）
- 移动端浏览器: ✅ 完全支持

