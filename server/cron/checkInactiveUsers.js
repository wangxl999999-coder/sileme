require('dotenv').config();

const mongoose = require('mongoose');
const moment = require('moment');
const connectDB = require('../config/database');
const User = require('../models/User');
const Contact = require('../models/Contact');
const Notification = require('../models/Notification');
const notificationService = require('../services/notificationService');

const INACTIVE_THRESHOLD_HOURS = parseInt(process.env.INACTIVE_THRESHOLD_HOURS || 48);
const REMINDER_INTERVAL_HOURS = 24;

async function checkInactiveUsers() {
  console.log(`\n[${new Date().toLocaleString('zh-CN')}] 开始检测不活跃用户...`);
  console.log(`超时阈值: ${INACTIVE_THRESHOLD_HOURS}小时`);

  try {
    const thresholdTime = moment()
      .subtract(INACTIVE_THRESHOLD_HOURS, 'hours')
      .toDate();

    const query = {
      status: { $nin: ['sos'] },
      $or: [
        { lastCheckIn: { $lt: thresholdTime } },
        { lastCheckIn: null }
      ]
    };

    const inactiveUsers = await User.find(query);
    
    console.log(`找到 ${inactiveUsers.length} 个可能需要通知的用户`);

    let notifiedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const user of inactiveUsers) {
      try {
        const lastCheckIn = user.lastCheckIn;
        let hoursSinceLastCheckIn;
        let daysInactive;

        if (lastCheckIn) {
          hoursSinceLastCheckIn = moment().diff(moment(lastCheckIn), 'hours');
          daysInactive = Math.floor(hoursSinceLastCheckIn / 24);
        } else {
          hoursSinceLastCheckIn = moment().diff(moment(user.createdAt), 'hours');
          daysInactive = Math.floor(hoursSinceLastCheckIn / 24);
        }

        if (hoursSinceLastCheckIn < INACTIVE_THRESHOLD_HOURS) {
          skippedCount++;
          continue;
        }

        const lastNotification = await Notification.findOne({
          userId: user._id,
          type: 'inactivity_alert',
          status: 'sent'
        }).sort({ createdAt: -1 });

        if (lastNotification) {
          const hoursSinceLastNotify = moment().diff(
            moment(lastNotification.createdAt),
            'hours'
          );
          
          if (hoursSinceLastNotify < REMINDER_INTERVAL_HOURS) {
            console.log(`  用户 ${user.nickname} (${user._id}): 已在 ${hoursSinceLastNotify.toFixed(1)} 小时前通知过，跳过`);
            skippedCount++;
            continue;
          }
        }

        console.log(`  正在通知用户: ${user.nickname} (${user._id})`);
        console.log(`    未签到时长: ${hoursSinceLastCheckIn.toFixed(1)}小时 (${daysInactive}天)`);
        console.log(`    最后签到: ${lastCheckIn ? lastCheckIn.toLocaleString('zh-CN') : '从未签到'}`);

        const contacts = await Contact.find({
          userId: user._id,
          enabled: true
        });

        if (contacts.length === 0) {
          console.log(`    ⚠️  没有配置紧急联系人，跳过`);
          skippedCount++;
          continue;
        }

        console.log(`    找到 ${contacts.length} 个紧急联系人`);

        const results = await notificationService.sendInactivityAlert(user, daysInactive);
        
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        console.log(`    通知结果: 成功 ${successCount} 条, 失败 ${failCount} 条`);

        if (successCount > 0) {
          notifiedCount++;
          
          if (user.status !== 'timeout') {
            user.status = 'timeout';
            await user.save();
          }
        } else {
          errorCount++;
        }

      } catch (userError) {
        console.error(`  ❌ 处理用户 ${user._id} 时出错:`, userError.message);
        errorCount++;
      }
    }

    console.log(`\n检测完成!`);
    console.log(`  总用户数: ${inactiveUsers.length}`);
    console.log(`  成功通知: ${notifiedCount}`);
    console.log(`  跳过: ${skippedCount}`);
    console.log(`  错误: ${errorCount}`);

  } catch (error) {
    console.error('❌ 检测不活跃用户失败:', error);
    if (require.main === module) {
      process.exit(1);
    }
    throw error;
  }

  if (require.main === module) {
    await mongoose.connection.close();
    console.log('数据库连接已关闭');
    process.exit(0);
  }
}

if (require.main === module) {
  connectDB().then(() => {
    checkInactiveUsers();
  }).catch(err => {
    console.error('❌ 数据库连接失败:', err);
    process.exit(1);
  });
}

module.exports = checkInactiveUsers;
