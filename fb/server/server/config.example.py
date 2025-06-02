"""
服务器配置文件示例
请复制此文件为 config.py 并填入实际配置值
"""

# API配置
API_CONFIG = {
    'BASE_URL': 'https://example.com',  # 替换为实际的API地址
    'API_PREFIX': '/api',
}

# CORS配置
CORS_CONFIG = {
    'ALLOWED_ORIGINS': [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://example.com",  # 替换为实际的生产环境域名
    ],
    'ALLOWED_METHODS': [
        'DELETE',
        'GET',
        'OPTIONS',
        'PATCH',
        'POST',
        'PUT',
    ],
    'ALLOWED_HEADERS': [
        'accept',
        'accept-encoding',
        'authorization',
        'content-type',
        'dnt',
        'origin',
        'user-agent',
        'x-csrftoken',
        'x-requested-with',
    ]
}

# 应用配置
APP_CONFIG = {
    'NAME': '租户管理系统',
    'VERSION': '1.0.0',
    'DEBUG': False,  # 生产环境设置为 False
    'SECRET_KEY': 'your-secret-key-here',  # 替换为实际的密钥
} 