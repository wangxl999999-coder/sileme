require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

const authRoutes = require('./routes/authRoutes');
const checkInRoutes = require('./routes/checkInRoutes');
const sosRoutes = require('./routes/sosRoutes');
const contactRoutes = require('./routes/contactRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

connectDB();

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/checkin', checkInRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.use('*', (req, res) => {
  res.status(404).json({ message: '接口不存在' });
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║     死了么 - 每日签到报平安系统                        ║
║                                                       ║
║     服务器运行在: http://localhost:${PORT}              ║
║     环境: ${process.env.NODE_ENV || 'development'}     ║
║     启动时间: ${new Date().toLocaleString('zh-CN')}    ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);

  if (process.env.NODE_ENV === 'development') {
    console.log('\n📱 API接口列表:');
    console.log('  GET    /api/health        - 健康检查');
    console.log('  POST   /api/auth/wx-login - 微信登录');
    console.log('  POST   /api/auth/login    - 账号登录');
    console.log('  GET    /api/auth/me       - 获取当前用户');
    console.log('  POST   /api/checkin       - 签到');
    console.log('  GET    /api/checkin/history - 签到历史');
    console.log('  GET    /api/checkin/stats - 签到统计');
    console.log('  POST   /api/sos/trigger   - 触发SOS');
    console.log('  GET    /api/contacts      - 联系人列表');
    console.log('  POST   /api/contacts      - 添加联系人');
    console.log('  GET    /api/admin/dashboard - 管理看板');
    console.log('  GET    /api/admin/users   - 用户列表');
    console.log('');
  }
});

module.exports = app;
