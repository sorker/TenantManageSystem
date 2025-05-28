# 租户管理系统 - 服务端

基于 Node.js + Express + SQLite 的租户管理系统后端项目。

## 技术栈

- 🔧 Node.js - 运行环境
- 🚀 Express - Web 框架
- 💾 SQLite - 数据库
- 🔐 JWT - 身份认证
- 📝 Joi - 数据验证
- 🧪 Jest - 单元测试

## 开发环境要求

- Node.js >= 18.20.3
- npm >= 10.7.0

## 项目结构

```
server/
├── src/
│   ├── config/         # 配置文件
│   ├── controllers/    # 控制器
│   ├── models/         # 数据模型
│   ├── routes/         # 路由定义
│   ├── middlewares/    # 中间件
│   ├── utils/          # 工具函数
│   ├── validators/     # 数据验证
│   └── app.js          # 应用入口
├── tests/              # 测试文件
├── database/           # 数据库文件
└── package.json        # 项目依赖
```

## API 接口

### 租户管理

1. 租户信息
   - GET /api/tenants - 获取租户列表
   - POST /api/tenants - 创建租户
   - GET /api/tenants/:id - 获取租户详情
   - PUT /api/tenants/:id - 更新租户信息
   - DELETE /api/tenants/:id - 删除租户

2. 租约管理
   - GET /api/contracts - 获取租约列表
   - POST /api/contracts - 创建租约
   - GET /api/contracts/:id - 获取租约详情
   - PUT /api/contracts/:id - 更新租约
   - DELETE /api/contracts/:id - 删除租约

### 房间管理

1. 房间信息
   - GET /api/rooms - 获取房间列表
   - POST /api/rooms - 创建房间
   - GET /api/rooms/:id - 获取房间详情
   - PUT /api/rooms/:id - 更新房间信息
   - DELETE /api/rooms/:id - 删除房间

2. 房间状态
   - PUT /api/rooms/:id/status - 更新房间状态
   - GET /api/rooms/status - 获取房间状态统计

### 位置管理

1. 位置信息
   - GET /api/locations - 获取位置列表
   - POST /api/locations - 创建位置
   - GET /api/locations/:id - 获取位置详情
   - PUT /api/locations/:id - 更新位置信息
   - DELETE /api/locations/:id - 删除位置

2. 位置统计
   - GET /api/locations/:id/stats - 获取位置统计信息
   - GET /api/locations/stats - 获取所有位置统计

### 设施管理

1. 设施信息
   - GET /api/facilities - 获取设施列表
   - POST /api/facilities - 创建设施
   - GET /api/facilities/:id - 获取设施详情
   - PUT /api/facilities/:id - 更新设施信息
   - DELETE /api/facilities/:id - 删除设施

2. 设施关联
   - POST /api/rooms/:id/facilities - 添加房间设施
   - DELETE /api/rooms/:id/facilities/:facilityId - 移除房间设施

### 支付管理

1. 支付记录
   - GET /api/payments - 获取支付记录
   - POST /api/payments - 创建支付记录
   - GET /api/payments/:id - 获取支付详情
   - PUT /api/payments/:id - 更新支付记录
   - DELETE /api/payments/:id - 删除支付记录

2. 支付统计
   - GET /api/payments/stats - 获取支付统计
   - GET /api/payments/tenant/:id - 获取租户支付记录

## 开发指南

1. 安装依赖：
```bash
npm install
```

2. 启动开发服务器：
```bash
npm run dev
```

3. 构建生产版本：
```bash
npm run build
```

4. 运行测试：
```bash
# 运行所有测试
npm run test

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 查看测试覆盖率
npm run test:coverage
```

## 数据库设计

### 主要表结构

1. tenants（租户表）
   - id: 主键
   - name: 姓名
   - phone: 电话
   - status: 状态
   - created_at: 创建时间
   - updated_at: 更新时间

2. rooms（房间表）
   - id: 主键
   - room_number: 房间号
   - location_id: 位置ID
   - status: 状态
   - area: 面积
   - price: 价格
   - created_at: 创建时间
   - updated_at: 更新时间

3. facilities（设施表）
   - id: 主键
   - name: 名称
   - type: 类型
   - status: 状态
   - created_at: 创建时间
   - updated_at: 更新时间

4. payments（支付表）
   - id: 主键
   - tenant_id: 租户ID
   - amount: 金额
   - type: 类型
   - payment_date: 支付日期
   - created_at: 创建时间
   - updated_at: 更新时间

## 安全措施

1. 身份认证
   - JWT token 认证
   - 密码加密存储
   - 会话管理

2. 数据安全
   - 输入验证
   - SQL 注入防护
   - XSS 防护

3. 访问控制
   - 角色权限管理
   - API 访问限制
   - 敏感操作日志

## 性能优化

1. 数据库优化
   - 索引优化
   - 查询优化
   - 连接池管理

2. 缓存策略
   - 数据缓存
   - 查询缓存
   - 静态资源缓存

3. 并发处理
   - 异步处理
   - 队列管理
   - 负载均衡

## 部署

1. 环境要求
   - Node.js 环境
   - SQLite 数据库
   - PM2 进程管理

2. 部署步骤
   - 安装依赖
   - 配置环境变量
   - 启动服务

3. 监控维护
   - 日志管理
   - 性能监控
   - 错误追踪

## 注意事项

1. 开发规范
   - 遵循 RESTful API 设计规范
   - 使用 TypeScript 类型注解
   - 保持代码风格一致

2. 安全考虑
   - 定期更新依赖
   - 数据备份
   - 错误处理

3. 性能考虑
   - 避免 N+1 查询
   - 合理使用缓存
   - 优化数据库操作

## 贡献指南

1. Fork 项目
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License 