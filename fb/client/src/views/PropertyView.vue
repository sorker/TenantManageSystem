<template>
  <div class="property-container">
    <!-- 顶部操作栏 -->
    <div class="operation-bar">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-input
            v-model="searchQuery"
            placeholder="搜索房间号"
            clearable
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="4">
          <el-select v-model="selectedLocation" placeholder="选择位置" @change="handleLocationChange">
            <el-option label="全部" value="" />
            <el-option
              v-for="location in locations"
              :key="location.id"
              :label="location.name"
              :value="location.id"
            />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="selectedStatus" placeholder="房间状态" @change="handleStatusChange">
            <el-option label="全部" value="" />
            <el-option label="空闲" value="available" />
            <el-option label="已租" value="occupied" />
            <el-option label="维护中" value="maintenance" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>新增房间
          </el-button>
        </el-col>
      </el-row>
    </div>

    <!-- 房间列表 -->
    <el-table
      v-loading="loading"
      :data="filteredRooms"
      style="width: 100%"
      border
    >
      <el-table-column prop="room_number" label="房间号" width="100" />
      <el-table-column prop="location_name" label="位置" min-width="120" />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="getStatusTag(row.status)">
            {{ getStatusLabel(row.status) }}
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
      <el-table-column prop="facilities" label="设施" min-width="200">
        <template #default="{ row }">
          <el-tag
            v-for="facility in row.facilities"
            :key="facility.id"
            class="facility-tag"
            size="small"
          >
            {{ facility.name }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button-group>
            <el-button type="primary" link @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button type="success" link @click="handleManageFacilities(row)">
              管理设施
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
      :title="dialogType === 'add' ? '新增房间' : '编辑房间'"
      width="500px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="80px"
      >
        <el-form-item label="房间号" prop="room_number">
          <el-input v-model="form.room_number" />
        </el-form-item>
        <el-form-item label="位置" prop="location_id">
          <el-select v-model="form.location_id" placeholder="请选择位置">
            <el-option
              v-for="location in locations"
              :key="location.id"
              :label="location.name"
              :value="location.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status" placeholder="请选择状态">
            <el-option label="空闲" value="available" />
            <el-option label="已租" value="occupied" />
            <el-option label="维护中" value="maintenance" />
          </el-select>
        </el-form-item>
        <el-form-item label="楼层" prop="floor">
          <el-input-number v-model="form.floor" :min="1" />
        </el-form-item>
        <el-form-item label="面积" prop="area">
          <el-input-number
            v-model="form.area"
            :precision="2"
            :step="1"
            :min="0"
          />
        </el-form-item>
        <el-form-item label="价格" prop="price">
          <el-input-number
            v-model="form.price"
            :precision="2"
            :step="100"
            :min="0"
          />
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

    <!-- 管理设施对话框 -->
    <el-dialog
      v-model="facilityDialogVisible"
      title="管理设施"
      width="500px"
    >
      <el-form label-width="80px">
        <el-form-item label="设施">
          <el-checkbox-group v-model="selectedFacilities">
            <el-checkbox
              v-for="facility in facilities"
              :key="facility.id"
              :label="facility.id"
            >
              {{ facility.name }}
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="facilityDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleFacilitySubmit">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoomStore } from '@/stores/roomStore'
import { useLocationStore } from '@/stores/locationStore'
import { useFacilityStore } from '@/stores/facilityStore'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'

// Store
const roomStore = useRoomStore()
const locationStore = useLocationStore()
const facilityStore = useFacilityStore()

// 状态
const loading = ref(false)
const searchQuery = ref('')
const selectedLocation = ref('')
const selectedStatus = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const dialogVisible = ref(false)
const dialogType = ref('add')
const formRef = ref(null)
const facilityDialogVisible = ref(false)
const selectedFacilities = ref([])
const currentRoom = ref(null)

// 表单数据
const form = ref({
  room_number: '',
  location_id: '',
  status: 'available',
  floor: 1,
  area: 0,
  price: 0,
  description: ''
})

// 表单验证规则
const rules = {
  room_number: [{ required: true, message: '请输入房间号', trigger: 'blur' }],
  location_id: [{ required: true, message: '请选择位置', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
  floor: [{ required: true, message: '请输入楼层', trigger: 'blur' }],
  area: [{ required: true, message: '请输入面积', trigger: 'blur' }],
  price: [{ required: true, message: '请输入价格', trigger: 'blur' }]
}

// 计算属性
const locations = computed(() => locationStore.locations)
const facilities = computed(() => facilityStore.facilities)

const filteredRooms = computed(() => {
  let rooms = roomStore.rooms

  if (searchQuery.value) {
    rooms = rooms.filter(room => 
      room.room_number.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  }

  if (selectedLocation.value) {
    rooms = rooms.filter(room => room.location_id === selectedLocation.value)
  }

  if (selectedStatus.value) {
    rooms = rooms.filter(room => room.status === selectedStatus.value)
  }

  return rooms
})

// 方法
const getStatusLabel = (status) => {
  const statuses = {
    available: '空闲',
    occupied: '已租',
    maintenance: '维护中'
  }
  return statuses[status] || status
}

const getStatusTag = (status) => {
  const statuses = {
    available: 'success',
    occupied: 'warning',
    maintenance: 'info'
  }
  return statuses[status] || ''
}

const handleSearch = () => {
  currentPage.value = 1
  fetchRooms()
}

const handleLocationChange = () => {
  currentPage.value = 1
  fetchRooms()
}

const handleStatusChange = () => {
  currentPage.value = 1
  fetchRooms()
}

const handleSizeChange = (val) => {
  pageSize.value = val
  fetchRooms()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchRooms()
}

const handleAdd = () => {
  dialogType.value = 'add'
  form.value = {
    room_number: '',
    location_id: '',
    status: 'available',
    floor: 1,
    area: 0,
    price: 0,
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
    await ElMessageBox.confirm('确定要删除这个房间吗？', '提示', {
      type: 'warning'
    })
    await roomStore.deleteRoom(row.id)
    ElMessage.success('删除成功')
    fetchRooms()
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
      await roomStore.createRoom(form.value)
      ElMessage.success('创建成功')
    } else {
      await roomStore.updateRoom(form.value.id, form.value)
      ElMessage.success('更新成功')
    }
    
    dialogVisible.value = false
    fetchRooms()
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

const handleManageFacilities = (row) => {
  currentRoom.value = row
  selectedFacilities.value = row.facilities.map(f => f.id)
  facilityDialogVisible.value = true
}

const handleFacilitySubmit = async () => {
  try {
    await roomStore.updateRoomFacilities(currentRoom.value.id, selectedFacilities.value)
    ElMessage.success('更新设施成功')
    facilityDialogVisible.value = false
    fetchRooms()
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

const fetchRooms = async () => {
  loading.value = true
  try {
    await roomStore.fetchRooms()
    total.value = roomStore.rooms.length
  } catch (error) {
    ElMessage.error('获取房间列表失败')
  } finally {
    loading.value = false
  }
}

// 初始化
onMounted(async () => {
  await Promise.all([
    locationStore.fetchLocations(),
    facilityStore.fetchFacilities(),
    fetchRooms()
  ])
})
</script>

<style scoped>
.property-container {
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

.facility-tag {
  margin-right: 5px;
  margin-bottom: 5px;
}
</style> 