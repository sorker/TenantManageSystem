<template>
  <div class="facility-container">
    <div class="header-actions">
      <el-button type="primary" @click="showAddDialog">
        新增设施
      </el-button>
      <el-input
        v-model="searchQuery"
        placeholder="搜索设施..."
        style="width: 200px; margin-left: 16px;"
      />
    </div>

    <el-table
      v-loading="loading"
      :data="filteredFacilities"
      style="width: 100%; margin-top: 20px;"
    >
      <el-table-column prop="name" label="设施名称" />
      <el-table-column prop="description" label="描述" />
      <el-table-column label="使用情况">
        <template #default="{ row }">
          <el-tag type="info">
            {{ getUsageCount(row.id) }} 个房间使用
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200">
        <template #default="{ row }">
          <el-button-group>
            <el-button size="small" @click="editFacility(row)">编辑</el-button>
            <el-button 
              size="small" 
              type="danger" 
              @click="deleteFacility(row.id)"
              :disabled="getUsageCount(row.id) > 0"
            >
              删除
            </el-button>
          </el-button-group>
        </template>
      </el-table-column>
    </el-table>

    <!-- Add/Edit Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEditing ? '编辑设施' : '新增设施'"
      width="500px"
    >
      <el-form
        ref="formRef"
        :model="facilityForm"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="设施名称" prop="name">
          <el-input v-model="facilityForm.name" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input 
            v-model="facilityForm.description"
            type="textarea"
            :rows="3"
          />
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
const searchQuery = ref('');
const dialogVisible = ref(false);
const isEditing = ref(false);
const formRef = ref(null);
const facilities = ref([]);
const facilityUsage = ref({});

const facilityForm = ref({
  name: '',
  description: ''
});

const rules = {
  name: [{ required: true, message: '请输入设施名称', trigger: 'blur' }],
  description: [{ required: true, message: '请输入设施描述', trigger: 'blur' }]
};

const filteredFacilities = computed(() => {
  if (!searchQuery.value) return facilities.value;
  const query = searchQuery.value.toLowerCase();
  return facilities.value.filter(facility => 
    facility.name.toLowerCase().includes(query) ||
    facility.description.toLowerCase().includes(query)
  );
});

onMounted(async () => {
  await fetchFacilities();
  await fetchFacilityUsage();
});

const fetchFacilities = async () => {
  loading.value = true;
  try {
    facilities.value = await window.electronAPI.getFacilities();
  } catch (error) {
    ElMessage.error('获取设施列表失败');
  } finally {
    loading.value = false;
  }
};

const fetchFacilityUsage = async () => {
  try {
    const rooms = await window.electronAPI.getRooms();
    const usage = {};
    rooms.forEach(room => {
      if (room.facilities) {
        room.facilities.forEach(facility => {
          usage[facility.id] = (usage[facility.id] || 0) + 1;
        });
      }
    });
    facilityUsage.value = usage;
  } catch (error) {
    ElMessage.error('获取设施使用情况失败');
  }
};

const getUsageCount = (facilityId) => {
  return facilityUsage.value[facilityId] || 0;
};

const showAddDialog = () => {
  isEditing.value = false;
  facilityForm.value = {
    name: '',
    description: ''
  };
  dialogVisible.value = true;
};

const editFacility = (facility) => {
  isEditing.value = true;
  facilityForm.value = { ...facility };
  dialogVisible.value = true;
};

const submitForm = async () => {
  if (!formRef.value) return;
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        // 创建一个只包含必要字段的对象
        const facilityData = {
          name: facilityForm.value.name,
          description: facilityForm.value.description
        };

        if (isEditing.value) {
          facilityData.id = facilityForm.value.id;
          await window.electronAPI.updateFacility(facilityData);
          ElMessage.success('更新成功');
        } else {
          console.log('Adding new facility:', facilityData);
          const newFacility = await window.electronAPI.addFacility(facilityData);
          console.log('Add facility response:', newFacility);
          
          if (!newFacility || !newFacility.id) {
            throw new Error('添加设施失败：返回数据无效');
          }

          // 验证新添加的设备是否成功保存
          const allFacilities = await window.electronAPI.getFacilities();
          console.log('All facilities after adding:', allFacilities);
          
          const addedFacility = allFacilities.find(f => f.id === newFacility.id);
          
          if (!addedFacility) {
            throw new Error('设备添加失败：无法在数据库中验证新添加的设备');
          }
          
          ElMessage.success('添加成功');
        }
        dialogVisible.value = false;
        await fetchFacilities();
      } catch (error) {
        console.error('Error in submitForm:', error);
        ElMessage.error(error.message || '操作失败，请重试');
      }
    }
  });
};

const deleteFacility = async (id) => {
  if (getUsageCount(id) > 0) {
    ElMessage.warning('该设施正在被使用，无法删除');
    return;
  }
  
  try {
    await ElMessageBox.confirm('确定要删除这个设施吗？', '警告', {
      type: 'warning'
    });
    await window.electronAPI.deleteFacility(id);
    ElMessage.success('删除成功');
    await fetchFacilities();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message);
    }
  }
};
</script>

<style scoped>
.facility-container {
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
</style> 