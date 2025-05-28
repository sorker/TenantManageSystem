const request = require('supertest');
const { describe, it, expect } = require('@jest/globals');
const app = require('../src/index');

describe('应用基础测试', () => {
  it('服务器应该正常启动', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', '服务器运行正常');
  });

  it('404路由应该返回正确的状态码', async () => {
    const response = await request(app).get('/non-existent-route');
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('message', '未找到请求的资源');
  });
}); 