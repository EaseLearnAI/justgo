const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // useNewUrlParser 和 useUnifiedTopology 在新版本中已默认启用
    });

    console.log(`✅ MongoDB 已连接: ${conn.connection.host}`);
    
    // 监听数据库连接事件
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB 连接错误:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB 连接已断开');
    });

    return conn;
  } catch (error) {
    console.error('❌ MongoDB 连接失败:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
