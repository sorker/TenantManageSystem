<template>
  <div class="schedule-list">
    <el-table
      v-loading="loading"
      :data="schedules"
      style="width: 100%"
    >
      <el-table-column prop="type" label="类型" width="100">
        <template #default="{ row }">
          <el-tag :type="getTypeTag(row.type)">
            {{ getTypeLabel(row.type) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="时间" width="180">
        <template #default="{ row }">
          <div>{{ formatDate(row.date) }}</div>
          <div class="time-text">{{ row.time }}</div>
        </template>
      </el-table-column>
      <el-table-column label="房间信息" min-width="200">
        <template #default="{ row }">
          <div v-if="getRoomInfo(row.room_id)">
            <div>{{ getRoomInfo(row.room_id).location_name }}</div>
            <div class="room-info">
              {{ getRoomInfo(row.room_id).floor }}层 - {{ getRoomInfo(row.room_id).room_number }}号
            </div>
          </div>
          <span v-else>未知房间</span>
        </template>
      </el-table-column>
      <el-table-column prop="description" label="描述" min-width="200" />
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button-group>
            <el-button 
              size="small" 
              type="primary"
              @click="$emit('edit', row)"
            >
              编辑
            </el-button>
            <el-button 
              size="small" 
              type="danger"
              @click="$emit('delete', row)"
            >
              删除
            </el-button>
          </el-button-group>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoomStore } from '@/stores/room';

const props = defineProps({
  schedules: {
    type: Array,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
});

defineEmits(['edit', 'delete']);

const roomStore = useRoomStore();

// 日程类型标签
const getTypeLabel = (type) => {
  const typeMap = {
    maintenance: '维修',
    cleaning: '清洁',
    inspection: '检查',
    other: '其他'
  };
  return typeMap[type] || type;
};

// 日程类型对应的标签类型
const getTypeTag = (type) => {
  const tagMap = {
    maintenance: 'warning',
    cleaning: 'success',
    inspection: 'info',
    other: ''
  };
  return tagMap[type] || '';
};

// 格式化日期
const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
};

// 获取房间信息
const getRoomInfo = (roomId) => {
  return roomStore.getRoomById(roomId);
};
</script>

<style scoped>
.schedule-list {
  margin-top: 16px;
}

.time-text {
  color: #909399;
  font-size: 12px;
}

.room-info {
  color: #606266;
  font-size: 12px;
  margin-top: 4px;
}
</style> 