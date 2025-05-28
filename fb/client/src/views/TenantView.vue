<template>
  <div class="tenant-container">
    <div class="header-actions">
      <el-button type="primary" @click="showAddDialog">
        新增租客
      </el-button>
      <div class="filter-container">
        <el-select
          v-model="locationFilter"
          placeholder="选择地址"
          clearable
          style="width: 200px; margin-right: 16px;"
        >
          <el-option
            v-for="location in uniqueLocations"
            :key="location"
            :label="location"
            :value="location"
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
      :data="filteredTenants"
      style="width: 100%; margin-top: 20px;"
    >
      <el-table-column prop="name" label="姓名" />
      <el-table-column label="隐私信息" width="80">
        <template #default="{ row }">
          <el-button 
            size="small" 
            type="info"
            @click="showPrivacyInfo(row)"
          >
            查看
          </el-button>
        </template>
      </el-table-column>
      <el-table-column prop="check_in_date" label="入住时间" width="110">
        <template #default="{ row }">
          {{ row.check_in_date ? new Date(row.check_in_date).toLocaleDateString() : '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="rent_amount" label="租金" />
      <el-table-column prop="payment_frequency" label="交租方式">
        <template #default="{ row }">
          {{ getPaymentFrequencyLabel(row.payment_frequency) }}
        </template>
      </el-table-column>
      <el-table-column prop="last_payment_date" label="最后交租日期" width="140">
        <template #default="{ row }">
          <span :class="{ 'overdue-payment': row.isOverdue }">
            {{ row.last_payment_date ? new Date(row.last_payment_date).toLocaleDateString() : '未交租' }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="交租历史" width="180">
        <template #default="{ row }">
          <el-button-group>
            <el-button 
              size="small" 
              type="primary"
              @click="showPaymentHistory(row)"
            >
              查看
            </el-button>
            <el-button 
              size="small" 
              type="success"
              @click="showAddPaymentDialog(row)"
            >
              缴费
            </el-button>
            <el-button 
              size="small" 
              type="info"
              @click="goPrintPage(row)"
            >
              打印
            </el-button>
          </el-button-group>
        </template>
      </el-table-column>
      <el-table-column prop="room_id" label="房间号">
        <template #default="{ row }">
          {{ getRoomInfo(row.room_id) }}
        </template>
      </el-table-column>
      <el-table-column prop="is_active" label="状态">
        <template #default="{ row }">
          <el-tag :type="row.is_active ? 'success' : 'info'">
            {{ row.is_active ? '在租' : '已退租' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="合同" width="80">
        <template #default="{ row }">
          <el-button 
            size="small" 
            type="primary"
            @click="showContractImages(row)"
          >
            查看
          </el-button>
        </template>
      </el-table-column>
      <el-table-column label="操作" min-width="280">
        <template #default="{ row }">
          <el-button-group>
            <el-button size="small" @click="editTenant(row)">编辑</el-button>
            <el-button 
              size="small" 
              type="warning" 
              v-if="row.is_active"
              @click="terminateContract(row)"
            >
              退租
            </el-button>
            <el-button 
              size="small" 
              type="success" 
              v-if="!row.is_active"
              @click="renewContract(row)"
            >
              续租
            </el-button>
            <el-button 
              size="small" 
              type="danger" 
              v-if="isLatestPaymentRecord(row)"
              @click="deletePaymentRecord(row.id)"
              :disabled="!!row.last_payment_date"
              :title="row.last_payment_date ? '已有交租记录，不能删除' : ''"
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
      :title="isEditing ? '编辑租客' : '新增租客'"
      width="500px"
    >
      <el-form
        ref="formRef"
        :model="tenantForm"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="姓名" prop="name">
          <el-input v-model="tenantForm.name" />
        </el-form-item>
        <el-form-item label="电话" prop="phone">
          <el-input v-model="tenantForm.phone" />
        </el-form-item>
        <el-form-item label="身份证号" prop="id_number">
          <el-input v-model="tenantForm.id_number" />
        </el-form-item>
        <el-form-item label="微信号" prop="wechat_id">
          <el-input v-model="tenantForm.wechat_id" />
        </el-form-item>
        <el-form-item label="入住时间" prop="check_in_date">
          <el-date-picker
            v-model="tenantForm.check_in_date"
            type="date"
            placeholder="选择日期"
          />
        </el-form-item>
        <el-form-item label="租金" prop="rent_amount">
          <el-input-number v-model="tenantForm.rent_amount" :min="0" />
        </el-form-item>
        <el-form-item label="交租方式" prop="payment_frequency">
          <el-select v-model="tenantForm.payment_frequency">
            <el-option label="按月" value="monthly" />
            <el-option label="按半年" value="semi_annual" />
            <el-option label="按季" value="quarterly" />
            <el-option label="按年" value="yearly" />
          </el-select>
        </el-form-item>
        <el-form-item label="房间号" prop="room_id">
          <el-select v-model="tenantForm.room_id" placeholder="请选择房间">
            <el-option
              v-for="room in availableRooms"
              :key="room.id"
              :label="`${room.location_name} - ${room.room_number}`"
              :value="room.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="最后交租日期" prop="last_payment_date">
          <el-date-picker
            v-model="tenantForm.last_payment_date"
            type="date"
            placeholder="选择日期"
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

    <!-- Contract Images Dialog -->
    <el-dialog
      v-model="contractImagesVisible"
      title="合同文件"
      width="800px"
      class="contract-dialog"
    >
      <div class="contract-images-container">
        <div v-if="currentContractImages.length > 0" class="contract-preview">
          <el-carousel 
            :interval="4000" 
            type="card" 
            height="400px"
            indicator-position="outside"
            :autoplay="false"
          >
            <el-carousel-item v-for="image in currentContractImages" :key="image.id">
              <div class="image-container">
                <img 
                  :src="image.url" 
                  class="contract-image" 
                  @error="handleImageError"
                  :alt="image.name"
                />
                <div class="image-info">
                  <span class="image-name">{{ image.name }}</span>
                </div>
              </div>
            </el-carousel-item>
          </el-carousel>
        </div>
        <el-empty v-else description="暂无合同文件" />
      </div>
    </el-dialog>

    <!-- Privacy Info Dialog -->
    <el-dialog
      v-model="privacyInfoVisible"
      title="隐私信息"
      width="500px"
    >
      <div v-if="currentTenant" class="privacy-info">
        <p><strong>姓名：</strong>{{ currentTenant.name }}</p>
        <p><strong>电话：</strong>{{ currentTenant.phone }}</p>
        <p><strong>身份证号：</strong>{{ currentTenant.id_number }}</p>
        <p><strong>微信号：</strong>{{ currentTenant.wechat_id }}</p>
      </div>
    </el-dialog>

    <!-- Payment History Dialog -->
    <el-dialog
      v-model="paymentHistoryVisible"
      :title="`${currentTenant?.name || ''} 的缴费历史`"
      width="70%"
    >
      <div class="payment-history-content">
        <div class="payment-history-header">
          <div class="tenant-info">
            <p>房间号：{{ currentTenant?.room_number }}</p>
            <p>租金：{{ currentTenant?.rent_amount }}元/{{ getPaymentFrequencyLabel(currentTenant?.payment_frequency) }}</p>
          </div>
          <el-button type="primary" @click="showAddPaymentDialog">
            新增缴费
          </el-button>
        </div>
        
        <el-table :data="currentPaymentHistory" style="width: 100%">
          <el-table-column prop="payment_date" label="缴费日期" width="120">
            <template #default="{ row }">
              {{ new Date(row.payment_date).toLocaleDateString() }}
            </template>
          </el-table-column>
          <el-table-column prop="due_date" label="约定日期" width="120">
            <template #default="{ row }">
              {{ row.due_date ? new Date(row.due_date).toLocaleDateString() : '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="amount" label="金额" width="100">
            <template #default="{ row }">
              {{ row.amount }}元
            </template>
          </el-table-column>
          <el-table-column prop="payment_type" label="类型" width="100">
            <template #default="{ row }">
              {{ getPaymentTypeLabel(row.payment_type) }}
            </template>
          </el-table-column>
          <el-table-column prop="payment_method" label="方式" width="100">
            <template #default="{ row }">
              {{ getPaymentMethodLabel(row.payment_method) }}
            </template>
          </el-table-column>
          <el-table-column prop="notes" label="备注" min-width="120" />
          <el-table-column label="操作" width="80" fixed="right">
            <template #default="{ row }">
              <el-button 
                v-if="isLatestPaymentOfType(row)"
                type="danger" 
                size="small"
                @click="deletePaymentRecord(row.id)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>

    <!-- Add Payment Dialog -->
    <el-dialog
      v-model="addPaymentVisible"
      title="新增交租记录"
      width="90%"
    >
      <el-form
        ref="paymentFormRef"
        :model="paymentForm"
        :rules="paymentRules"
        label-width="100px"
      >
        <el-form-item label="交租日期" prop="payment_date">
          <el-date-picker
            v-model="paymentForm.payment_date"
            type="date"
            placeholder="选择日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="费用类别" prop="payment_type">
          <el-select v-model="paymentForm.payment_type" @change="handlePaymentTypeChange" style="width: 100%">
            <el-option label="租金" value="rent" />
            <el-option label="水费" value="water" />
            <el-option label="电费" value="electricity" />
            <el-option label="维修费" value="maintenance" />
          </el-select>
        </el-form-item>
        <el-form-item 
          label="约定交租日期" 
          prop="due_date"
          v-if="paymentForm.payment_type === 'rent'"
        >
          <el-date-picker
            v-model="paymentForm.due_date"
            type="date"
            placeholder="选择日期"
            :disabled="paymentForm.payment_type === 'rent'"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="金额" prop="amount">
          <div class="amount-input-group">
            <el-input-number 
              v-model="paymentForm.amount" 
              :min="0" 
              :precision="2"
              style="width: 100%"
            />
            <span v-if="paymentForm.payment_type === 'rent'" class="monthly-rent-hint">
              (月租:¥{{ currentTenant?.rent_amount || 0 }})
            </span>
          </div>
        </el-form-item>
        <el-form-item label="支付方式" prop="payment_method">
          <el-select v-model="paymentForm.payment_method" style="width: 100%">
            <el-option label="现金" value="cash" />
            <el-option label="微信" value="wechat" />
            <el-option label="支付宝" value="alipay" />
            <el-option label="银行转账" value="bank" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="notes">
          <el-input 
            v-model="paymentForm.notes"
            type="textarea"
            :rows="2"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="addPaymentVisible = false">取消</el-button>
          <el-button type="primary" @click="submitPayment">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useTenantStore } from '../stores/tenant';
import { ElMessage, ElMessageBox } from 'element-plus';

const router = useRouter();
const store = useTenantStore();

// 状态变量
const loading = ref(false);
const dialogVisible = ref(false);
const isEditing = ref(false);
const contractImagesVisible = ref(false);
const privacyInfoVisible = ref(false);
const paymentHistoryVisible = ref(false);
const addPaymentVisible = ref(false);
const currentTenant = ref(null);
const currentContractImages = ref([]);
const currentPaymentHistory = ref([]);
const locationFilter = ref('');
const roomNumberFilter = ref('');

// 表单相关
const formRef = ref(null);
const paymentFormRef = ref(null);
const tenantForm = ref({
  name: '',
  phone: '',
  id_number: '',
  wechat_id: '',
  check_in_date: '',
  rent_amount: 0,
  payment_frequency: 'monthly',
  room_id: '',
  last_payment_date: ''
});

const paymentForm = ref({
  payment_date: '',
  payment_type: 'rent',
  due_date: '',
  amount: 0,
  payment_method: 'cash',
  notes: ''
});

// 表单验证规则
const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入电话', trigger: 'blur' }],
  id_number: [{ required: true, message: '请输入身份证号', trigger: 'blur' }],
  check_in_date: [{ required: true, message: '请选择入住时间', trigger: 'change' }],
  rent_amount: [{ required: true, message: '请输入租金', trigger: 'blur' }],
  payment_frequency: [{ required: true, message: '请选择交租方式', trigger: 'change' }],
  room_id: [{ required: true, message: '请选择房间', trigger: 'change' }]
};

const paymentRules = {
  payment_date: [{ required: true, message: '请选择交租日期', trigger: 'change' }],
  payment_type: [{ required: true, message: '请选择费用类别', trigger: 'change' }],
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }],
  payment_method: [{ required: true, message: '请选择支付方式', trigger: 'change' }]
};

// 计算属性
const uniqueLocations = computed(() => {
  return store.uniqueLocations;
});

const availableRooms = computed(() => {
  return store.availableRooms;
});

const filteredTenants = computed(() => {
  let tenants = store.tenants;
  
  if (locationFilter.value) {
    tenants = tenants.filter(t => {
      const room = store.getRoomById(t.room_id);
      return room?.location_name === locationFilter.value;
    });
  }
  
  if (roomNumberFilter.value) {
    tenants = tenants.filter(t => {
      const room = store.getRoomById(t.room_id);
      return room?.room_number.includes(roomNumberFilter.value);
    });
  }
  
  return tenants;
});

// 方法
const showAddDialog = () => {
  isEditing.value = false;
  tenantForm.value = {
    name: '',
    phone: '',
    id_number: '',
    wechat_id: '',
    check_in_date: '',
    rent_amount: 0,
    payment_frequency: 'monthly',
    room_id: '',
    last_payment_date: ''
  };
  dialogVisible.value = true;
};

const editTenant = (tenant) => {
  isEditing.value = true;
  tenantForm.value = { ...tenant };
  dialogVisible.value = true;
};

const submitForm = async () => {
  if (!formRef.value) return;
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        if (isEditing.value) {
          await store.updateTenant(tenantForm.value);
          ElMessage.success('更新成功');
        } else {
          await store.addTenant(tenantForm.value);
          ElMessage.success('添加成功');
        }
        dialogVisible.value = false;
        fetchData();
      } catch (error) {
        ElMessage.error(error.message || '操作失败');
      }
    }
  });
};

const showContractImages = async (tenant) => {
  currentTenant.value = tenant;
  try {
    currentContractImages.value = await store.getContractImages(tenant.id);
    contractImagesVisible.value = true;
  } catch (error) {
    ElMessage.error('获取合同文件失败');
  }
};

const showPrivacyInfo = (tenant) => {
  currentTenant.value = tenant;
  privacyInfoVisible.value = true;
};

const showPaymentHistory = async (tenant) => {
  currentTenant.value = tenant;
  try {
    currentPaymentHistory.value = await store.getPaymentHistory(tenant.id);
    paymentHistoryVisible.value = true;
  } catch (error) {
    ElMessage.error('获取缴费历史失败');
  }
};

const showAddPaymentDialog = (tenant) => {
  currentTenant.value = tenant;
  paymentForm.value = {
    payment_date: new Date(),
    payment_type: 'rent',
    due_date: '',
    amount: tenant.rent_amount,
    payment_method: 'cash',
    notes: ''
  };
  addPaymentVisible.value = true;
};

const submitPayment = async () => {
  if (!paymentFormRef.value) return;
  
  await paymentFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        await store.addPayment({
          ...paymentForm.value,
          tenant_id: currentTenant.value.id
        });
        ElMessage.success('添加缴费记录成功');
        addPaymentVisible.value = false;
        fetchData();
      } catch (error) {
        ElMessage.error(error.message || '添加缴费记录失败');
      }
    }
  });
};

const terminateContract = async (tenant) => {
  try {
    await ElMessageBox.confirm('确定要终止该租户的合同吗？', '提示', {
      type: 'warning'
    });
    await store.terminateContract(tenant.id);
    ElMessage.success('退租成功');
    fetchData();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '退租失败');
    }
  }
};

const renewContract = async (tenant) => {
  try {
    await ElMessageBox.confirm('确定要续租该租户的合同吗？', '提示', {
      type: 'warning'
    });
    await store.renewContract(tenant.id);
    ElMessage.success('续租成功');
    fetchData();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '续租失败');
    }
  }
};

const deletePaymentRecord = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除该缴费记录吗？', '提示', {
      type: 'warning'
    });
    await store.deletePaymentRecord(id);
    ElMessage.success('删除成功');
    fetchData();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败');
    }
  }
};

const goPrintPage = (tenant) => {
  router.push({
    name: 'PrintPaymentHistory',
    params: { id: tenant.id }
  });
};

const getRoomInfo = (roomId) => {
  const room = store.getRoomById(roomId);
  return room ? `${room.location_name} - ${room.room_number}` : '-';
};

const getPaymentFrequencyLabel = (frequency) => {
  const map = {
    monthly: '按月',
    semi_annual: '按半年',
    quarterly: '按季',
    yearly: '按年'
  };
  return map[frequency] || frequency;
};

const getPaymentTypeLabel = (type) => {
  const map = {
    rent: '租金',
    water: '水费',
    electricity: '电费',
    maintenance: '维修费'
  };
  return map[type] || type;
};

const getPaymentMethodLabel = (method) => {
  const map = {
    cash: '现金',
    wechat: '微信',
    alipay: '支付宝',
    bank: '银行转账'
  };
  return map[method] || method;
};

const isLatestPaymentOfType = (payment) => {
  if (!currentPaymentHistory.value.length) return false;
  const sameTypePayments = currentPaymentHistory.value.filter(p => p.payment_type === payment.payment_type);
  return sameTypePayments[0]?.id === payment.id;
};

const handlePaymentTypeChange = () => {
  if (paymentForm.value.payment_type === 'rent') {
    paymentForm.value.amount = currentTenant.value?.rent_amount || 0;
  } else {
    paymentForm.value.amount = 0;
  }
};

const handleImageError = (e) => {
  e.target.src = '/placeholder.png';
};

// 数据获取
const fetchData = async () => {
  loading.value = true;
  try {
    await Promise.all([
      store.fetchTenants(),
      store.fetchRooms()
    ]);
  } catch (error) {
    ElMessage.error('获取数据失败');
  } finally {
    loading.value = false;
  }
};

// 生命周期钩子
onMounted(() => {
  fetchData();
});

// 监听筛选条件变化
watch([locationFilter, roomNumberFilter], () => {
  fetchData();
});
</script>

<style scoped>
.tenant-container {
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

.overdue-payment {
  color: #f56c6c;
}

.contract-dialog {
  .contract-images-container {
    .contract-preview {
      .image-container {
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        
        .contract-image {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
        
        .image-info {
          margin-top: 8px;
          text-align: center;
          
          .image-name {
            color: #606266;
            font-size: 14px;
          }
        }
      }
    }
  }
}

.privacy-info {
  p {
    margin: 8px 0;
    line-height: 1.5;
  }
}

.payment-history-content {
  .payment-history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    
    .tenant-info {
      p {
        margin: 4px 0;
        color: #606266;
      }
    }
  }
}

.amount-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
  
  .monthly-rent-hint {
    color: #909399;
    font-size: 12px;
  }
}
</style> 