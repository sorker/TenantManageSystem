const { ipcMain, app } = require('electron');
const db = require('../database/init');
const path = require('path');
const fs = require('fs');

// 获取所有租客
ipcMain.handle('get-tenants', async () => {
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

// 更新租客合同图片
ipcMain.handle('update-tenant-contract-images', async (event, tenantId, images, deleteIds) => {
  try {
    // 如果有要删除的图片，先处理删除
    if (deleteIds && deleteIds.length > 0) {
      // 获取要删除的图片记录
      const imagesToDelete = await new Promise((resolve, reject) => {
        const placeholders = deleteIds.map(() => '?').join(',');
        db.all(
          `SELECT file_path FROM tenant_contract_images WHERE id IN (${placeholders})`,
          deleteIds,
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });

      // 删除文件
      imagesToDelete.forEach(img => {
        const fullPath = path.join(app.getPath('userData'), img.file_path);
        if (fs.existsSync(fullPath)) {
          try {
            fs.unlinkSync(fullPath);
          } catch (error) {
            console.error('Error deleting file:', error);
          }
        }
      });

      // 在数据库中标记为已删除
      await new Promise((resolve, reject) => {
        const placeholders = deleteIds.map(() => '?').join(',');
        db.run(
          `UPDATE tenant_contract_images SET is_deleted = 1 WHERE id IN (${placeholders})`,
          deleteIds,
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }
    
    // 插入新的合同图片
    if (images && images.length > 0) {
      // 创建租客专属目录
      const contractsDir = path.join(app.getPath('userData'), 'contracts');
      const tenantDir = path.join(contractsDir, tenantId.toString());
      fs.mkdirSync(tenantDir, { recursive: true });
      
      const values = await Promise.all(images.map(async (img, index) => {
        try {
          if (!img.url.startsWith('data:')) {
            return null;
          }

          const timestamp = Date.now();
          const uniqueFileName = `${timestamp}_${index + 1}_${img.name}`;
          const targetFilePath = path.join(tenantDir, uniqueFileName);
          
          const base64Data = img.url.replace(/^data:image\/\w+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          fs.writeFileSync(targetFilePath, buffer);
          
          const relativePath = path.join('contracts', tenantId.toString(), uniqueFileName);
          
          return [tenantId, img.name, relativePath, 'contract', 0];
        } catch (error) {
          console.error('Error processing image:', error);
          throw error;
        }
      }));

      const newValues = values.filter(Boolean);
      
      if (newValues.length > 0) {
        const placeholders = newValues.map(() => '(?, ?, ?, ?, ?)').join(',');
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO tenant_contract_images (tenant_id, name, file_path, type, is_deleted) VALUES ${placeholders}`,
            newValues.flat(),
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }
    }

    // 获取所有当前的图片
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM tenant_contract_images WHERE tenant_id = ? AND is_deleted = 0',
        [tenantId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map(row => ({
            id: row.id,
            name: row.name,
            url: row.file_path,
            type: row.type
          })));
        }
      );
    });
  } catch (error) {
    console.error('Error updating tenant contract images:', error);
    throw error;
  }
});

// 获取租客合同图片
ipcMain.handle('get-tenant-contract-images', async (event, tenantId) => {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM pragma_table_info('tenant_contract_images') WHERE name='is_deleted'", [], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      const query = rows.length > 0 ? 
        'SELECT * FROM tenant_contract_images WHERE tenant_id = ? AND is_deleted = 0 ORDER BY id' :
        'SELECT * FROM tenant_contract_images WHERE tenant_id = ? ORDER BY id';

      db.all(query, [tenantId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map(row => ({
            id: row.id,
            name: row.name,
            url: row.file_path,
            type: row.type
          })));
        }
      });
    });
  });
});

module.exports = {}; 