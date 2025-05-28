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
              :disabled="!!row.current_tenant_id"
              :title="row.current_tenant_id ? '有租客记录的房间不能删除' : ''"
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
import { usePropertyStore } from '../stores/property';

const router = useRouter();
const store = usePropertyStore();

// 状态变量
const loading = ref(false);
const dialogVisible = ref(false);
const isEditing = ref(false);
const formRef = ref(null);
const locationFilter = ref('');
const roomNumberFilter = ref('');
const facilityDetailsVisible = ref(false);
const currentFacility = ref(null);

// 数据
const properties = ref([]);
const locations = ref([]);
const availableFacilities = ref([]);

// 表单
const propertyForm = ref({
  location_id: '',
  room_number: '',
  floor: 1,
  facilities: []
});

// 表单验证规则
const rules = {
  location_id: [{ required: true, message: '请选择位置', trigger: 'change' }],
  room_number: [{ required: true, message: '请输入房间号', trigger: 'blur' }],
  floor: [{ required: true, message: '请输入楼层', trigger: 'blur' }]
};

// 计算属性
const filteredProperties = computed(() => {
  let filtered = properties.value;
  
  if (locationFilter.value) {
    filtered = filtered.filter(property => 
      property.location?.id === locationFilter.value
    );
  }
  
  if (roomNumberFilter.value) {
    filtered = filtered.filter(property => 
      property.room_number.includes(roomNumberFilter.value)
    );
  }
  
  return filtered;
});

// 数据获取方法
const fetchData = async () => {
  loading.value = true;
  try {
    const [propertiesData, locationsData, facilitiesData] = await Promise.all([
      store.fetchProperties(),
      store.fetchLocations(),
      store.fetchFacilities()
    ]);
    
    // 处理返回的数据，确保位置和设施信息正确
    properties.value = propertiesData.map(property => ({
      ...property,
      location_id: property.location?.id,
      location_name: property.location?.name,
      location_address: property.location?.address,
      facilities: property.facilities || []
    }));
    
    locations.value = locationsData;
    availableFacilities.value = facilitiesData;
    
    console.log('处理后的房屋数据:', properties.value);
    console.log('获取到的位置数据:', locationsData);
    console.log('获取到的设施数据:', facilitiesData);
  } catch (error) {
    console.error('获取数据失败:', error);
    ElMessage.error('获取数据失败');
  } finally {
    loading.value = false;
  }
};

// 方法
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
    location_id: property.location?.id || '',
    facilities: property.facilities ? property.facilities.map(f => f.id) : []
  };
  console.log('编辑时的表单数据:', propertyForm.value);
  dialogVisible.value = true;
};

const submitForm = async () => {
  if (!formRef.value) return;
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        // 确保数据格式正确
        const formData = {
          ...propertyForm.value,
          location_id: Number(propertyForm.value.location_id),
          facilities: Array.isArray(propertyForm.value.facilities) 
            ? propertyForm.value.facilities.map(id => Number(id))
            : []
        };
        
        console.log('提交的表单数据:', formData);
        
        if (isEditing.value) {
          const response = await store.updateProperty(formData);
          console.log('更新后的响应数据:', response);
          ElMessage.success('更新成功');
        } else {
          const response = await store.addProperty(formData);
          console.log('新增后的响应数据:', response);
          ElMessage.success('添加成功');
        }
        dialogVisible.value = false;
        await fetchData();
      } catch (error) {
        console.error('操作失败:', error);
        ElMessage.error(error.message || '操作失败');
      }
    }
  });
};

const deleteProperty = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除该房屋吗？', '提示', {
      type: 'warning'
    });
    await store.deleteProperty(id);
    ElMessage.success('删除成功');
    fetchData();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败');
    }
  }
};

const viewTenants = (propertyId) => {
  router.push({
    name: 'TenantView',
    query: { propertyId }
  });
};

const showFacilityDetails = (facility) => {
  currentFacility.value = facility;
  facilityDetailsVisible.value = true;
};

// 生命周期钩子
onMounted(() => {
  fetchData();
});

// 监听筛选条件变化
watch([locationFilter, roomNumberFilter], () => {
  fetchData();
});

// 监听表单数据变化
watch(propertyForm, (newVal) => {
  console.log('表单数据变化:', newVal);
}, { deep: true });
</script>

<style scoped>
.property-container {
  padding: 20px;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.filter-container {
  display: flex;
  gap: 16px;
}

.location-address {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.facility-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.facility-description {
  margin-top: 16px;
  color: #606266;
  line-height: 1.5;
}
</style> 