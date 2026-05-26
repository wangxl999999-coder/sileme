# 死了么 - 每日签到报平安系统

一款面向老人群体的微信小程序，每日签到报平安，超时自动通知紧急联系人。

## 项目简介

「死了么」是一款极简的每日签到报平安系统。老人每天打开小程序即可自动签到，若连续48小时未签到，系统将自动向紧急联系人发送短信通知。同时支持SOS一键呼救功能，紧急时一键触发通知联系人。

## 核心功能

### 微信小程序端
- 📱 **极简签到** - 进入小程序自动完成签到，无需额外操作
- 🆘 **SOS呼救** - 长按红色按钮3秒触发，按优先级通知紧急联系人
- 👥 **联系人管理** - 添加、编辑、删除紧急联系人，设置通知方式和优先级
- 📊 **签到记录** - 查看历史签到记录和签到日历
- 👤 **个人中心** - 查看个人信息和签到状态

### 管理后台（Web端）
- 📊 **数据看板** - 实时监控用户状态，查看正常/注意/超时/SOS统计
- 👥 **用户管理** - 查看所有用户签到状态、最后在线时间
- 📝 **签到详情** - 查看用户签到日历、签到统计、最近SOS记录
- 👨‍👩‍👧 **联系人管理** - 管理用户的紧急联系人信息
- 🚨 **SOS记录** - 查看和处理所有SOS呼救记录
- 📱 **通知记录** - 查看所有短信通知发送记录

### 后端API
- 🔐 用户认证（微信登录/账号登录）
- ✅ 签到功能（自动签到、连续签到统计）
- 🆘 SOS呼救（触发、处理、历史记录）
- 👥 联系人管理（CRUD、测试通知）
- 📊 管理后台（用户列表、详情、统计）
- ⏰ 定时任务（48小时超时检测、自动短信通知）
- 📱 短信服务（阿里云短信集成）

## 技术栈

### 前端
- **微信小程序**: 原生小程序（WXML + WXSS + JavaScript）
- **管理后台**: Vue 3 + Element Plus + Vite + Pinia + ECharts

### 后端
- **运行环境**: Node.js
- **框架**: Express
- **数据库**: MongoDB + Mongoose
- **认证**: JWT (jsonwebtoken)
- **定时任务**: node-cron
- **短信服务**: 阿里云短信API
- **密码加密**: bcryptjs

## 项目结构

```
sileme/
├── miniprogram/              # 微信小程序
│   ├── pages/                # 页面
│   │   ├── index/            # 首页（签到 + SOS）
│   │   ├── sos/              # SOS页面
│   │   ├── contacts/         # 联系人管理
│   │   ├── contact-edit/     # 编辑联系人
│   │   ├── profile/          # 个人中心
│   │   ├── history/          # 签到历史
│   │   ├── about/            # 关于页面
│   │   └── admin/            # 管理后台相关
│   ├── app.js                # 小程序入口
│   ├── app.json              # 小程序配置
│   └── app.wxss              # 全局样式
├── admin/                    # Web管理后台
│   ├── src/
│   │   ├── views/            # 页面
│   │   │   ├── Login.vue     # 登录
│   │   │   ├── Layout.vue    # 布局
│   │   │   ├── Dashboard.vue # 数据看板
│   │   │   ├── Users.vue     # 用户管理
│   │   │   ├── UserDetail.vue# 用户详情
│   │   │   ├── Contacts.vue  # 联系人管理
│   │   │   ├── SOS.vue       # SOS记录
│   │   │   └── Notifications.vue # 通知记录
│   │   ├── stores/           # Pinia状态管理
│   │   ├── router/           # 路由配置
│   │   └── utils/            # 工具函数
│   ├── index.html
│   └── vite.config.js
├── server/                   # 后端服务
│   ├── config/               # 配置
│   ├── controllers/          # 控制器
│   ├── middleware/           # 中间件
│   ├── models/               # 数据模型
│   ├── routes/               # 路由
│   ├── services/             # 服务
│   ├── cron/                 # 定时任务
│   ├── scripts/              # 脚本
│   └── index.js              # 入口
└── package.json
```

## 快速开始

### 环境要求
- Node.js >= 14
- MongoDB >= 4.0
- 微信开发者工具（用于小程序开发）

### 安装与初始化

```bash
# 克隆项目
git clone <repository-url>
cd sileme

# 安装依赖
npm install

# 初始化数据库（创建管理员和测试数据）
npm run init
```

### 配置环境变量

复制 `server/.env.example` 为 `server/.env` 并修改配置：

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/sileme
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development

# 微信小程序配置
WX_APPID=your_wechat_appid
WX_SECRET=your_wechat_secret

# 短信服务配置 (阿里云短信)
ALIYUN_ACCESS_KEY_ID=your_aliyun_access_key
ALIYUN_ACCESS_KEY_SECRET=your_aliyun_secret
ALIYUN_SMS_SIGN_NAME=死了么
ALIYUN_SMS_TEMPLATE_CODE=SMS_123456789

# 超时时间配置 (小时)
INACTIVE_THRESHOLD_HOURS=48
```

### 启动服务

```bash
# 启动后端服务（开发模式，带热重载）
npm run dev

# 启动管理后台（开发模式）
npm run dev:admin

# 构建管理后台
npm run build

# 启动定时任务（独立进程）
npm run cron
```

### 小程序配置

1. 打开微信开发者工具
2. 导入项目，选择 `miniprogram` 目录
3. 在 `app.js` 中修改 `apiBaseUrl` 为你的后端地址
4. 编译运行

## 默认账号

初始化后可用以下账号登录：

| 角色 | 手机号 | 密码 |
|------|--------|------|
| 管理员 | 13800138000 | 123456 |
| 测试用户 | 13900139000 | 123456 |

## API文档

### 认证相关
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/wx-login | 微信登录 |
| POST | /api/auth/login | 账号登录 |
| POST | /api/auth/register | 注册 |
| GET | /api/auth/me | 获取当前用户 |
| PUT | /api/auth/profile | 更新个人信息 |

### 签到相关
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/checkin | 签到 |
| GET | /api/checkin/history | 签到历史 |
| GET | /api/checkin/stats | 签到统计 |

### SOS相关
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/sos/trigger | 触发SOS |
| PUT | /api/sos/:sosId/resolve | 处理SOS |
| GET | /api/sos | SOS记录列表 |
| GET | /api/sos/active | 活跃SOS列表 |

### 联系人相关
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/contacts | 联系人列表 |
| POST | /api/contacts | 添加联系人 |
| PUT | /api/contacts/:contactId | 更新联系人 |
| DELETE | /api/contacts/:contactId | 删除联系人 |
| POST | /api/contacts/:contactId/test | 测试通知 |

### 管理后台相关
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/admin/dashboard | 看板数据 |
| GET | /api/admin/users | 用户列表 |
| GET | /api/admin/users/:userId | 用户详情 |
| POST | /api/admin/users/:userId/manage | 操作用户 |
| GET | /api/notifications | 通知记录 |
| POST | /api/notifications/:notificationId/retry | 重发通知 |

## 部署指南

### 生产环境部署

1. **后端服务**
   ```bash
   cd server
   npm install --production
   pm2 start index.js --name sileme-server
   ```

2. **管理后台**
   ```bash
   cd admin
   npm install
   npm run build
   # 将 dist 目录部署到 Nginx 或其他静态服务器
   ```

3. **定时任务**
   ```bash
   pm2 start cron/scheduler.js --name sileme-cron
   ```

4. **小程序**
   - 在微信开发者工具中上传代码
   - 在微信公众平台提交审核发布

### Nginx配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 管理后台
    location / {
        root /var/www/sileme-admin/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API服务
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 隐私保护说明

本系统严格遵守隐私保护原则：

- 🚫 **不收集位置信息** - 不进行GPS定位，不获取用户位置
- 🚫 **不进行行为监控** - 不追踪用户行为，不收集使用数据
- ✅ **最小化数据收集** - 仅收集签到状态和必要的联系人信息
- ✅ **数据加密存储** - 密码使用bcrypt加密，通信使用HTTPS
- ✅ **用户自主控制** - 用户可随时删除联系人信息和签到记录

## 短信内容说明

### 超时提醒短信
```
我是{用户姓名}，我已经连续{天数}天没有活动了，请检查下我的状态。
```

### SOS呼救短信
```
紧急！{用户姓名}触发了SOS一键呼救，请立即联系确认！
```

### 测试通知短信
```
【死了么】测试通知：这是一条测试短信，{用户姓名}正在测试紧急联系人通知功能。
```

## License

MIT
