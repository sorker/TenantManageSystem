const { app, BrowserWindow, ipcMain, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const db = require('./src/database/init');

let mainWindow;
let isDatabaseReady = false;

// 注册自定义协议
app.whenReady().then(() => {
  protocol.registerFileProtocol('local-resource', (request, callback) => {
    const url = request.url.substr(16); // 移除 'local-resource://' 前缀
    try {
      const decodedUrl = decodeURIComponent(url);
      const filePath = path.join(__dirname, decodedUrl);
      console.log('Serving file:', filePath);
      
      // 验证文件是否存在
      if (!fs.existsSync(filePath)) {
        console.error('File does not exist:', filePath);
        return callback({ error: -2 });
      }
      
      return callback(filePath);
    } catch (error) {
      console.error('Error serving file:', error);
      return callback({ error: -2 });
    }
  });
});

// 确保项目根目录下的images文件夹存在
const imagesDir = path.join(__dirname, 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// 确保合同图片存储目录存在
const contractImagesDir = path.join(__dirname, 'images', 'contracts');
if (!fs.existsSync(contractImagesDir)) {
  fs.mkdirSync(contractImagesDir, { recursive: true });
}

// 监听数据库初始化完成事件
db.on('open', () => {
  isDatabaseReady = true;
  console.log('Database is ready for queries');
});

// 监听数据库错误
db.on('error', (err) => {
  console.error('Database error in main process:', err);
  isDatabaseReady = false;
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false,
      webSecurity: true
    }
  });

  // 设置 CSP 头
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: local-resource:; img-src 'self' data: blob: local-resource:;"
        ]
      }
    });
  });

  // 检查是否在开发模式下运行
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    console.log('Running in development mode');
    console.log('Preload script path:', path.join(__dirname, 'preload.js'));
    // 开发模式：加载 Vite 开发服务器
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    console.log('Running in production mode');
    // 生产模式：加载打包后的文件
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handlers for database operations
ipcMain.handle('get-tenants', async () => {
  if (!isDatabaseReady) {
    throw new Error('Database is not ready yet');
  }
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT t.*, r.room_number 
      FROM tenants t 
      LEFT JOIN rooms r ON t.room_id = r.id 
      WHERE t.is_deleted = 0
    `, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

// 新增租客
ipcMain.handle('add-tenant', async (event, tenant) => {
  if (!isDatabaseReady) {
    throw new Error('Database is not ready yet');
  }
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO tenants (
        name, phone, id_number, wechat_id, check_in_date, 
        rent_amount, payment_frequency, is_active,
        last_payment_date, room_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenant.name,
        tenant.phone,
        tenant.id_number,
        tenant.wechat_id,
        tenant.check_in_date,
        tenant.rent_amount,
        tenant.payment_frequency,
        tenant.is_active ? 1 : 0,
        tenant.last_payment_date ? new Date(tenant.last_payment_date).toISOString().split('T')[0] : null,
        tenant.room_id
      ],
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...tenant });
      }
    );
  });
});

// 更新租客
ipcMain.handle('update-tenant', async (event, tenant) => {
  if (!isDatabaseReady) {
    throw new Error('Database is not ready yet');
  }
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE tenants 
       SET name = ?, 
           phone = ?, 
           id_number = ?, 
           wechat_id = ?, 
           check_in_date = ?, 
           rent_amount = ?, 
           payment_frequency = ?, 
           is_active = ?,
           last_payment_date = ?,
           room_id = ?
       WHERE id = ?`,
      [
        tenant.name,
        tenant.phone,
        tenant.id_number,
        tenant.wechat_id,
        tenant.check_in_date,
        tenant.rent_amount,
        tenant.payment_frequency,
        tenant.is_active ? 1 : 0,
        tenant.last_payment_date ? new Date(tenant.last_payment_date).toISOString().split('T')[0] : null,
        tenant.room_id,
        tenant.id
      ],
      function(err) {
        if (err) reject(err);
        else resolve(tenant);
      }
    );
  });
});

// 删除租客（软删除）
ipcMain.handle('delete-tenant', async (event, id) => {
  if (!isDatabaseReady) {
    throw new Error('Database is not ready yet');
  }

  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE tenants SET is_deleted = 1 WHERE id = ?',
      [id],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
});

// 保存文件到文件系统并返回文件路径
const saveFileToDisk = (base64Data, fileName, directory) => {
  try {
    console.log('Saving file:', { fileName, directory });
    
    // 确保目录存在
    if (!fs.existsSync(directory)) {
      console.log('Creating directory:', directory);
      fs.mkdirSync(directory, { recursive: true });
    }

    const filePath = path.join(directory, fileName);
    console.log('Full file path:', filePath);

    // 移除base64数据的前缀（如果有的话）
    const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Image, 'base64');
    
    // 写入文件
    fs.writeFileSync(filePath, buffer);
    console.log('File saved successfully');

    // 验证文件是否真的被保存
    if (!fs.existsSync(filePath)) {
      throw new Error('File was not saved successfully');
    }

    // 返回相对路径
    const relativePath = path.relative(__dirname, filePath).replace(/\\/g, '/');
    console.log('Relative path:', relativePath);
    return relativePath;
  } catch (error) {
    console.error('Error saving file:', error);
    throw error;
  }
};

// 保存合同图片到images目录
ipcMain.handle('save-contract-image', async (event, imageData, fileName) => {
  try {
    // 确保images目录存在
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    // 生成唯一的文件名
    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}_${fileName}`;
    const tempFilePath = path.join(imagesDir, uniqueFileName);

    // 将base64图片数据保存到临时文件
    const buffer = Buffer.from(imageData.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    fs.writeFileSync(tempFilePath, buffer);

    // 返回临时文件路径
    return path.join('images', uniqueFileName);
  } catch (error) {
    console.error('保存合同图片失败:', error);
    throw error;
  }
});

// 更新租客合同图片
ipcMain.handle('update-tenant-contract-images', async (event, tenantId, images) => {
  if (!isDatabaseReady) {
    throw new Error('Database is not ready yet');
  }

  try {
    console.log('Updating contract images for tenant:', tenantId);
    console.log('Number of images:', images.length);

    // 软删除旧的合同图片
    await new Promise((resolve, reject) => {
      db.run('UPDATE tenant_contract_images SET is_deleted = 1 WHERE tenant_id = ?', [tenantId], (err) => {
        if (err) {
          console.error('Error soft deleting old contract images:', err);
          reject(err);
        } else {
          console.log('Old contract images soft deleted successfully');
          resolve();
        }
      });
    });
    
    // 插入新的合同图片
    if (images && images.length > 0) {
      // 创建租客专属目录
      const tenantDir = path.join(contractImagesDir, tenantId.toString());
      console.log('Creating tenant directory:', tenantDir);
      fs.mkdirSync(tenantDir, { recursive: true });
      
      const values = await Promise.all(images.map(async (img, index) => {
        try {
          // 生成唯一的文件名
          const timestamp = Date.now();
          const uniqueFileName = `${timestamp}_${index + 1}_${img.name}`;
          console.log('Processing image:', uniqueFileName);
          
          // 获取临时文件路径（从 images 目录）
          const tempFilePath = path.join(__dirname, 'images', path.basename(img.url));
          console.log('Temp file path:', tempFilePath);
          
          // 目标文件路径（在 contracts/{tenantId} 目录下）
          const targetFilePath = path.join(tenantDir, uniqueFileName);
          console.log('Target file path:', targetFilePath);
          
          // 确保源文件存在
          if (!fs.existsSync(tempFilePath)) {
            throw new Error(`Source file does not exist: ${tempFilePath}`);
          }
          
          // 移动文件
          fs.renameSync(tempFilePath, targetFilePath);
          console.log('Image moved successfully from', tempFilePath, 'to', targetFilePath);
          
          // 返回数据库记录
          const relativePath = path.relative(__dirname, targetFilePath).replace(/\\/g, '/');
          console.log('Relative path for database:', relativePath);
          
          return [tenantId, img.name, relativePath, 'contract', 0];
        } catch (error) {
          console.error('Error processing image:', error);
          throw error;
        }
      }));
      
      const placeholders = values.map(() => '(?, ?, ?, ?, ?)').join(',');
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO tenant_contract_images (tenant_id, name, file_path, type, is_deleted) VALUES ${placeholders}`,
          values.flat(),
          (err) => {
            if (err) {
              console.error('Error inserting contract images into database:', err);
              reject(err);
            } else {
              console.log('Contract images inserted into database successfully');
              resolve();
            }
          }
        );
      });

      const savedImages = values.map((value, index) => {
        const relativePath = value[2]; // 使用已经计算好的相对路径
        return {
          id: index + 1,
          name: value[1],
          url: `local-resource://${relativePath}`,
          type: 'contract'
        };
      });

      console.log('Returning saved images:', savedImages);
      return savedImages;
    }
    
    return [];
  } catch (error) {
    console.error('Error updating tenant contract images:', error);
    throw error;
  }
});

// 获取租客合同图片
ipcMain.handle('get-tenant-contract-images', async (event, tenantId) => {
  if (!isDatabaseReady) {
    throw new Error('Database is not ready yet');
  }
  return new Promise((resolve, reject) => {
    // First check if is_deleted column exists
    db.all("SELECT * FROM pragma_table_info('tenant_contract_images') WHERE name='is_deleted'", [], (err, rows) => {
      if (err) {
        console.error('Error checking for is_deleted column:', err);
        reject(err);
        return;
      }

      // If is_deleted column exists, use it in the query
      const query = rows.length > 0 ? 
        'SELECT * FROM tenant_contract_images WHERE tenant_id = ? AND is_deleted = 0 ORDER BY id' :
        'SELECT * FROM tenant_contract_images WHERE tenant_id = ? ORDER BY id';

      db.all(query, [tenantId], (err, rows) => {
        if (err) {
          console.error('Error fetching contract images:', err);
          reject(err);
        } else {
          console.log('Fetched contract images from database:', rows);
          const images = rows.map(row => {
            const relativePath = row.file_path.replace(/\\/g, '/');
            console.log('Processing image path:', relativePath);
            
            // 验证文件是否存在
            const fullPath = path.join(__dirname, row.file_path);
            if (!fs.existsSync(fullPath)) {
              console.error('Image file does not exist:', fullPath);
            }
            
            return {
              id: row.id,
              name: row.name,
              url: `local-resource://${relativePath}`,
              type: row.type
            };
          });
          console.log('Returning processed images:', images);
          resolve(images);
        }
      });
    });
  });
});

// 获取租客交租历史
ipcMain.handle('get-tenant-payment-history', async (event, tenantId) => {
  if (!isDatabaseReady) {
    throw new Error('Database is not ready yet');
  }
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM payment_history 
       WHERE tenant_id = ? 
       ORDER BY payment_date DESC`,
      [tenantId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
});

// 添加交租记录
ipcMain.handle('add-payment-record', async (event, payment) => {
  if (!isDatabaseReady) {
    throw new Error('Database is not ready yet');
  }
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO payment_history (
        tenant_id, payment_date, due_date, amount, payment_method, notes
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        payment.tenant_id,
        payment.payment_date,
        payment.due_date,
        payment.amount,
        payment.payment_method,
        payment.notes
      ],
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...payment });
      }
    );
  });
});

// 删除交租记录
ipcMain.handle('delete-payment-record', async (event, paymentId) => {
  if (!isDatabaseReady) {
    throw new Error('Database is not ready yet');
  }
  return new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM payment_history WHERE id = ?',
      [paymentId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
});

ipcMain.handle('get-rooms', async () => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        r.id,
        r.location_id,
        l.name as location_name,
        l.address as location_address,
        r.room_number,
        r.floor,
        GROUP_CONCAT(DISTINCT f.id) as facility_ids,
        GROUP_CONCAT(DISTINCT f.name) as facility_names,
        t.name as current_tenant_name,
        t.id as current_tenant_id
      FROM rooms r
      LEFT JOIN locations l ON r.location_id = l.id
      LEFT JOIN room_facilities rf ON r.id = rf.room_id
      LEFT JOIN facilities f ON rf.facility_id = f.id
      LEFT JOIN (
        SELECT id, name, room_id 
        FROM tenants 
        WHERE is_active = 1 AND is_deleted = 0
      ) t ON r.id = t.room_id
      GROUP BY r.id, r.location_id, l.name, l.address, r.room_number, r.floor, t.id, t.name
    `, [], (err, rows) => {
      if (err) {
        console.error('Error fetching rooms:', err);
        reject(err);
      } else {
        // Process the facility data
        const processedRows = rows.map(row => ({
          ...row,
          facilities: row.facility_ids ? row.facility_ids.split(',').map((id, index) => ({
            id: parseInt(id),
            name: row.facility_names.split(',')[index]
          })) : []
        }));
        console.log('Processed rooms:', processedRows);
        resolve(processedRows);
      }
    });
  });
});

// 获取所有设施
ipcMain.handle('get-facilities', async () => {
  if (!isDatabaseReady) {
    throw new Error('Database is not ready yet');
  }
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM facilities ORDER BY name', [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

// Property management handlers
ipcMain.handle('add-room', async (event, room) => {
  if (!isDatabaseReady) {
    throw new Error('Database is not ready yet');
  }
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO rooms (location_id, room_number, floor) VALUES (?, ?, ?)',
      [room.location_id, room.room_number, room.floor],
      function(err) {
        if (err) {
          console.error('Error adding room:', err);
          reject(err);
          return;
        }
        const roomId = this.lastID;
        // Add facilities if any
        if (room.facilities && room.facilities.length > 0) {
          const values = room.facilities.map(facilityId => [roomId, facilityId]);
          const placeholders = values.map(() => '(?, ?)').join(',');
          db.run(
            `INSERT INTO room_facilities (room_id, facility_id) VALUES ${placeholders}`,
            values.flat(),
            (err) => {
              if (err) {
                console.error('Error adding room facilities:', err);
                reject(err);
                return;
              }
              resolve(roomId);
            }
          );
        } else {
          resolve(roomId);
        }
      }
    );
  });
});

ipcMain.handle('update-room', async (event, room) => {
  if (!isDatabaseReady) {
    throw new Error('Database is not ready yet');
  }

  return new Promise((resolve, reject) => {
    // Wrap everything in a single transaction
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      // Update room basic info
      db.run(
        'UPDATE rooms SET location_id = ?, room_number = ?, floor = ? WHERE id = ?',
        [room.location_id, room.room_number, room.floor, room.id],
        (err) => {
          if (err) {
            console.error('Error updating room:', err);
            db.run('ROLLBACK');
            return reject(err);
          }

          // Delete existing facilities
          db.run('DELETE FROM room_facilities WHERE room_id = ?', [room.id], (err) => {
            if (err) {
              console.error('Error deleting room facilities:', err);
              db.run('ROLLBACK');
              return reject(err);
            }

            // Insert new facilities if any
            if (room.facilities && room.facilities.length > 0) {
              const values = room.facilities.map(facilityId => [room.id, facilityId]);
              const placeholders = values.map(() => '(?, ?)').join(',');
              
              db.run(
                `INSERT INTO room_facilities (room_id, facility_id) VALUES ${placeholders}`,
                values.flat(),
                (err) => {
                  if (err) {
                    console.error('Error inserting room facilities:', err);
                    db.run('ROLLBACK');
                    return reject(err);
                  }

                  // Commit and fetch updated room
                  db.run('COMMIT', (err) => {
                    if (err) {
                      console.error('Error committing transaction:', err);
                      db.run('ROLLBACK');
                      return reject(err);
                    }

                    // Fetch the updated room
                    db.all(`
                      SELECT r.*, 
                        l.name as location_name,
                        l.address as location_address,
                        GROUP_CONCAT(DISTINCT f.id) as facility_ids,
                        GROUP_CONCAT(DISTINCT f.name) as facility_names
                      FROM rooms r
                      LEFT JOIN locations l ON r.location_id = l.id
                      LEFT JOIN room_facilities rf ON r.id = rf.room_id
                      LEFT JOIN facilities f ON rf.facility_id = f.id
                      WHERE r.id = ?
                      GROUP BY r.id
                    `, [room.id], (err, rows) => {
                      if (err) {
                        console.error('Error fetching updated room:', err);
                        return reject(err);
                      }
                      if (rows.length === 0) {
                        return reject(new Error('Room not found after update'));
                      }
                      const updatedRoom = {
                        ...rows[0],
                        facilities: rows[0].facility_ids ? rows[0].facility_ids.split(',').map((id, index) => ({
                          id: parseInt(id),
                          name: rows[0].facility_names.split(',')[index]
                        })) : []
                      };
                      resolve(updatedRoom);
                    });
                  });
                }
              );
            } else {
              // If no facilities to add, commit and fetch updated room
              db.run('COMMIT', (err) => {
                if (err) {
                  console.error('Error committing transaction:', err);
                  db.run('ROLLBACK');
                  return reject(err);
                }

                // Fetch the updated room
                db.all(`
                  SELECT r.*, 
                    l.name as location_name,
                    l.address as location_address,
                    GROUP_CONCAT(DISTINCT f.id) as facility_ids,
                    GROUP_CONCAT(DISTINCT f.name) as facility_names
                  FROM rooms r
                  LEFT JOIN locations l ON r.location_id = l.id
                  LEFT JOIN room_facilities rf ON r.id = rf.room_id
                  LEFT JOIN facilities f ON rf.facility_id = f.id
                  WHERE r.id = ?
                  GROUP BY r.id
                `, [room.id], (err, rows) => {
                  if (err) {
                    console.error('Error fetching updated room:', err);
                    return reject(err);
                  }
                  if (rows.length === 0) {
                    return reject(new Error('Room not found after update'));
                  }
                  const updatedRoom = {
                    ...rows[0],
                    facilities: rows[0].facility_ids ? rows[0].facility_ids.split(',').map((id, index) => ({
                      id: parseInt(id),
                      name: rows[0].facility_names.split(',')[index]
                    })) : []
                  };
                  resolve(updatedRoom);
                });
              });
            }
          });
        }
      );
    });
  });
});

ipcMain.handle('delete-room', async (event, id) => {
  if (!isDatabaseReady) {
    throw new Error('Database is not ready yet');
  }

  return new Promise((resolve, reject) => {
    // 开始事务
    db.run('BEGIN TRANSACTION', (err) => {
      if (err) {
        console.error('Error beginning transaction:', err);
        reject(err);
        return;
      }

      // 删除房间设施关联
      db.run('DELETE FROM room_facilities WHERE room_id = ?', [id], (err) => {
        if (err) {
          console.error('Error deleting room facilities:', err);
          db.run('ROLLBACK', () => {
            reject(err);
          });
          return;
        }

        // 删除房间
        db.run('DELETE FROM rooms WHERE id = ?', [id], (err) => {
          if (err) {
            console.error('Error deleting room:', err);
            db.run('ROLLBACK', () => {
              reject(err);
            });
            return;
          }

          // 提交事务
          db.run('COMMIT', (err) => {
            if (err) {
              console.error('Error committing transaction:', err);
              reject(err);
            } else {
              resolve();
            }
          });
        });
      });
    });
  });
});

// 添加设施
ipcMain.handle('add-facility', async (event, facility) => {
  if (!isDatabaseReady) {
    throw new Error('Database is not ready yet');
  }
  return new Promise((resolve, reject) => {
    // 确保只传递必要的字段
    const facilityData = {
      name: facility.name,
      description: facility.description
    };

    db.run(
      'INSERT INTO facilities (name, description) VALUES (?, ?)',
      [facilityData.name, facilityData.description],
      function(err) {
        if (err) {
          console.error('Error adding facility:', err);
          reject(err);
        } else {
          // 返回一个简单的对象，只包含必要的字段
          resolve({
            id: this.lastID,
            name: facilityData.name,
            description: facilityData.description
          });
        }
      }
    );
  });
});

// 更新设施
ipcMain.handle('update-facility', async (event, facility) => {
  if (!isDatabaseReady) {
    throw new Error('Database is not ready yet');
  }
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE facilities SET name = ?, description = ? WHERE id = ?',
      [facility.name, facility.description, facility.id],
      function(err) {
        if (err) reject(err);
        else resolve(facility);
      }
    );
  });
});

// 删除设施
ipcMain.handle('delete-facility', async (event, id) => {
  if (!isDatabaseReady) {
    throw new Error('Database is not ready yet');
  }
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM facilities WHERE id = ?', [id], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
});

// 创建日程表
db.run(`
  CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    room_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
  )
`, (err) => {
  if (err) {
    console.error('Error creating schedules table:', err);
    db.emit('error', err);
    return;
  }
  console.log('schedules table created or already exists');
});

// 创建位置表
db.run(`
  CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`, (err) => {
  if (err) {
    console.error('Error creating locations table:', err);
    db.emit('error', err);
    return;
  }
  console.log('locations table created or already exists');
});

// 创建交租历史表
db.run(`
  CREATE TABLE IF NOT EXISTS payment_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    payment_date DATE NOT NULL,
    due_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
  )
`, (err) => {
  if (err) {
    console.error('Error creating payment_history table:', err);
    db.emit('error', err);
    return;
  }
  console.log('payment_history table created or already exists');
});

// 获取所有日程
ipcMain.handle('get-schedules', async () => {
  if (!isDatabaseReady) {
    throw new Error('Database is not ready yet');
  }
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT s.*, r.room_number, l.name as location_name,
             datetime(s.date) as date
      FROM schedules s
      LEFT JOIN rooms r ON s.room_id = r.id
      LEFT JOIN locations l ON r.location_id = l.id
      ORDER BY s.date DESC
    `, [], (err, rows) => {
      if (err) {
        console.error('Error fetching schedules:', err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

// 添加日程
ipcMain.handle('add-schedule', async (event, schedule) => {
  if (!isDatabaseReady) {
    throw new Error('Database is not ready yet');
  }
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO schedules (title, type, date, description, room_id) VALUES (?, ?, ?, ?, ?)',
      [schedule.title, schedule.type, schedule.date, schedule.description, schedule.room_id],
      function(err) {
        if (err) {
          console.error('Error adding schedule:', err);
          reject(err);
        } else {
          resolve({ id: this.lastID, ...schedule });
        }
      }
    );
  });
});

// 更新日程
ipcMain.handle('update-schedule', async (event, schedule) => {
  if (!isDatabaseReady) {
    throw new Error('Database is not ready yet');
  }
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE schedules SET title = ?, type = ?, date = ?, description = ?, room_id = ? WHERE id = ?',
      [schedule.title, schedule.type, schedule.date, schedule.description, schedule.room_id, schedule.id],
      function(err) {
        if (err) {
          console.error('Error updating schedule:', err);
          reject(err);
        } else {
          resolve(schedule);
        }
      }
    );
  });
});

// 删除日程
ipcMain.handle('delete-schedule', async (event, id) => {
  if (!isDatabaseReady) {
    throw new Error('Database is not ready yet');
  }
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM schedules WHERE id = ?', [id], (err) => {
      if (err) {
        console.error('Error deleting schedule:', err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
});

// 获取所有位置
ipcMain.handle('get-locations', async () => {
  if (!isDatabaseReady) {
    throw new Error('Database is not ready yet');
  }
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM locations ORDER BY name', [], (err, rows) => {
      if (err) {
        console.error('Error fetching locations:', err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

// 添加位置
ipcMain.handle('add-location', async (event, location) => {
  if (!isDatabaseReady) {
    throw new Error('Database is not ready yet');
  }
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO locations (name, address) VALUES (?, ?)',
      [location.name, location.address],
      function(err) {
        if (err) {
          console.error('Error adding location:', err);
          reject(err);
        } else {
          resolve({ id: this.lastID, ...location });
        }
      }
    );
  });
});

// 更新位置
ipcMain.handle('update-location', async (event, location) => {
  if (!isDatabaseReady) {
    throw new Error('Database is not ready yet');
  }
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE locations SET name = ?, address = ? WHERE id = ?',
      [location.name, location.address, location.id],
      function(err) {
        if (err) {
          console.error('Error updating location:', err);
          reject(err);
        } else {
          resolve(location);
        }
      }
    );
  });
});

// 删除位置
ipcMain.handle('delete-location', async (event, id) => {
  if (!isDatabaseReady) {
    throw new Error('Database is not ready yet');
  }
  return new Promise((resolve, reject) => {
    // 检查是否有房间使用此位置
    db.get('SELECT COUNT(*) as count FROM rooms WHERE location_id = ?', [id], (err, row) => {
      if (err) {
        console.error('Error checking location usage:', err);
        reject(err);
        return;
      }
      
      if (row.count > 0) {
        reject(new Error('无法删除：该位置已被房间使用'));
        return;
      }
      
      // 如果没有房间使用，则删除位置
      db.run('DELETE FROM locations WHERE id = ?', [id], (err) => {
        if (err) {
          console.error('Error deleting location:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
});

// 获取所有数据库表
ipcMain.handle('get-all-tables', async () => {
  if (!db) {
    console.error('Database connection is null');
    throw new Error('Database connection is not available');
  }

  if (!isDatabaseReady) {
    console.error('Database is not ready');
    throw new Error('Database is not ready yet');
  }

  return new Promise((resolve, reject) => {
    try {
      db.all(`
        SELECT name FROM sqlite_master 
        WHERE type='table' 
        AND name NOT LIKE 'sqlite_%'
      `, [], (err, tables) => {
        if (err) {
          console.error('Error getting tables:', err);
          reject(new Error(`Failed to get tables: ${err.message}`));
        } else {
          console.log('Tables found:', tables);
          resolve(tables.map(t => t.name));
        }
      });
    } catch (error) {
      console.error('Exception while getting tables:', error);
      reject(new Error(`Exception while getting tables: ${error.message}`));
    }
  });
});

// 获取表数据
ipcMain.handle('get-table-data', async (event, tableName) => {
  if (!db) {
    console.error('Database connection is null');
    throw new Error('Database connection is not available');
  }

  if (!isDatabaseReady) {
    console.error('Database is not ready');
    throw new Error('Database is not ready yet');
  }

  if (!tableName) {
    console.error('Table name is required');
    throw new Error('Table name is required');
  }

  return new Promise((resolve, reject) => {
    try {
      db.all(`SELECT * FROM ${tableName}`, [], (err, rows) => {
        if (err) {
          console.error('Error getting table data:', err);
          reject(new Error(`Failed to get table data: ${err.message}`));
        } else {
          console.log(`Data found for table ${tableName}:`, rows.length, 'rows');
          resolve(rows);
        }
      });
    } catch (error) {
      console.error('Exception while getting table data:', error);
      reject(new Error(`Exception while getting table data: ${error.message}`));
    }
  });
});

// 获取表结构
ipcMain.handle('get-table-schema', async (event, tableName) => {
  if (!db) {
    console.error('Database connection is null');
    throw new Error('Database connection is not available');
  }

  if (!isDatabaseReady) {
    console.error('Database is not ready');
    throw new Error('Database is not ready yet');
  }

  if (!tableName) {
    console.error('Table name is required');
    throw new Error('Table name is required');
  }

  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${tableName})`, [], (err, columns) => {
      if (err) {
        console.error('Error getting table schema:', err);
        reject(new Error('Failed to get table schema: ' + err.message));
      } else {
        console.log('Schema found for table ' + tableName + ':', columns);
        resolve(columns);
      }
    });
  });
});

// 获取单个房间信息
ipcMain.handle('get-room-by-id', async (event, id) => {
  if (!isDatabaseReady) {
    throw new Error('Database is not ready yet');
  }
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT r.*, 
        GROUP_CONCAT(f.id) as facility_ids,
        GROUP_CONCAT(f.name) as facility_names
      FROM rooms r
      LEFT JOIN room_facilities rf ON r.id = rf.room_id
      LEFT JOIN facilities f ON rf.facility_id = f.id
      WHERE r.id = ?
      GROUP BY r.id
    `, [id], (err, rows) => {
      if (err) {
        console.error('Error getting room by id:', err);
        reject(err);
      } else if (rows.length === 0) {
        resolve(null);
      } else {
        const row = rows[0];
        // Process the facility data
        const room = {
          ...row,
          facilities: row.facility_ids ? row.facility_ids.split(',').map((id, index) => ({
            id: parseInt(id),
            name: row.facility_names.split(',')[index]
          })) : []
        };
        resolve(room);
      }
    });
  });
});

// 删除单行数据
ipcMain.handle('delete-row', async (event, tableName, conditions) => {
  if (!isDatabaseReady) {
    throw new Error('Database is not ready yet');
  }

  return new Promise((resolve, reject) => {
    // 构建 WHERE 子句
    const whereClause = conditions
      .map(condition => `${condition.column} = ?`)
      .join(' AND ');
    
    const values = conditions.map(condition => condition.value);
    
    const query = `DELETE FROM ${tableName} WHERE ${whereClause}`;
    
    db.run(query, values, function(err) {
      if (err) reject(err);
      else resolve({ changes: this.changes });
    });
  });
});

// 删除表中所有数据
ipcMain.handle('delete-all-data', async (event, tableName) => {
  if (!isDatabaseReady) {
    throw new Error('Database is not ready yet');
  }

  return new Promise((resolve, reject) => {
    const query = `DELETE FROM ${tableName}`;
    
    db.run(query, [], function(err) {
      if (err) reject(err);
      else resolve({ changes: this.changes });
    });
  });
});

// 确保images目录存在
ipcMain.handle('ensure-images-directory', async () => {
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  return imagesDir;
});