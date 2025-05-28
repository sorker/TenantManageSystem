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
import { useFacilityStore } from '../stores/facility';
import { usePropertyStore } from '../stores/property';

const facilityStore = useFacilityStore();
const propertyStore = usePropertyStore();

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
    facilities.value = await facilityStore.fetchFacilities();
  } catch (error) {
    ElMessage.error('获取设施列表失败');
  } finally {
    loading.value = false;
  }
};

const fetchFacilityUsage = async () => {
  try {
    const properties = await propertyStore.fetchProperties();
    const usage = {};
    properties.forEach(property => {
      if (property.facilities) {
        property.facilities.forEach(facility => {
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
        if (isEditing.value) {
          await facilityStore.updateFacility(facilityForm.value);
          ElMessage.success('更新成功');
        } else {
          await facilityStore.addFacility(facilityForm.value);
          ElMessage.success('添加成功');
        }
        
        await fetchFacilities();
        await fetchFacilityUsage();
        dialogVisible.value = false;
      } catch (error) {
        ElMessage.error(error.message || '操作失败');
      }
    }
  });
};

const deleteFacility = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除这个设施吗？', '警告', {
      type: 'warning'
    });
    await facilityStore.deleteFacility(id);
    ElMessage.success('删除成功');
    await fetchFacilities();
    await fetchFacilityUsage();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败');
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