from django.test import TestCase, Client
from django.urls import reverse
from django.db import connection
import json

class DatabaseAPITestCase(TestCase):
    def setUp(self):
        self.client = Client()
        # 创建测试表
        with connection.cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS test_table (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT,
                    value INTEGER
                )
            """)
            # 插入测试数据
            cursor.execute("""
                INSERT INTO test_table (name, value) VALUES
                ('test1', 1),
                ('test2', 2)
            """)

    def test_get_tables(self):
        """测试获取数据库表列表"""
        url = reverse('database-tables')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertIn('tables', data)
        self.assertIsInstance(data['tables'], list)
        self.assertIn('test_table', data['tables'])

    def test_get_table_schema(self):
        """测试获取表结构"""
        url = reverse('table-schema', args=['test_table'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertIn('schema', data)
        schema = data['schema']
        self.assertEqual(len(schema), 3)  # id, name, value
        self.assertEqual(schema[0]['name'], 'id')
        self.assertEqual(schema[1]['name'], 'name')
        self.assertEqual(schema[2]['name'], 'value')

    def test_get_table_data(self):
        """测试获取表数据"""
        url = reverse('table-data', args=['test_table'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertIn('data', data)
        table_data = data['data']
        self.assertEqual(len(table_data), 2)
        self.assertEqual(table_data[0]['name'], 'test1')
        self.assertEqual(table_data[0]['value'], 1)
        self.assertEqual(table_data[1]['name'], 'test2')
        self.assertEqual(table_data[1]['value'], 2)

    def test_invalid_table(self):
        """测试无效表名"""
        url = reverse('table-schema', args=['non_existent_table'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 500)

    def tearDown(self):
        # 清理测试表
        with connection.cursor() as cursor:
            cursor.execute("DROP TABLE IF EXISTS test_table") 