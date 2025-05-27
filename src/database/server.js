const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseServer {
  constructor(config = {}) {
    this.port = config.port || 3000;
    this.host = config.host || 'localhost';
    this.dbPath = config.dbPath || path.join(__dirname, 'tenant.db');
    this.app = express();
    this.server = null;
    this.db = null;
  }

  start() {
    // 创建数据库连接
    this.db = new sqlite3.Database(this.dbPath, (err) => {
      if (err) {
        console.error('Error connecting to database:', err);
        return;
      }
      console.log('Connected to SQLite database');
    });

    // 启用CORS
    this.app.use(cors());
    this.app.use(express.json());

    // 查询接口
    this.app.post('/query', (req, res) => {
      const { sql, params } = req.body;
      this.db.all(sql, params || [], (err, rows) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ result: rows });
      });
    });

    // 执行接口
    this.app.post('/exec', (req, res) => {
      const { sql, params } = req.body;
      this.db.run(sql, params || [], function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ 
          result: {
            lastID: this.lastID,
            changes: this.changes
          }
        });
      });
    });

    // 获取表结构接口
    this.app.get('/schema/:table', (req, res) => {
      const { table } = req.params;
      this.db.all(`PRAGMA table_info(${table})`, [], (err, columns) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ result: columns });
      });
    });

    // 获取所有表接口
    this.app.get('/tables', (req, res) => {
      this.db.all(`
        SELECT name FROM sqlite_master 
        WHERE type='table' 
        AND name NOT LIKE 'sqlite_%'
      `, [], (err, tables) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ result: tables.map(t => t.name) });
      });
    });

    // 启动服务器
    this.server = this.app.listen(this.port, this.host, () => {
      console.log(`Database server running at http://${this.host}:${this.port}`);
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
    }
    if (this.db) {
      this.db.close();
    }
  }
}

// 如果直接运行此文件，则启动服务器
if (require.main === module) {
  const server = new DatabaseServer();
  server.start();
}

module.exports = DatabaseServer; 