const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // useNewUrlParser 和 useUnifiedTopology 在新版本中已默认启用
    });
    
    // 监听数据库连接事件
    mongoose.connection.on('error', (err) => {
      // Connection error
    });

    mongoose.connection.on('disconnected', () => {
      // Connection disconnected
    });

    return conn;
  } catch (error) {
    process.exit(1);
  }
};

module.exports = connectDB;
