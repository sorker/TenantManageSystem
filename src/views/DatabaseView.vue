<template>
  <div class="database-container">
    <div class="header-actions">
      <el-select
        v-model="selectedTable"
        placeholder="选择数据表"
        style="width: 200px;"
        @change="handleTableChange"
      >
        <el-option
          v-for="table in tables"
          :key="table"
          :label="table"
          :value="table"
        />
      </el-select>
      <el-button
        v-if="selectedTable"
        type="danger"
        @click="handleDeleteAllData"
        :loading="deleteLoading"
      >
        删除所有数据
      </el-button>
      <el-button
        v-if="selectedTable && selectedRows.length > 0"
        type="danger"
        @click="handleBatchDelete"
        :loading="batchDeleteLoading"
      >
        批量删除 ({{ selectedRows.length }})
      </el-button>
    </div>

    <div v-if="selectedTable" class="table-info">
      <h3>表结构</h3>
      <el-table
        :data="tableSchema"
        style="width: 100%; margin-bottom: 20px;"
      >
        <el-table-column prop="cid" label="序号" width="80" />
        <el-table-column prop="name" label="字段名" />
        <el-table-column prop="type" label="类型" />
        <el-table-column prop="notnull" label="非空">
          <template #default="{ row }">
            {{ row.notnull ? '是' : '否' }}
          </template>
        </el-table-column>
        <el-table-column prop="dflt_value" label="默认值" />
        <el-table-column prop="pk" label="主键">
          <template #default="{ row }">
            {{ row.pk ? '是' : '否' }}
          </template>
        </el-table-column>
      </el-table>

      <h3>表数据</h3>
      <el-table
        v-loading="loading"
        :data="tableData"
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column
          v-for="column in tableSchema"
          :key="column.name"
          :prop="column.name"
          :label="column.name"
        />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              type="danger"
              size="small"
              @click="handleDeleteRow(row)"
              :loading="row.deleting"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div v-else class="no-table-selected">
      <el-empty description="请选择一个数据表" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const loading = ref(false);
const deleteLoading = ref(false);
const batchDeleteLoading = ref(false);
const tables = ref([]);
const selectedTable = ref('');
const tableSchema = ref([]);
const tableData = ref([]);
const selectedRows = ref([]);

onMounted(async () => {
  await fetchTables();
});

const fetchTables = async () => {
  try {
    console.log('Checking electronAPI:', window.electronAPI);
    if (!window.electronAPI) {
      throw new Error('electronAPI is not available');
    }
    if (!window.electronAPI.getAllTables) {
      throw new Error('getAllTables method is not available');
    }
    console.log('Fetching tables...');
    const result = await window.electronAPI.getAllTables();
    console.log('Tables fetched successfully:', result);
    tables.value = result;
  } catch (error) {
    console.error('Error fetching tables:', error);
    ElMessage.error(`获取数据表列表失败: ${error.message}`);
  }
};

const handleTableChange = async (tableName) => {
  if (!tableName) return;
  
  loading.value = true;
  try {
    console.log('Fetching data for table:', tableName);
    const [schema, data] = await Promise.all([
      window.electronAPI.getTableSchema(tableName),
      window.electronAPI.getTableData(tableName)
    ]);
    
    console.log('Table schema:', schema);
    console.log('Table data:', data);
    
    tableSchema.value = schema;
    tableData.value = data;
  } catch (error) {
    console.error('Error fetching table data:', error);
    ElMessage.error(`获取表数据失败: ${error.message || '未知错误'}`);
  } finally {
    loading.value = false;
  }
};

const handleDeleteAllData = async () => {
  if (!selectedTable.value) return;
  
  try {
    await ElMessageBox.confirm(
      '确定要删除该表的所有数据吗？此操作不可恢复！',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    
    deleteLoading.value = true;
    await window.electronAPI.deleteAllData(selectedTable.value);
    ElMessage.success('数据删除成功');
    // 重新加载表数据
    await handleTableChange(selectedTable.value);
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Error deleting data:', error);
      ElMessage.error(`删除数据失败: ${error.message || '未知错误'}`);
    }
  } finally {
    deleteLoading.value = false;
  }
};

const handleDeleteRow = async (row) => {
  if (!selectedTable.value) return;
  
  try {
    await ElMessageBox.confirm(
      '确定要删除这条数据吗？此操作不可恢复！',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    
    // 设置该行的删除状态
    row.deleting = true;
    
    // 构建删除条件
    const conditions = tableSchema.value
      .filter(col => col.pk) // 只使用主键作为删除条件
      .map(col => ({
        column: col.name,
        value: row[col.name]
      }));
    
    await window.electronAPI.deleteRow(selectedTable.value, conditions);
    ElMessage.success('数据删除成功');
    // 重新加载表数据
    await handleTableChange(selectedTable.value);
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Error deleting row:', error);
      ElMessage.error(`删除数据失败: ${error.message || '未知错误'}`);
    }
  } finally {
    // 清除删除状态
    row.deleting = false;
  }
};

const handleSelectionChange = (selection) => {
  selectedRows.value = selection;
};

const handleBatchDelete = async () => {
  if (!selectedTable.value || selectedRows.value.length === 0) return;
  
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRows.value.length} 条数据吗？此操作不可恢复！`,
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    
    batchDeleteLoading.value = true;
    
    // 获取主键列
    const primaryKeys = tableSchema.value.filter(col => col.pk);
    if (primaryKeys.length === 0) {
      throw new Error('无法确定主键，无法执行批量删除');
    }
    
    // 为每一行构建删除条件
    const deletePromises = selectedRows.value.map(row => {
      const conditions = primaryKeys.map(pk => ({
        column: pk.name,
        value: row[pk.name]
      }));
      return window.electronAPI.deleteRow(selectedTable.value, conditions);
    });
    
    await Promise.all(deletePromises);
    ElMessage.success(`成功删除 ${selectedRows.value.length} 条数据`);
    // 重新加载表数据
    await handleTableChange(selectedTable.value);
    // 清空选择
    selectedRows.value = [];
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Error batch deleting rows:', error);
      ElMessage.error(`批量删除失败: ${error.message || '未知错误'}`);
    }
  } finally {
    batchDeleteLoading.value = false;
  }
};
</script>

<style scoped>
.database-container {
  padding: 20px;
}

.header-actions {
  margin-bottom: 20px;
}

.table-info {
  margin-top: 20px;
}

.table-info h3 {
  margin: 20px 0;
  font-weight: 500;
  color: #303133;
}

.no-table-selected {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
}
</style> 