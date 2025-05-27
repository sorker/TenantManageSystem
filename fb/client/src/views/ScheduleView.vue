<template>
  <div class="schedule-container">
    <!-- 顶部操作栏 -->
    <div class="operation-bar">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            @change="handleDateChange"
          />
        </el-col>
        <el-col :span="4">
          <el-select v-model="selectedType" placeholder="日程类型" @change="handleTypeChange">
            <el-option label="全部" value="" />
            <el-option label="维修" value="maintenance" />
            <el-option label="清洁" value="cleaning" />
            <el-option label="检查" value="inspection" />
            <el-option label="其他" value="other" />
          </el-select>
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
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>新增日程
          </el-button>
        </el-col>
      </el-row>
    </div>

    <!-- 日程列表 -->
    <el-table
      v-loading="loading"
      :data="filteredSchedules"
      style="width: 100%"
      border
    >
      <el-table-column prop="title" label="标题" min-width="120" />
      <el-table-column prop="type" label="类型" width="100">
        <template #default="{ row }">
          <el-tag :type="getTypeTag(row.type)">{{ getTypeLabel(row.type) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="date" label="日期" width="180">
        <template #default="{ row }">
          {{ formatDate(row.date) }}
        </template>
      </el-table-column>
      <el-table-column prop="location_name" label="位置" min-width="120" />
      <el-table-column prop="room_number" label="房间号" width="100" />
      <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button-group>
            <el-button type="primary" link @click="handleEdit(row)">
              编辑
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
      :title="dialogType === 'add' ? '新增日程' : '编辑日程'"
      width="500px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="80px"
      >
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="form.type" placeholder="请选择类型">
            <el-option label="维修" value="maintenance" />
            <el-option label="清洁" value="cleaning" />
            <el-option label="检查" value="inspection" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期" prop="date">
          <el-date-picker
            v-model="form.date"
            type="datetime"
            placeholder="选择日期时间"
          />
        </el-form-item>
        <el-form-item label="位置" prop="location_id">
          <el-select v-model="form.location_id" placeholder="请选择位置" @change="handleLocationSelect">
            <el-option
              v-for="location in locations"
              :key="location.id"
              :label="location.name"
              :value="location.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="房间" prop="room_id">
          <el-select v-model="form.room_id" placeholder="请选择房间">
            <el-option
              v-for="room in availableRooms"
              :key="room.id"
              :label="room.room_number"
              :value="room.id"
            />
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useScheduleStore } from '@/stores/scheduleStore'
import { useLocationStore } from '@/stores/locationStore'
import { useRoomStore } from '@/stores/roomStore'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import dayjs from 'dayjs'

// Store
const scheduleStore = useScheduleStore()
const locationStore = useLocationStore()
const roomStore = useRoomStore()

// 状态
const loading = ref(false)
const dateRange = ref([])
const selectedType = ref('')
const selectedLocation = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const dialogVisible = ref(false)
const dialogType = ref('add')
const formRef = ref(null)

// 表单数据
const form = ref({
  title: '',
  type: '',
  date: '',
  location_id: '',
  room_id: '',
  description: ''
})

// 表单验证规则
const rules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
  date: [{ required: true, message: '请选择日期', trigger: 'change' }],
  location_id: [{ required: true, message: '请选择位置', trigger: 'change' }],
  room_id: [{ required: true, message: '请选择房间', trigger: 'change' }]
}

// 计算属性
const locations = computed(() => locationStore.locations)
const availableRooms = computed(() => 
  roomStore.roomsByLocation(form.value.location_id)
)

const filteredSchedules = computed(() => {
  let schedules = scheduleStore.schedules

  if (dateRange.value && dateRange.value.length === 2) {
    schedules = scheduleStore.schedulesByDate(
      dateRange.value[0],
      dateRange.value[1]
    )
  }

  if (selectedType.value) {
    schedules = scheduleStore.schedulesByType(selectedType.value)
  }

  if (selectedLocation.value) {
    schedules = scheduleStore.schedulesByLocation(selectedLocation.value)
  }

  return schedules
})

// 方法
const formatDate = (date) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

const getTypeLabel = (type) => {
  const types = {
    maintenance: '维修',
    cleaning: '清洁',
    inspection: '检查',
    other: '其他'
  }
  return types[type] || type
}

const getTypeTag = (type) => {
  const types = {
    maintenance: 'warning',
    cleaning: 'success',
    inspection: 'info',
    other: ''
  }
  return types[type] || ''
}

const handleDateChange = () => {
  fetchSchedules()
}

const handleTypeChange = () => {
  fetchSchedules()
}

const handleLocationChange = () => {
  fetchSchedules()
}

const handleSizeChange = (val) => {
  pageSize.value = val
  fetchSchedules()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchSchedules()
}

const handleLocationSelect = () => {
  form.value.room_id = ''
}

const handleAdd = () => {
  dialogType.value = 'add'
  form.value = {
    title: '',
    type: '',
    date: '',
    location_id: '',
    room_id: '',
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
    await ElMessageBox.confirm('确定要删除这个日程吗？', '提示', {
      type: 'warning'
    })
    await scheduleStore.deleteSchedule(row.id)
    ElMessage.success('删除成功')
    fetchSchedules()
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
      await scheduleStore.createSchedule(form.value)
      ElMessage.success('创建成功')
    } else {
      await scheduleStore.updateSchedule(form.value.id, form.value)
      ElMessage.success('更新成功')
    }
    
    dialogVisible.value = false
    fetchSchedules()
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

const fetchSchedules = async () => {
  loading.value = true
  try {
    const params = {
      start_date: dateRange.value?.[0],
      end_date: dateRange.value?.[1],
      type: selectedType.value,
      location_id: selectedLocation.value,
      page: currentPage.value,
      page_size: pageSize.value
    }
    await scheduleStore.fetchSchedules(params)
    total.value = scheduleStore.schedules.length
  } catch (error) {
    ElMessage.error('获取日程列表失败')
  } finally {
    loading.value = false
  }
}

// 初始化
onMounted(async () => {
  await Promise.all([
    locationStore.fetchLocations(),
    roomStore.fetchRooms(),
    fetchSchedules()
  ])
})
</script>

<style scoped>
.schedule-container {
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