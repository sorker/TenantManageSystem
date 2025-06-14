# 租户管理系统 - 服务端

基于 Python + Django + SQLite 的租户管理系统后端项目。

## 技术栈

- 🐍 Python - 编程语言
- 🚀 Django - Web 框架
- 🔄 Django REST Framework - API 框架
- 💾 SQLite - 数据库
- 🔐 JWT - 身份认证
- 🧪 Pytest - 单元测试

## 开发环境要求

- Python >= 3.8
- Django >= 4.2.0
- Django REST Framework >= 3.14.0

## 项目结构

```
server/
├── manage.py           # Django 管理脚本
├── tenants/           # 租户应用
├── rooms/             # 房间应用
├── locations/         # 位置应用
├── facilities/        # 设施应用
├── payments/          # 支付应用
├── schedules/         # 排期应用
├── tests/             # 测试文件
├── data/              # 数据文件
├── logs/              # 日志文件
├── requirements.txt   # 项目依赖
└── Dockerfile         # Docker 配置
```

## API 接口

### 租户管理

1. 租户信息
   - GET /api/tenants/ - 获取租户列表
   - POST /api/tenants/ - 创建租户
   - GET /api/tenants/{id}/ - 获取租户详情
   - PUT /api/tenants/{id}/ - 更新租户信息
   - DELETE /api/tenants/{id}/ - 删除租户

### 房间管理

1. 房间信息
   - GET /api/rooms/ - 获取房间列表
   - POST /api/rooms/ - 创建房间
   - GET /api/rooms/{id}/ - 获取房间详情
   - PUT /api/rooms/{id}/ - 更新房间信息
   - DELETE /api/rooms/{id}/ - 删除房间

### 位置管理

1. 位置信息
   - GET /api/locations/ - 获取位置列表
   - POST /api/locations/ - 创建位置
   - GET /api/locations/{id}/ - 获取位置详情
   - PUT /api/locations/{id}/ - 更新位置信息
   - DELETE /api/locations/{id}/ - 删除位置

### 设施管理

1. 设施信息
   - GET /api/facilities/ - 获取设施列表
   - POST /api/facilities/ - 创建设施
   - GET /api/facilities/{id}/ - 获取设施详情
   - PUT /api/facilities/{id}/ - 更新设施信息
   - DELETE /api/facilities/{id}/ - 删除设施

### 支付管理

1. 支付记录
   - GET /api/payments/ - 获取支付记录
   - POST /api/payments/ - 创建支付记录
   - GET /api/payments/{id}/ - 获取支付详情
   - PUT /api/payments/{id}/ - 更新支付记录
   - DELETE /api/payments/{id}/ - 删除支付记录

## 开发指南

1. 创建虚拟环境：
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
```

2. 安装依赖：
```bash
pip install -r requirements.txt
```

3. 数据库迁移：
```bash
python manage.py makemigrations
python manage.py migrate
```

4. 启动开发服务器：
```bash
python manage.py runserver
```

5. 运行测试：
```bash
python manage.py test
```

## 数据库设计

### 主要模型

1. Tenant（租户模型）
   - id: 主键
   - name: 姓名
   - phone: 电话
   - status: 状态
   - created_at: 创建时间
   - updated_at: 更新时间

2. Room（房间模型）
   - id: 主键
   - room_number: 房间号
   - location: 外键关联位置
   - status: 状态
   - area: 面积
   - price: 价格
   - created_at: 创建时间
   - updated_at: 更新时间

3. Facility（设施模型）
   - id: 主键
   - name: 名称
   - type: 类型
   - status: 状态
   - created_at: 创建时间
   - updated_at: 更新时间

4. Payment（支付模型）
   - id: 主键
   - tenant: 外键关联租户
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
   - 权限管理
   - API 访问限制
   - 操作日志

## 性能优化

1. 数据库优化
   - 索引优化
   - 查询优化
   - 连接池管理

2. 缓存策略
   - Redis 缓存
   - 查询缓存
   - 静态资源缓存

3. 并发处理
   - 异步任务
   - Celery 队列
   - 负载均衡

## 部署

1. 环境要求
   - Python 3.8+
   - SQLite 数据库
   - Gunicorn 服务器

2. 部署步骤
   - 安装依赖
   - 配置环境变量
   - 收集静态文件
   - 启动服务

3. 监控维护
   - 日志管理
   - 性能监控
   - 错误追踪

## 注意事项

1. 开发规范
   - 遵循 PEP 8 编码规范
   - 使用类型注解
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