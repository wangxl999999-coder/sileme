require('dotenv').config();

const cron = require('node-cron');
const connectDB = require('../config/database');
const checkInactiveUsers = require('./checkInactiveUsers');

console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║     死了么 - 定时任务调度器                            ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
`);

connectDB().then(() => {
  console.log('✅ 数据库连接成功');
  console.log('⏰ 定时任务已启动');
  
  const cronExpression = process.env.CRON_SCHEDULE || '0 * * * *';
  
  console.log(`\n📅 检测任务执行计划:`);
  console.log(`   Cron表达式: ${cronExpression}`);
  console.log(`   说明: 每小时执行一次超时检测`);
  console.log(`   超时阈值: ${process.env.INACTIVE_THRESHOLD_HOURS || 48}小时\n`);

  cron.schedule(cronExpression, async () => {
    console.log(`\n[${new Date().toLocaleString('zh-CN')}] ⏰ 定时触发超时检测`);
    try {
      await checkInactiveUsers();
    } catch (error) {
      console.error('定时任务执行失败:', error);
    }
  });

  console.log('🚀 调度器正在运行，按 Ctrl+C 停止\n');

  if (process.env.RUN_ON_START === 'true') {
    console.log('🔄 启动时立即执行一次检测...');
    setTimeout(() => {
      checkInactiveUsers();
    }, 2000);
  }
}).catch(err => {
  console.error('❌ 数据库连接失败:', err);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n\n👋 正在停止定时任务...');
  process.exit(0);
});
