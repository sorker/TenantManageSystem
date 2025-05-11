<template>
  <div class="property-container">
    <div class="header-actions">
      <el-button type="primary" @click="showAddDialog">
        新增房屋
      </el-button>
      <div class="filter-container">
        <el-select
          v-model="locationFilter"
          placeholder="选择地址"
          clearable
          style="width: 200px; margin-right: 16px;"
        >
          <el-option
            v-for="location in locations"
            :key="location.id"
            :label="location.name"
            :value="location.id"
          />
        </el-select>
        <el-input
          v-model="roomNumberFilter"
          placeholder="输入房间号"
          clearable
          style="width: 200px;"
        />
      </div>
    </div>

    <el-table
      v-loading="loading"
      :data="filteredProperties"
      style="width: 100%; margin-top: 20px;"
    >
      <el-table-column label="位置">
        <template #default="{ row }">
          <div>
            <div>{{ row.location_name }}</div>
            <div class="location-address">{{ row.location_address }}</div>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="room_number" label="房间号" />
      <el-table-column prop="floor" label="楼层" />
      <el-table-column label="当前租客">
        <template #default="{ row }">
          <el-tag :type="row.current_tenant_id ? 'success' : 'info'">
            {{ row.current_tenant_id ? row.current_tenant_name : '空置' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="设施">
        <template #default="{ row }">
          <div class="facility-tags">
            <el-tag 
              v-for="facility in row.facilities" 
              :key="facility.id"
              style="margin-right: 4px; margin-bottom: 4px;"
            >
              {{ facility.name }}
              <el-button
                v-if="facility.description"
                type="text"
                size="small"
                @click="showFacilityDetails(facility)"
                style="margin-left: 4px; padding: 0 4px;"
              >
                <el-icon><View /></el-icon>
              </el-button>
            </el-tag>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="280">
        <template #default="{ row }">
          <el-button-group>
            <el-button size="small" @click="editProperty(row)">编辑</el-button>
            <el-button 
              size="small" 
              type="danger" 
              @click="deleteProperty(row.id)"
            >
              删除
            </el-button>
            <el-button 
              size="small" 
              type="primary" 
              @click="viewTenants(row.id)"
            >
              查看租客
            </el-button>
          </el-button-group>
        </template>
      </el-table-column>
    </el-table>

    <!-- Add/Edit Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEditing ? '编辑房屋' : '新增房屋'"
      width="500px"
    >
      <el-form
        ref="formRef"
        :model="propertyForm"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="位置" prop="location_id">
          <el-select
            v-model="propertyForm.location_id"
            placeholder="选择位置"
            style="width: 100%"
          >
            <el-option
              v-for="location in locations"
              :key="location.id"
              :label="location.name"
              :value="location.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="房间号" prop="room_number">
          <el-input v-model="propertyForm.room_number" />
        </el-form-item>
        <el-form-item label="楼层" prop="floor">
          <el-input-number v-model="propertyForm.floor" :min="1" />
        </el-form-item>
        <el-form-item label="设施" prop="facilities">
          <el-select
            v-model="propertyForm.facilities"
            multiple
            placeholder="选择设施"
            style="width: 100%"
          >
            <el-option
              v-for="facility in availableFacilities"
              :key="facility.id"
              :label="facility.name"
              :value="facility.id"
            />
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

    <!-- Facility Details Dialog -->
    <el-dialog
      v-model="facilityDetailsVisible"
      title="设施详情"
      width="400px"
    >
      <div v-if="currentFacility">
        <h3>{{ currentFacility.name }}</h3>
        <p class="facility-description">{{ currentFacility.description || '暂无描述' }}</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useRouter } from 'vue-router';
import { View } from '@element-plus/icons-vue';

const router = useRouter();
const loading = ref(false);
const searchQuery = ref('');
const dialogVisible = ref(false);
const isEditing = ref(false);
const formRef = ref(null);
const properties = ref([]);
const locations = ref([]);
const availableFacilities = ref([]);
const facilityDetailsVisible = ref(false);
const currentFacility = ref(null);

const propertyForm = ref({
  location_id: '',
  room_number: '',
  floor: 1,
  facilities: []
});

const rules = {
  location_id: [{ required: true, message: '请选择位置', trigger: 'change' }],
  room_number: [{ required: true, message: '请输入房间号', trigger: 'blur' }],
  floor: [{ required: true, message: '请输入楼层', trigger: 'blur' }]
};

const locationFilter = ref('');
const roomNumberFilter = ref('');

// 修改筛选逻辑
const filteredProperties = computed(() => {
  let filtered = properties.value;
  
  if (locationFilter.value) {
    filtered = filtered.filter(property => 
      property.location_id === locationFilter.value
    );
  }
  
  if (roomNumberFilter.value) {
    filtered = filtered.filter(property => 
      property.room_number.includes(roomNumberFilter.value)
    );
  }
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(property => 
      property.location_name.toLowerCase().includes(query) ||
      property.room_number.toLowerCase().includes(query)
    );
  }
  
  return filtered;
});

onMounted(async () => {
  await Promise.all([
    fetchProperties(),
    fetchLocations(),
    fetchFacilities()
  ]);
});

const fetchProperties = async () => {
  loading.value = true;
  try {
    properties.value = await window.electronAPI.getRooms();
  } catch (error) {
    ElMessage.error('获取房屋列表失败');
  } finally {
    loading.value = false;
  }
};

const fetchLocations = async () => {
  try {
    locations.value = await window.electronAPI.getLocations();
  } catch (error) {
    console.error('获取位置列表失败:', error);
    ElMessage.error('获取位置列表失败');
  }
};

const fetchFacilities = async () => {
  try {
    availableFacilities.value = await window.electronAPI.getFacilities();
  } catch (error) {
    console.error('获取设施列表失败:', error);
    ElMessage.error('获取设施列表失败');
  }
};

const showAddDialog = () => {
  isEditing.value = false;
  propertyForm.value = {
    location_id: '',
    room_number: '',
    floor: 1,
    facilities: []
  };
  dialogVisible.value = true;
};

const editProperty = (property) => {
  isEditing.value = true;
  propertyForm.value = {
    ...property,
    facilities: property.facilities ? property.facilities.map(f => f.id) : [],
  };
  dialogVisible.value = true;
};

const submitForm = async () => {
  if (!formRef.value) return;
  
  try {
    await formRef.value.validate();
    
    // 确保 facilities 是简单的 ID 数组，并且没有重复
    const roomData = {
      ...propertyForm.value,
      facilities: [...new Set(propertyForm.value.facilities.map(f => typeof f === 'object' ? f.id : f))]
    };

    console.log('提交的数据:', roomData);

    if (isEditing.value) {
      const result = await window.electronAPI.updateRoom(roomData);
      console.log('更新结果:', result);
      
      if (!result) {
        throw new Error('更新失败: 操作返回空结果');
      }

      ElMessage.success('更新成功');
      await fetchProperties();
    } else {
      const result = await window.electronAPI.addRoom(roomData);
      console.log('添加结果原始数据:', result);
      
      if (!result) {
        throw new Error('添加失败: 后端返回空结果');
      }

      // 尝试从不同可能的数据结构中获取ID
      let roomId = null;
      if (typeof result === 'object') {
        roomId = result.id || result.data?.id || result.room?.id || result.result?.id;
        if (!roomId && typeof result === 'number') {
          roomId = result;
        }
      } else if (typeof result === 'number') {
        roomId = result;
      }

      if (!roomId) {
        throw new Error('添加失败: 返回数据中未找到房间ID');
      }

      ElMessage.success('添加成功');
      await fetchProperties();
    }
  } catch (error) {
    console.error('操作失败:', error);
    console.error('错误详情:', {
      message: error.message,
      stack: error.stack,
      data: error.data
    });
    ElMessage.error(error.message || '操作失败，请重试');
  } finally {
    // 无论成功还是失败，都重置表单和关闭对话框
    if (formRef.value) {
      formRef.value.resetFields();
    }
    dialogVisible.value = false;
  }
};

const deleteProperty = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除这个房屋吗？', '警告', {
      type: 'warning'
    });
    await window.electronAPI.deleteRoom(id);
    ElMessage.success('删除成功');
    await fetchProperties();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message);
    }
  }
};

const viewTenants = (roomId) => {
  router.push({ 
    path: '/tenants', 
    query: { roomId: roomId }
  });
};

const showFacilityDetails = (facility) => {
  currentFacility.value = facility;
  facilityDetailsVisible.value = true;
};
</script>

<style scoped>
.property-container {
  padding: 20px;
}

.header-actions {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.facility-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.facility-description {
  margin-top: 16px;
  color: #666;
  line-height: 1.6;
  white-space: pre-wrap;
}

.filter-container {
  display: flex;
  align-items: center;
  margin-left: 16px;
}

.location-address {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}
</style> 