<template>
  <div class="facility-container">
    <!-- 顶部操作栏 -->
    <div class="operation-bar">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-input
            v-model="searchQuery"
            placeholder="搜索设施名称"
            clearable
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="4">
          <el-select v-model="selectedType" placeholder="设施类型" @change="handleTypeChange">
            <el-option label="全部" value="" />
            <el-option label="家具" value="furniture" />
            <el-option label="电器" value="appliance" />
            <el-option label="基础设施" value="infrastructure" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>新增设施
          </el-button>
        </el-col>
      </el-row>
    </div>

    <!-- 设施列表 -->
    <el-table
      v-loading="loading"
      :data="filteredFacilities"
      style="width: 100%"
      border
    >
      <el-table-column prop="name" label="设施名称" min-width="120" />
      <el-table-column prop="type" label="类型" width="100">
        <template #default="{ row }">
          <el-tag :type="getTypeTag(row.type)">
            {{ getTypeLabel(row.type) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="room_count" label="使用房间数" width="100">
        <template #default="{ row }">
          {{ row.room_count || 0 }}
        </template>
      </el-table-column>
      <el-table-column prop="usage_rate" label="使用率" width="150">
        <template #default="{ row }">
          <el-progress
            :percentage="row.usage_rate || 0"
            :status="getUsageStatus(row.usage_rate)"
          />
        </template>
      </el-table-column>
      <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button-group>
            <el-button type="primary" link @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button type="success" link @click="handleViewRooms(row)">
              查看房间
            </el-button>
            <el-button type="danger" link @click="handleDelete(row)">
              删除
            </el-button>
          </el-button-group>
        </template>
      </el-table-column>
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

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '新增设施' : '编辑设施'"
      width="500px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="80px"
      >
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="form.type" placeholder="请选择类型">
            <el-option label="家具" value="furniture" />
            <el-option label="电器" value="appliance" />
            <el-option label="基础设施" value="infrastructure" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 房间列表对话框 -->
    <el-dialog
      v-model="roomsDialogVisible"
      :title="`${currentFacility?.name || ''}的使用房间`"
      width="800px"
    >
      <el-table :data="facilityRooms" border>
        <el-table-column prop="room_number" label="房间号" width="100" />
        <el-table-column prop="location_name" label="位置" min-width="120" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getRoomStatusTag(row.status)">
              {{ getRoomStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="floor" label="楼层" width="80" />
        <el-table-column prop="area" label="面积(㎡)" width="100" />
        <el-table-column prop="price" label="价格(元/月)" width="120">
          <template #default="{ row }">
            ¥{{ row.price.toFixed(2) }}
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useFacilityStore } from '@/stores/facilityStore'
import { useRoomStore } from '@/stores/roomStore'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'

// Store
const facilityStore = useFacilityStore()
const roomStore = useRoomStore()

// 状态
const loading = ref(false)
const searchQuery = ref('')
const selectedType = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const dialogVisible = ref(false)
const dialogType = ref('add')
const formRef = ref(null)
const roomsDialogVisible = ref(false)
const currentFacility = ref(null)

// 表单数据
const form = ref({
  name: '',
  type: '',
  description: ''
})

// 表单验证规则
const rules = {
  name: [{ required: true, message: '请输入设施名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }]
}

// 计算属性
const filteredFacilities = computed(() => {
  let facilities = facilityStore.facilitiesWithStats

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    facilities = facilities.filter(facility => 
      facility.name.toLowerCase().includes(query)
    )
  }

  if (selectedType.value) {
    facilities = facilities.filter(facility => facility.type === selectedType.value)
  }

  return facilities
})

const facilityRooms = computed(() => 
  roomStore.rooms.filter(room => 
    room.facilities.some(f => f.id === currentFacility.value?.id)
  )
)

// 方法
const getTypeLabel = (type) => {
  const types = {
    furniture: '家具',
    appliance: '电器',
    infrastructure: '基础设施',
    other: '其他'
  }
  return types[type] || type
}

const getTypeTag = (type) => {
  const types = {
    furniture: 'success',
    appliance: 'warning',
    infrastructure: 'info',
    other: ''
  }
  return types[type] || ''
}

const getUsageStatus = (rate) => {
  if (rate >= 90) return 'exception'
  if (rate >= 70) return 'warning'
  return 'success'
}

const getRoomStatusLabel = (status) => {
  const statuses = {
    available: '空闲',
    occupied: '已租',
    maintenance: '维护中'
  }
  return statuses[status] || status
}

const getRoomStatusTag = (status) => {
  const statuses = {
    available: 'success',
    occupied: 'warning',
    maintenance: 'info'
  }
  return statuses[status] || ''
}

const handleSearch = () => {
  currentPage.value = 1
  fetchFacilities()
}

const handleTypeChange = () => {
  currentPage.value = 1
  fetchFacilities()
}

const handleSizeChange = (val) => {
  pageSize.value = val
  fetchFacilities()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchFacilities()
}

const handleAdd = () => {
  dialogType.value = 'add'
  form.value = {
    name: '',
    type: '',
    description: ''
  }
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogType.value = 'edit'
  form.value = { ...row }
  dialogVisible.value = true
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除这个设施吗？', '提示', {
      type: 'warning'
    })
    await facilityStore.deleteFacility(row.id)
    ElMessage.success('删除成功')
    fetchFacilities()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    if (dialogType.value === 'add') {
      await facilityStore.createFacility(form.value)
      ElMessage.success('创建成功')
    } else {
      await facilityStore.updateFacility(form.value.id, form.value)
      ElMessage.success('更新成功')
    }
    
    dialogVisible.value = false
    fetchFacilities()
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

const handleViewRooms = async (row) => {
  currentFacility.value = row
  await roomStore.fetchRooms()
  roomsDialogVisible.value = true
}

const fetchFacilities = async () => {
  loading.value = true
  try {
    await facilityStore.fetchFacilities()
    total.value = facilityStore.facilities.length
  } catch (error) {
    ElMessage.error('获取设施列表失败')
  } finally {
    loading.value = false
  }
}

// 初始化
onMounted(async () => {
  await fetchFacilities()
})
</script>

<style scoped>
.facility-container {
  padding: 20px;
}

.operation-bar {
  margin-bottom: 20px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style> 