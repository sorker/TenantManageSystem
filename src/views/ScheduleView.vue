<template>
  <div class="schedule-container">
    <div class="header-actions">
      <el-button type="primary" @click="showAddDialog">
        新增日程
      </el-button>
      <el-select
        v-model="selectedType"
        placeholder="日程类型"
        style="width: 120px; margin-left: 16px;"
      >
        <el-option label="全部" value="" />
        <el-option label="收租" value="rent" />
        <el-option label="维修" value="maintenance" />
        <el-option label="其他" value="other" />
      </el-select>
    </div>

    <el-calendar v-model="currentDate">
      <template #dateCell="{ data }">
        <div class="calendar-cell">
          <p>{{ data.day.split('-').slice(2).join('') }}</p>
          <div v-if="isXiaoMan(data.day)" class="solar-term">小满</div>
          <div class="schedule-list">
            <el-tag
              v-for="schedule in getSchedulesForDate(data.day)"
              :key="schedule.id"
              :type="getTagType(schedule.type)"
              size="small"
              class="schedule-tag"
              @click="editSchedule(schedule)"
            >
              {{ schedule.title }}
              <div class="schedule-details" v-if="schedule.room_number">
                {{ schedule.location_name }} - {{ schedule.room_number }}
              </div>
            </el-tag>
          </div>
        </div>
      </template>
    </el-calendar>

    <!-- Add/Edit Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEditing ? '编辑日程' : '新增日程'"
      width="500px"
    >
      <el-form
        ref="formRef"
        :model="scheduleForm"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="标题" prop="title">
          <el-input v-model="scheduleForm.title" />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="scheduleForm.type" style="width: 100%;">
            <el-option label="收租" value="rent" />
            <el-option label="维修" value="maintenance" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期" prop="date">
          <el-date-picker
            v-model="scheduleForm.date"
            type="date"
            style="width: 100%;"
          />
        </el-form-item>
        <el-form-item label="时间" prop="time">
          <el-time-picker
            v-model="scheduleForm.time"
            format="HH:mm"
            style="width: 100%;"
          />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="scheduleForm.description"
            type="textarea"
            :rows="3"
          />
        </el-form-item>
        <el-form-item label="关联房间" prop="roomId">
          <el-select
            v-model="scheduleForm.roomId"
            placeholder="选择房间"
            style="width: 100%;"
          >
            <el-option
              v-for="room in rooms"
              :key="room.id"
              :label="`${room.location_name} - ${room.room_number}`"
              :value="room.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="交租方式" prop="payment_frequency">
          <el-select v-model="scheduleForm.payment_frequency">
            <el-option label="按月" value="monthly" />
            <el-option label="按半年" value="semi_annual" />
            <el-option label="按季" value="quarterly" />
            <el-option label="按年" value="yearly" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const loading = ref(false);
const currentDate = ref(new Date());
const selectedType = ref('');
const dialogVisible = ref(false);
const isEditing = ref(false);
const formRef = ref(null);
const schedules = ref([]);
const rooms = ref([]);

const scheduleForm = ref({
  title: '',
  type: 'other',
  date: new Date(),
  time: new Date(),
  description: '',
  roomId: null
});

const rules = {
  title: [{ required: true, message: '请输入日程标题', trigger: 'blur' }],
  type: [{ required: true, message: '请选择日程类型', trigger: 'change' }],
  date: [{ required: true, message: '请选择日期', trigger: 'change' }],
  time: [{ required: true, message: '请选择时间', trigger: 'change' }],
  description: [{ required: true, message: '请输入日程描述', trigger: 'blur' }]
};

const filteredSchedules = computed(() => {
  if (!selectedType.value) return schedules.value;
  return schedules.value.filter(schedule => schedule.type === selectedType.value);
});

onMounted(async () => {
  loading.value = true;
  try {
    await Promise.all([
      fetchSchedules(),
      fetchRooms()
    ]);
  } catch (error) {
    ElMessage.error('获取数据失败');
  } finally {
    loading.value = false;
  }
});

const fetchSchedules = async () => {
  loading.value = true;
  try {
    schedules.value = await window.electronAPI.getSchedules();
  } catch (error) {
    ElMessage.error('获取日程列表失败');
  } finally {
    loading.value = false;
  }
};

const fetchRooms = async () => {
  try {
    rooms.value = await window.electronAPI.getRooms();
  } catch (error) {
    ElMessage.error('获取房间列表失败');
  }
};

const getSchedulesForDate = (date) => {
  return filteredSchedules.value.filter(schedule => {
    const scheduleDate = new Date(schedule.date).toISOString().split('T')[0];
    return scheduleDate === date;
  });
};

const getTagType = (type) => {
  const types = {
    rent: 'danger',
    maintenance: 'warning',
    other: 'info'
  };
  return types[type] || 'info';
};

const showAddDialog = () => {
  isEditing.value = false;
  scheduleForm.value = {
    title: '',
    type: 'other',
    date: new Date(),
    time: new Date(),
    description: '',
    roomId: null
  };
  dialogVisible.value = true;
};

const editSchedule = (schedule) => {
  isEditing.value = true;
  scheduleForm.value = {
    ...schedule,
    date: new Date(schedule.date),
    time: new Date(schedule.date)
  };
  dialogVisible.value = true;
};

const submitForm = async () => {
  if (!formRef.value) return;
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        const date = new Date(scheduleForm.value.date);
        const time = new Date(scheduleForm.value.time);
        date.setHours(time.getHours(), time.getMinutes());
        
        const scheduleData = {
          ...scheduleForm.value,
          date: date.toISOString()
        };
        delete scheduleData.time;

        if (isEditing.value) {
          await window.electronAPI.updateSchedule(scheduleData);
          ElMessage.success('更新成功');
        } else {
          await window.electronAPI.addSchedule(scheduleData);
          ElMessage.success('添加成功');
        }
        dialogVisible.value = false;
        await fetchSchedules();
      } catch (error) {
        ElMessage.error(error.message);
      }
    }
  });
};

const deleteSchedule = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除这个日程吗？', '警告', {
      type: 'warning'
    });
    await window.electronAPI.deleteSchedule(id);
    ElMessage.success('删除成功');
    await fetchSchedules();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message);
    }
  }
};

const isXiaoMan = (dateStr) => {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1; // getMonth() 返回 0-11
  const day = date.getDate();
  
  return month === 5 && day === 10;
};
</script>

<style scoped>
.schedule-container {
  padding: 20px;
}

.header-actions {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.calendar-cell {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.calendar-cell p {
  margin: 0;
  text-align: right;
  font-size: 12px;
  color: #999;
}

.schedule-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
  overflow-y: auto;
  max-height: 120px;
}

.schedule-tag {
  cursor: pointer;
  width: 100%;
  text-align: left;
  padding: 4px 8px;
}

.schedule-details {
  font-size: 12px;
  color: #666;
  margin-top: 2px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.solar-term {
  color: #E6A23C;
  font-size: 12px;
  margin-bottom: 4px;
}
</style> 