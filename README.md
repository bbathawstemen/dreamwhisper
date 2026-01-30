# Dreamwhisper 梦语者

一个基于 Web3 的梦境解析与分享社区平台。

## 功能特性

### 🌙 梦境解析
- 支持 DeepSeek、OpenAI、Gemini 多种 AI 模型
- 弗洛伊德心理学解析模式
- 周公解梦传统文化解析模式
- MBTI 人格结合分析
- 语音输入支持（中文）

### 🪐 同梦星球
- 匿名分享梦境漂流瓶
- 多种梦境主题分类（飞翔、坠落、追逐、水、重逢、迷路、考试、牙齿）
- 共鸣互动功能
- 评论交流功能
- 梦境灵感卡片

### 🔗 Web3 钱包集成
- 支持多种钱包：MetaMask、OKX、Coinbase、Bitget、TokenPocket、Trust、Phantom
- BSC 主网自动切换
- 钱包地址自动注册/登录
- 自定义头像和昵称

## 技术栈

### 前端
- 原生 HTML/CSS/JavaScript
- AOS 动画库
- Web Speech API（语音识别）

### 后端
- Node.js + Express
- SQLite 数据库
- RESTful API

### 部署
- Nginx 反向代理
- PM2 进程管理
- HTTPS/SSL

## 安装部署

### 1. 安装依赖
```bash
cd dream-app
npm install
```

### 2. 启动后端服务
```bash
# 开发模式
node server.js

# 生产模式（使用 PM2）
pm2 start server.js --name dreamwhisper-api
pm2 save
```

### 3. Nginx 配置
```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3000/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## API 接口

### 用户相关
- `POST /api/auth/wallet` - 钱包登录/注册
- `GET /api/user/:address` - 获取用户信息
- `PUT /api/user/:address` - 更新用户资料

### 梦境相关
- `GET /api/dreams` - 获取梦境列表
- `POST /api/dreams` - 发布梦境
- `GET /api/dreams/:id/comments` - 获取评论
- `POST /api/dreams/:id/comments` - 发表评论
- `POST /api/dreams/:id/resonance` - 切换共鸣
- `GET /api/dreams/:id/resonance/:address` - 检查共鸣状态

## 数据库结构

- `users` - 用户表（钱包地址、昵称、头像）
- `dreams` - 梦境表（内容、标签、类型、共鸣数）
- `comments` - 评论表
- `resonances` - 共鸣记录表

## 许可证

MIT License
