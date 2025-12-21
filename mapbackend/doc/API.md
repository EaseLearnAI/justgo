# Just Go! API 接口文档

## 基础信息

- **Base URL**: `http://localhost:3000/api`
- **数据格式**: JSON
- **认证方式**: JWT Token (Bearer)

---

## 1. 用户认证模块

### 1.1 用户注册

**请求**
- **URL**: `/auth/register`
- **Method**: `POST`
- **Content-Type**: `application/json`

**请求参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| phone | string | 是 | 手机号(11位) |
| password | string | 是 | 密码(6-20个字符) |

**请求示例**
```json
{
  "phone": "13812345678",
  "password": "123456"
}
```

**成功响应** (200)
```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "user": {
      "_id": "6761234567890abcdef12345",
      "phone": "13812345678",
      "createdAt": "2024-12-17T10:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**失败响应**
- 手机号格式错误 (400)
```json
{
  "success": false,
  "message": "请输入正确的手机号"
}
```

- 密码长度不足 (400)
```json
{
  "success": false,
  "message": "密码至少6个字符"
}
```

- 手机号已注册 (400)
```json
{
  "success": false,
  "message": "该手机号已注册"
}
```

---

### 1.2 用户登录

**请求**
- **URL**: `/auth/login`
- **Method**: `POST`
- **Content-Type**: `application/json`

**请求参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| phone | string | 是 | 手机号 |
| password | string | 是 | 密码 |

**请求示例**
```json
{
  "phone": "13812345678",
  "password": "123456"
}
```

**成功响应** (200)
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "user": {
      "_id": "6761234567890abcdef12345",
      "phone": "13812345678",
      "nickname": "用户138****5678",
      "avatar": "https://example.com/default-avatar.png"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**失败响应**
- 账号或密码错误 (401)
```json
{
  "success": false,
  "message": "账号或密码错误"
}
```

- 参数缺失 (400)
```json
{
  "success": false,
  "message": "请填写完整信息"
}
```

---

### 1.3 获取当前用户信息

**请求**
- **URL**: `/auth/me`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <token>`

**成功响应** (200)
```json
{
  "success": true,
  "data": {
    "_id": "6761234567890abcdef12345",
    "phone": "13812345678",
    "nickname": "Terry",
    "avatar": "https://example.com/avatar.png",
    "height": 175,
    "weight": 70,
    "age": 25,
    "gender": "male",
    "dailyCalorieGoal": 1500,
    "dailyExerciseGoal": 45,
    "weeklyDaysGoal": 5,
    "streakDays": 12,
    "createdAt": "2024-12-17T10:00:00.000Z"
  }
}
```

**失败响应** (401)
```json
{
  "success": false,
  "message": "未授权，请先登录"
}
```

---

## 2. 饮食记录模块

### 2.1 添加饮食记录

**请求**
- **URL**: `/records`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer <token>`
- **Content-Type**: `application/json`

**请求参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 食物/运动名称 |
| calories | number | 是 | 热量(kcal) |
| type | string | 是 | 类型: "intake"(摄入) / "consume"(消耗) |
| duration | number | 否 | 运动时长(分钟) |
| distance | number | 否 | 运动距离(公里) |

**请求示例**
```json
{
  "name": "拿铁咖啡",
  "calories": 180,
  "type": "intake"
}
```

**成功响应** (201)
```json
{
  "success": true,
  "message": "记录添加成功",
  "data": {
    "_id": "6761234567890abcdef12346",
    "userId": "6761234567890abcdef12345",
    "name": "拿铁咖啡",
    "calories": 180,
    "type": "intake",
    "time": "2024-12-17T10:30:00.000Z"
  }
}
```

**失败响应** (400)
```json
{
  "success": false,
  "message": "请填写完整的记录信息"
}
```

---

### 2.2 获取今日记录

**请求**
- **URL**: `/records/today`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <token>`

**查询参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 否 | 筛选类型: "all" / "intake" / "consume" |

**成功响应** (200)
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "_id": "6761234567890abcdef12346",
        "name": "晚间散步",
        "calories": 120,
        "type": "consume",
        "time": "2024-12-17T18:00:00.000Z",
        "duration": 30,
        "distance": 2.5
      },
      {
        "_id": "6761234567890abcdef12347",
        "name": "拿铁咖啡",
        "calories": 180,
        "type": "intake",
        "time": "2024-12-17T10:30:00.000Z"
      }
    ],
    "summary": {
      "totalIntake": 850,
      "totalConsume": 1300,
      "netCalories": -450
    }
  }
}
```

---

### 2.3 获取指定日期记录

**请求**
- **URL**: `/records/date/:date`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <token>`

**路径参数**
| 参数 | 类型 | 说明 |
|------|------|------|
| date | string | 日期(YYYY-MM-DD格式) |

**成功响应** (200)
```json
{
  "success": true,
  "data": {
    "date": "2024-12-16",
    "records": [...],
    "summary": {
      "totalIntake": 1200,
      "totalConsume": 800,
      "netCalories": 400,
      "completed": true
    }
  }
}
```

---

### 2.4 删除记录

**请求**
- **URL**: `/records/:id`
- **Method**: `DELETE`
- **Headers**: `Authorization: Bearer <token>`

**成功响应** (200)
```json
{
  "success": true,
  "message": "记录已删除"
}
```

**失败响应** (404)
```json
{
  "success": false,
  "message": "记录不存在"
}
```

---

## 3. 运动计划模块

### 3.1 计算运动方案

**请求**
- **URL**: `/exercise/calculate`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer <token>`
- **Content-Type**: `application/json`

**请求参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| calories | number | 是 | 需要消耗的热量 |

**请求示例**
```json
{
  "calories": 250
}
```

**成功响应** (200)
```json
{
  "success": true,
  "data": {
    "calories": 250,
    "exerciseTimes": {
      "walk": 45,
      "run": 25,
      "bike": 21
    },
    "message": "已为您计算运动方案"
  }
}
```

---

### 3.2 生成运动路线

**请求**
- **URL**: `/exercise/generate-route`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer <token>`
- **Content-Type**: `application/json`

**请求参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | 运动类型: "walk" / "run" / "bike" |
| duration | number | 是 | 运动时长(分钟) |
| preferences | array | 否 | 偏好标签数组 |
| location | object | 否 | 当前位置 {lat, lng} |

**请求示例**
```json
{
  "type": "walk",
  "duration": 45,
  "preferences": ["🏞️ Citywalk", "🌳 绿化多"],
  "location": {
    "lat": 39.908823,
    "lng": 116.397470
  }
}
```

**成功响应** (200)
```json
{
  "success": true,
  "data": {
    "route": {
      "_id": "6761234567890abcdef12348",
      "type": "walk",
      "duration": 45,
      "distance": 3.75,
      "calories": 248,
      "preferences": ["🏞️ Citywalk", "🌳 绿化多"],
      "startLocation": {
        "lat": 39.908823,
        "lng": 116.397470
      },
      "endLocation": {
        "lat": 39.918823,
        "lng": 116.407470
      },
      "amapUrl": "https://uri.amap.com/navigation?..."
    }
  }
}
```

---

### 3.3 完成运动打卡

**请求**
- **URL**: `/exercise/complete`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer <token>`
- **Content-Type**: `application/json`

**请求参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| planId | string | 是 | 运动计划ID |
| actualDuration | number | 否 | 实际运动时长(分钟) |
| actualDistance | number | 否 | 实际运动距离(公里) |

**请求示例**
```json
{
  "planId": "6761234567890abcdef12348",
  "actualDuration": 42,
  "actualDistance": 3.5
}
```

**成功响应** (200)
```json
{
  "success": true,
  "message": "🎉 完成目标！",
  "data": {
    "record": {
      "_id": "6761234567890abcdef12349",
      "name": "步行运动",
      "calories": 231,
      "type": "consume",
      "duration": 42,
      "distance": 3.5,
      "time": "2024-12-17T19:00:00.000Z"
    },
    "stats": {
      "todayCaloriesBurned": 1531,
      "streakDays": 13
    }
  }
}
```

---

## 4. 每日统计模块

### 4.1 获取今日摘要

**请求**
- **URL**: `/daily/summary`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <token>`

**成功响应** (200)
```json
{
  "success": true,
  "data": {
    "date": "2024-12-17",
    "intake": 850,
    "exercise": 1300,
    "base": 1600,
    "netCalories": -450,
    "goalProgress": 65,
    "completed": false
  }
}
```

---

### 4.2 获取历史统计

**请求**
- **URL**: `/daily/history`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <token>`

**查询参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| month | string | 否 | 月份(YYYY-MM格式)，默认当月 |

**成功响应** (200)
```json
{
  "success": true,
  "data": {
    "month": "2024-12",
    "completedDays": 15,
    "currentStreak": 12,
    "totalCaloriesBurned": 18500,
    "totalDistance": 85.5,
    "dailyData": {
      "2024-12-16": {
        "completed": true,
        "calories": 285,
        "duration": 42,
        "distance": 3.5
      },
      "2024-12-15": {
        "completed": true,
        "calories": 320,
        "duration": 45,
        "distance": 4.0
      }
    }
  }
}
```

---

## 5. 用户资料模块

### 5.1 更新用户资料

**请求**
- **URL**: `/users/profile`
- **Method**: `PUT`
- **Headers**: `Authorization: Bearer <token>`
- **Content-Type**: `application/json`

**请求参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| nickname | string | 否 | 昵称 |
| avatar | string | 否 | 头像URL |
| height | number | 否 | 身高(cm) |
| weight | number | 否 | 体重(kg) |
| age | number | 否 | 年龄 |
| gender | string | 否 | 性别: "male" / "female" |

**请求示例**
```json
{
  "nickname": "Terry",
  "height": 175,
  "weight": 70,
  "age": 25,
  "gender": "male"
}
```

**成功响应** (200)
```json
{
  "success": true,
  "message": "资料更新成功",
  "data": {
    "_id": "6761234567890abcdef12345",
    "phone": "13812345678",
    "nickname": "Terry",
    "height": 175,
    "weight": 70,
    "age": 25,
    "gender": "male"
  }
}
```

---

### 5.2 更新目标设置

**请求**
- **URL**: `/users/goals`
- **Method**: `PUT`
- **Headers**: `Authorization: Bearer <token>`
- **Content-Type**: `application/json`

**请求参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| dailyCalorieGoal | number | 否 | 每日热量目标(kcal) |
| dailyExerciseGoal | number | 否 | 每日运动时长目标(分钟) |
| weeklyDaysGoal | number | 否 | 每周运动天数目标(1-7) |

**请求示例**
```json
{
  "dailyCalorieGoal": 1500,
  "dailyExerciseGoal": 45,
  "weeklyDaysGoal": 5
}
```

**成功响应** (200)
```json
{
  "success": true,
  "message": "目标设置更新成功",
  "data": {
    "dailyCalorieGoal": 1500,
    "dailyExerciseGoal": 45,
    "weeklyDaysGoal": 5
  }
}
```

---

### 5.3 获取用户统计数据

**请求**
- **URL**: `/users/stats`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <token>`

**成功响应** (200)
```json
{
  "success": true,
  "data": {
    "streakDays": 12,
    "totalCaloriesBurned": 32500,
    "totalDistance": 285.5,
    "totalExerciseDays": 45,
    "achievements": [
      {
        "id": "first_exercise",
        "name": "初次运动",
        "icon": "🏃",
        "unlockedAt": "2024-11-01T10:00:00.000Z"
      },
      {
        "id": "7_day_streak",
        "name": "连续7天",
        "icon": "🔥",
        "unlockedAt": "2024-11-07T10:00:00.000Z"
      }
    ]
  }
}
```

---

## 6. 错误码说明

| 错误码 | 说明 |
|--------|------|
| 400 | 请求参数错误 |
| 401 | 未授权/Token无效 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 7. 通用响应格式

**成功响应**
```json
{
  "success": true,
  "message": "操作成功",
  "data": { ... }
}
```

**失败响应**
```json
{
  "success": false,
  "message": "错误信息描述"
}
```
