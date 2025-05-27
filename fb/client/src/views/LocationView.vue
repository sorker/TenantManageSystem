<template>
  <div class="location-container">
    <!-- 顶部操作栏 -->
    <div class="operation-bar">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-input
            v-model="searchQuery"
            placeholder="搜索位置名称"
            clearable
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>新增位置
          </el-button>
        </el-col>
      </el-row>
    </div>

    <!-- 位置列表 -->
    <el-table
      v-loading="loading"
      :data="filteredLocations"
      style="width: 100%"
      border
    >
      <el-table-column prop="name" label="位置名称" min-width="120" />
      <el-table-column prop="address" label="地址" min-width="200" show-overflow-tooltip />
      <el-table-column prop="total_rooms" label="房间总数" width="100">
        <template #default="{ row }">
          {{ row.total_rooms || 0 }}
        </template>
      </el-table-column>
      <el-table-column prop="occupied_rooms" label="已租房间" width="100">
        <template #default="{ row }">
          {{ row.occupied_rooms || 0 }}
        </template>
      </el-table-column>
      <el-table-column prop="available_rooms" label="空闲房间" width="100">
        <template #default="{ row }">
          {{ row.available_rooms || 0 }}
        </template>
      </el-table-column>
      <el-table-column prop="occupancy_rate" label="入住率" width="100">
        <template #default="{ row }">
          <el-progress
            :percentage="row.occupancy_rate || 0"
            :status="getOccupancyStatus(row.occupancy_rate)"
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
      :title="dialogType === 'add' ? '新增位置' : '编辑位置'"
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
        <el-form-item label="地址" prop="address">
          <el-input v-model="form.address" />
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
      :title="`${currentLocation?.name || ''}的房间列表`"
      width="800px"
    >
      <el-table :data="locationRooms" border>
        <el-table-column prop="room_number" label="房间号" width="100" />
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
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useLocationStore } from '@/stores/locationStore'
import { useRoomStore } from '@/stores/roomStore'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'

// Store
const locationStore = useLocationStore()
const roomStore = useRoomStore()

// 状态
const loading = ref(false)
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const dialogVisible = ref(false)
const dialogType = ref('add')
const formRef = ref(null)
const roomsDialogVisible = ref(false)
const currentLocation = ref(null)

// 表单数据
const form = ref({
  name: '',
  address: '',
  description: ''
})

// 表单验证规则
const rules = {
  name: [{ required: true, message: '请输入位置名称', trigger: 'blur' }],
  address: [{ required: true, message: '请输入地址', trigger: 'blur' }]
}

// 计算属性
const filteredLocations = computed(() => {
  let locations = locationStore.locationsWithStats || []

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    locations = locations.filter(location => 
      location.name.toLowerCase().includes(query) ||
      location.address.toLowerCase().includes(query)
    )
  }

  return locations
})

const locationRooms = computed(() => 
  roomStore.roomsByLocation(currentLocation.value?.id)
)

// 方法
const getOccupancyStatus = (rate) => {
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
  fetchLocations()
}

const handleSizeChange = (val) => {
  pageSize.value = val
  fetchLocations()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchLocations()
}

const handleAdd = () => {
  dialogType.value = 'add'
  form.value = {
    name: '',
    address: '',
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
    await ElMessageBox.confirm('确定要删除这个位置吗？', '提示', {
      type: 'warning'
    })
    await locationStore.deleteLocation(row.id)
    ElMessage.success('删除成功')
    fetchLocations()
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
    
    // 准备提交的数据
    const submitData = {
      name: form.value.name.trim(),
      address: form.value.address.trim(),
      description: form.value.description?.trim() || ''
    }

    if (dialogType.value === 'add') {
      await locationStore.createLocation(submitData)
      ElMessage.success('创建成功')
    } else {
      await locationStore.updateLocation(form.value.id, submitData)
      ElMessage.success('更新成功')
    }
    
    dialogVisible.value = false
    await fetchLocations()
  } catch (error) {
    console.error('操作失败:', error)
    if (error.response?.data?.message) {
      ElMessage.error(error.response.data.message)
    } else if (error.message) {
      ElMessage.error(error.message)
    } else {
      ElMessage.error('操作失败，请检查输入数据是否正确')
    }
  }
}

const handleViewRooms = async (row) => {
  currentLocation.value = row
  await roomStore.fetchRooms()
  roomsDialogVisible.value = true
}

const fetchLocations = async () => {
  loading.value = true
  try {
    await locationStore.fetchLocations()
    total.value = locationStore.locations?.length || 0
  } catch (error) {
    console.error('获取位置列表失败:', error)
    ElMessage.error('获取位置列表失败')
    total.value = 0
  } finally {
    loading.value = false
  }
}

// 初始化
onMounted(async () => {
  try {
    loading.value = true
    await locationStore.fetchLocations()
    total.value = locationStore.locations?.length || 0
  } catch (error) {
    ElMessage.error('加载位置数据失败')
    console.error('Failed to load locations:', error)
    total.value = 0
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.location-container {
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