<template>
  <div class="location-container">
    <div class="header-actions">
      <el-button type="primary" @click="showAddDialog">
        新增位置
      </el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="locations"
      style="width: 100%; margin-top: 20px;"
    >
      <el-table-column prop="name" label="位置名称" />
      <el-table-column prop="address" label="详细地址" show-overflow-tooltip />
      <el-table-column label="操作" width="200">
        <template #default="{ row }">
          <el-button-group>
            <el-button size="small" @click="editLocation(row)">编辑</el-button>
            <el-button 
              size="small" 
              type="danger" 
              @click="deleteLocation(row.id)"
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
      :title="isEditing ? '编辑位置' : '新增位置'"
      width="500px"
    >
      <el-form
        ref="formRef"
        :model="locationForm"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="位置名称" prop="name">
          <el-input v-model="locationForm.name" />
        </el-form-item>
        <el-form-item label="详细地址" prop="address">
          <el-input
            v-model="locationForm.address"
            type="textarea"
            :rows="3"
            placeholder="请输入详细地址"
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
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useLocationStore } from '../stores/location';

const store = useLocationStore();

const loading = ref(false);
const dialogVisible = ref(false);
const isEditing = ref(false);
const formRef = ref(null);
const locations = ref([]);

const locationForm = ref({
  name: '',
  address: ''
});

const rules = {
  name: [{ required: true, message: '请输入位置名称', trigger: 'blur' }],
  address: [{ required: true, message: '请输入详细地址', trigger: 'blur' }]
};

onMounted(async () => {
  await fetchLocations();
});

const fetchLocations = async () => {
  loading.value = true;
  try {
    const data = await store.fetchLocations();
    locations.value = data || [];
  } catch (error) {
    ElMessage.error('获取位置列表失败');
  } finally {
    loading.value = false;
  }
};

const showAddDialog = () => {
  isEditing.value = false;
  locationForm.value = {
    name: '',
    address: ''
  };
  dialogVisible.value = true;
};

const editLocation = (location) => {
  isEditing.value = true;
  locationForm.value = { ...location };
  dialogVisible.value = true;
};

const submitForm = async () => {
  if (!formRef.value) return;
  
  try {
    await formRef.value.validate();
    console.log('提交的表单数据:', locationForm.value);
    
    if (isEditing.value) {
      await store.updateLocation(locationForm.value);
      ElMessage.success('更新成功');
    } else {
      await store.addLocation(locationForm.value);
      ElMessage.success('添加成功');
    }
    
    await fetchLocations();
    dialogVisible.value = false;
  } catch (error) {
    console.error('操作失败:', error);
    ElMessage.error(error.message || '操作失败');
  }
};

const deleteLocation = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除这个位置吗？', '警告', {
      type: 'warning'
    });
    await store.deleteLocation(id);
    ElMessage.success('删除成功');
    await fetchLocations();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败');
    }
  }
};
</script>

<style scoped>
.location-container {
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