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
import { useDatabaseStore } from '../stores/database';

const store = useDatabaseStore();

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
    tables.value = await store.fetchTables();
  } catch (error) {
    ElMessage.error('获取数据表列表失败');
  }
};

const handleTableChange = async (tableName) => {
  if (!tableName) return;
  
  loading.value = true;
  try {
    const [schema, data] = await Promise.all([
      store.fetchTableSchema(tableName),
      store.fetchTableData(tableName)
    ]);
    
    tableSchema.value = schema;
    tableData.value = data;
  } catch (error) {
    ElMessage.error('获取表数据失败');
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
    await store.deleteAllData(selectedTable.value);
    ElMessage.success('数据删除成功');
    await handleTableChange(selectedTable.value);
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除数据失败');
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
    
    row.deleting = true;
    
    const conditions = tableSchema.value
      .filter(col => col.pk)
      .reduce((acc, col) => {
        acc[col.name] = row[col.name];
        return acc;
      }, {});
    
    await store.deleteRow(selectedTable.value, conditions);
    ElMessage.success('删除成功');
    await handleTableChange(selectedTable.value);
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  } finally {
    row.deleting = false;
  }
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
    
    const primaryKeys = tableSchema.value
      .filter(col => col.pk)
      .map(col => col.name);
    
    const conditions = selectedRows.value.map(row => 
      primaryKeys.reduce((acc, key) => {
        acc[key] = row[key];
        return acc;
      }, {})
    );
    
    await store.batchDeleteRows(selectedTable.value, conditions);
    ElMessage.success('批量删除成功');
    await handleTableChange(selectedTable.value);
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量删除失败');
    }
  } finally {
    batchDeleteLoading.value = false;
  }
};

const handleSelectionChange = (selection) => {
  selectedRows.value = selection;
};
</script>

<style scoped>
.database-container {
  padding: 20px;
}

.header-actions {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.table-info {
  margin-top: 20px;
}

.table-info h3 {
  margin-bottom: 16px;
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