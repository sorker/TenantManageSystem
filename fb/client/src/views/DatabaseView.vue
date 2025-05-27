<template>
  <div class="database-container">
    <!-- 左侧表列表 -->
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card class="table-list-card">
          <template #header>
            <div class="card-header">
              <span>数据库表</span>
              <el-input
                v-model="tableSearchQuery"
                placeholder="搜索表"
                clearable
                size="small"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
            </div>
          </template>
          <el-menu
            :default-active="selectedTable"
            class="table-menu"
            @select="handleTableSelect"
          >
            <el-menu-item
              v-for="table in filteredTables"
              :key="table.name"
              :index="table.name"
            >
              <el-icon><Document /></el-icon>
              <span>{{ table.name }}</span>
            </el-menu-item>
          </el-menu>
        </el-card>
      </el-col>

      <!-- 右侧内容区 -->
      <el-col :span="18">
        <el-card v-if="selectedTable" class="content-card">
          <template #header>
            <div class="card-header">
              <span>{{ selectedTable }} 表信息</span>
              <el-button-group>
                <el-button type="primary" @click="activeTab = 'structure'">
                  表结构
                </el-button>
                <el-button type="primary" @click="activeTab = 'data'">
                  数据预览
                </el-button>
              </el-button-group>
            </div>
          </template>

          <!-- 表结构 -->
          <div v-if="activeTab === 'structure'" class="table-structure">
            <el-table :data="tableStructure" border>
              <el-table-column prop="name" label="字段名" min-width="120" />
              <el-table-column prop="type" label="类型" width="120" />
              <el-table-column prop="nullable" label="允许空" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.nullable ? 'info' : 'danger'" size="small">
                    {{ row.nullable ? '是' : '否' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="default" label="默认值" width="120" />
              <el-table-column prop="description" label="说明" min-width="200" />
            </el-table>
          </div>

          <!-- 数据预览 -->
          <div v-if="activeTab === 'data'" class="table-data">
            <el-table
              v-loading="loading"
              :data="tableData"
              border
              style="width: 100%"
            >
              <el-table-column
                v-for="column in tableColumns"
                :key="column"
                :prop="column"
                :label="column"
                min-width="120"
                show-overflow-tooltip
              />
            </el-table>

            <!-- 分页 -->
            <div class="pagination-container">
              <el-pagination
                v-model:current-page="currentPage"
                v-model:page-size="pageSize"
                :page-sizes="[10, 20, 50, 100]"
                :total="total"
                layout="total, sizes, prev, pager, next"
                @size-change="handleSizeChange"
                @current-change="handleCurrentChange"
              />
            </div>
          </div>
        </el-card>

        <el-empty v-else description="请选择一个表" />
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Document, Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

// API基础URL
const API_BASE_URL = 'http://localhost:3002/api/database'

// 状态
const loading = ref(false)
const tableSearchQuery = ref('')
const selectedTable = ref('')
const activeTab = ref('structure')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const tables = ref([])
const tableStructure = ref([])
const tableData = ref([])

// 计算属性
const filteredTables = computed(() => {
  if (!tableSearchQuery.value) return tables.value
  const query = tableSearchQuery.value.toLowerCase()
  return tables.value.filter(table => 
    table.name.toLowerCase().includes(query) ||
    table.description.toLowerCase().includes(query)
  )
})

const tableColumns = computed(() => {
  if (!tableData.value.length) return []
  return Object.keys(tableData.value[0])
})

// 方法
const fetchTables = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/tables/`)
    tables.value = response.data
  } catch (error) {
    console.error('Error fetching tables:', error)
    ElMessage.error(`获取数据表列表失败: ${error.message}`)
  }
}

const handleTableSelect = async (tableName) => {
  selectedTable.value = tableName
  activeTab.value = 'structure'
  await fetchTableData()
}

const handleSizeChange = (val) => {
  pageSize.value = val
  fetchTableData()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchTableData()
}

const fetchTableData = async () => {
  if (!selectedTable.value) return
  
  loading.value = true
  try {
    const [schemaResponse, dataResponse] = await Promise.all([
      axios.get(`${API_BASE_URL}/tables/${selectedTable.value}/schema/`),
      axios.get(`${API_BASE_URL}/tables/${selectedTable.value}/data/`, {
        params: {
          page: currentPage.value,
          page_size: pageSize.value
        }
      })
    ])
    
    tableStructure.value = schemaResponse.data
    tableData.value = dataResponse.data.items
    total.value = dataResponse.data.total
  } catch (error) {
    console.error('Error fetching table data:', error)
    ElMessage.error(`获取表数据失败: ${error.message || '未知错误'}`)
  } finally {
    loading.value = false
  }
}

// 初始化
onMounted(() => {
  fetchTables()
})
</script>

<style scoped>
.database-container {
  padding: 20px;
}

.table-list-card {
  height: calc(100vh - 140px);
}

.content-card {
  height: calc(100vh - 140px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-menu {
  border-right: none;
}

.table-structure,
.table-data {
  height: calc(100vh - 240px);
  overflow-y: auto;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

:deep(.el-menu-item) {
  display: flex;
  align-items: center;
  gap: 8px;
}

:deep(.el-card__body) {
  height: calc(100% - 55px);
  overflow-y: auto;
}
</style> 