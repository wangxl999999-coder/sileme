require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Contact = require('../models/Contact');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sileme');
    console.log('数据库连接成功');
  } catch (error) {
    console.error('数据库连接失败:', error);
    process.exit(1);
  }
};

const initDatabase = async () => {
  console.log('\n📊 开始初始化数据库...\n');

  try {
    const adminPhone = '13800138000';
    const adminPassword = '123456';
    
    let adminUser = await User.findOne({ phone: adminPhone });
    
    if (adminUser) {
      console.log('✅ 管理员账号已存在');
    } else {
      adminUser = new User({
        phone: adminPhone,
        nickname: '系统管理员',
        password: adminPassword,
        isAdmin: true,
        status: 'active'
      });
      await adminUser.save();
      console.log('✅ 管理员账号创建成功');
      console.log(`   手机号: ${adminPhone}`);
      console.log(`   密码: ${adminPassword}`);
    }

    const testUserPhone = '13900139000';
    let testUser = await User.findOne({ phone: testUserPhone });
    
    if (!testUser) {
      testUser = new User({
        phone: testUserPhone,
        nickname: '测试老人',
        password: '123456',
        isAdmin: false,
        status: 'active',
        lastCheckIn: new Date(),
        checkInStreak: 7
      });
      await testUser.save();
      console.log('✅ 测试用户创建成功');
      console.log(`   手机号: ${testUserPhone}`);
      console.log(`   密码: 123456`);

      const contacts = [
        {
          userId: testUser._id,
          name: '张儿子',
          phone: '13700137000',
          relationship: 'child',
          priority: 10,
          notifyMethods: { sms: true, call: true, wechat: false },
          enabled: true
        },
        {
          userId: testUser._id,
          name: '李女儿',
          phone: '13600136000',
          relationship: 'child',
          priority: 9,
          notifyMethods: { sms: true, call: true, wechat: true },
          enabled: true
        },
        {
          userId: testUser._id,
          name: '王老伴',
          phone: '13500135000',
          relationship: 'spouse',
          priority: 8,
          notifyMethods: { sms: true, call: false, wechat: false },
          enabled: true
        }
      ];

      await Contact.insertMany(contacts);
      console.log('✅ 测试联系人创建成功 (3个)');

      if (adminUser.managedUsers) {
        adminUser.managedUsers.push(testUser._id);
      } else {
        adminUser.managedUsers = [testUser._id];
      }
      await adminUser.save();
      console.log('✅ 管理员已关联测试用户');
    } else {
      console.log('✅ 测试用户已存在');
    }

    console.log('\n🎉 数据库初始化完成!');
    console.log('\n📋 可用账号:');
    console.log('   管理员: 13800138000 / 123456');
    console.log('   测试用户: 13900139000 / 123456');
    console.log('\n');

  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    process.exit(1);
  } finally {
    mongoose.connection.close();
  }
};

connectDB().then(initDatabase);
