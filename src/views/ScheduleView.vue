<template>
  <div class="schedule-container">
    <!-- 筛选区域 -->
    <div class="filter-section">
      <el-select
        v-model="selectedFloor"
        placeholder="选择楼层"
        clearable
        class="filter-select"
      >
        <el-option
          v-for="floor in uniqueFloors"
          :key="floor"
          :label="floor"
          :value="floor"
        />
      </el-select>
    </div>

    <!-- 日程展示区域 -->
    <div v-loading="loading" class="schedule-content">
      <template v-if="!loading && filteredLocations.length > 0">
        <template v-for="location in filteredLocations" :key="location">
          <div class="location-block">
            <h2 class="location-title">{{ location }}</h2>
            <div class="floors-container">
              <template v-for="floor in getFloorsForLocation(location)" :key="floor">
                <div class="floor-block">
                  <h3 class="floor-title">{{ floor }}层</h3>
                  <div class="rooms-grid">
                    <div
                      v-for="tenant in getTenantsForLocationAndFloor(location, floor)"
                      :key="tenant.id"
                      class="tenant-block"
                      :class="{ 'overdue': tenant.isOverdue, 'paid': !tenant.isOverdue }"
                      @click="showPaymentHistory(tenant)"
                    >
                      <div class="payment-status" :class="{ 'overdue': tenant.isOverdue, 'paid': !tenant.isOverdue }">
                        {{ tenant.statusText }}
                      </div>
                      <div class="tenant-info">
                        <div class="tenant-name">{{ tenant.name }}</div>
                        <div class="tenant-room">{{ tenant.room_number }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </template>
      </template>
      <el-empty v-else-if="!loading" description="暂无数据" />
    </div>

    <!-- 底部地点选择栏 -->
    <div class="location-tabs">
      <div 
        v-for="location in uniqueLocations" 
        :key="location"
        class="location-tab"
        :class="{ active: selectedLocation === location }"
        @click="handleLocationTabClick(location)"
      >
        {{ location }}
      </div>
    </div>

    <!-- 缴费历史对话框 -->
    <el-dialog
      v-model="paymentHistoryVisible"
      :title="`${currentTenant?.name || ''} 的缴费历史`"
      width="70%"
      class="payment-history-dialog"
      :before-close="handleDialogClose"
      destroy-on-close
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

    <!-- 新增缴费对话框 -->
    <el-dialog
      v-model="addPaymentVisible"
      title="新增交租记录"
      width="90%"
      :before-close="handleAddPaymentDialogClose"
      destroy-on-close
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
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue';
import { useTenantStore } from '../stores/tenant';
import { ElMessage, ElMessageBox } from 'element-plus';

const store = useTenantStore();
const selectedLocation = ref('');
const selectedFloor = ref('');
const rooms = ref([]);
const loading = ref(false);
const tenantsData = ref({});

// 获取所有唯一的地点
const uniqueLocations = computed(() => {
  const locations = new Set(rooms.value.map(r => r.location_name));
  return Array.from(locations).filter(Boolean).sort();
});

// 获取所有唯一的楼层
const uniqueFloors = computed(() => {
  const floors = new Set(rooms.value.map(r => r.floor));
  return Array.from(floors).filter(Boolean).sort();
});

// 根据筛选条件过滤地点
const filteredLocations = computed(() => {
  if (!selectedLocation.value) {
    return uniqueLocations.value;
  }
  return [selectedLocation.value];
});

// 获取指定地点的所有楼层
const getFloorsForLocation = (location) => {
  let floors = rooms.value
    .filter(r => r.location_name === location)
    .map(r => r.floor);

  // 如果选择了楼层，只返回选中的楼层
  if (selectedFloor.value) {
    floors = floors.filter(floor => floor === selectedFloor.value);
  }

  return Array.from(new Set(floors)).filter(Boolean).sort();
};

// 获取指定地点和楼层的所有租客
const getTenantsForLocationAndFloor = (location, floor) => {
  const key = `${location}-${floor}`;
  return tenantsData.value[key] || [];
};

// 加载租客数据
const loadTenantsData = async () => {
  loading.value = true;
  try {
    // 获取所有房间信息
    rooms.value = await window.electronAPI.getRooms();
    
    // 获取所有租客信息
    await store.fetchTenants();
    
    // 为每个地点和楼层组合加载租客数据
    for (const location of uniqueLocations.value) {
      for (const floor of getFloorsForLocation(location)) {
        const key = `${location}-${floor}`;
        const roomIds = rooms.value
          .filter(r => r.location_name === location && r.floor === floor)
          .map(r => r.id);

        const tenants = store.tenants
          .filter(t => roomIds.includes(t.room_id) && t.is_active)
          .sort((a, b) => {
            const roomA = rooms.value.find(r => r.id === a.room_id);
            const roomB = rooms.value.find(r => r.id === b.room_id);
            return roomA.room_number.localeCompare(roomB.room_number);
          });

        // 为每个租客添加房间号和交租状态
        for (const tenant of tenants) {
          const room = rooms.value.find(r => r.id === tenant.room_id);
          tenant.room_number = room ? room.room_number : '-';
          const statusText = await getPaymentStatusText(tenant);
          tenant.statusText = statusText;
          tenant.isOverdue = statusText.includes('逾期') || statusText.includes('距离交租');
        }

        tenantsData.value[key] = tenants;
      }
    }
  } catch (error) {
    console.error('加载数据失败:', error);
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
};

// 监听筛选条件变化
watch([selectedLocation, selectedFloor], () => {
  loadTenantsData();
});

onMounted(() => {
  loadTenantsData();
});

// 计算下一次交租日期
const calculateNextPaymentDate = (lastPaymentDate, frequency) => {
  const nextDate = new Date(lastPaymentDate);
  
  switch (frequency) {
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'semi_annual':
      nextDate.setMonth(nextDate.getMonth() + 6);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      nextDate.setMonth(nextDate.getMonth() + 1);
  }
  
  return nextDate;
};

// 获取交租状态文本
const getPaymentStatusText = async (tenant) => {
  if (!tenant.payment_frequency || !tenant.check_in_date) return '未设置交租周期';

  // 如果是第一次交租
  if (!tenant.last_payment_date) {
    const checkInDate = new Date(tenant.check_in_date);
    const today = new Date();
    const diffTime = today.getTime() - checkInDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? `逾期${diffDays}天` : `距离交租${-diffDays}天`;
  }

  try {
    // 获取交租历史
    const paymentHistory = await store.getTenantPaymentHistory(tenant.id);
    const matchingPayments = paymentHistory
      .filter(p => new Date(p.payment_date).getTime() === new Date(tenant.last_payment_date).getTime())
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    
    const lastPayment = matchingPayments[matchingPayments.length - 1];
    if (!lastPayment) return '未交租';

    // 计算下一次交租日期
    const nextDueDate = calculateNextPaymentDate(new Date(lastPayment.due_date), tenant.payment_frequency);
    const today = new Date();
    const diffTime = nextDueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // 根据交租周期计算提醒天数
    let periodDays;
    switch (tenant.payment_frequency) {
      case 'monthly':
        periodDays = 30;
        break;
      case 'quarterly':
        periodDays = 90;
        break;
      case 'semi_annual':
        periodDays = 180;
        break;
      case 'yearly':
        periodDays = 365;
        break;
      default:
        periodDays = 30;
    }

    // 如果距离约定日期在7天之内（包括已过期7天内）且未超过周期减7天
    if (diffDays <-7) {
      return diffDays > 0 ? `逾期${diffDays}天` : `距离交租${-diffDays}天`;
    }

    return '已交租';
  } catch (error) {
    console.error('获取交租历史失败:', error);
    return '获取交租历史失败';
  }
};

// 缴费相关
const paymentHistoryVisible = ref(false);
const addPaymentVisible = ref(false);
const currentTenant = ref(null);
const currentPaymentHistory = ref([]);
const paymentFormRef = ref(null);

const paymentForm = ref({
  payment_date: new Date(),
  due_date: null,
  amount: 0,
  payment_type: 'rent',
  payment_method: 'cash',
  notes: ''
});

const paymentRules = {
  payment_date: [{ required: true, message: '请选择交租日期', trigger: 'change' }],
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }],
  payment_method: [{ required: true, message: '请选择支付方式', trigger: 'change' }],
  payment_type: [{ required: true, message: '请选择费用类别', trigger: 'change' }]
};

// 处理对话框关闭
const handleDialogClose = () => {
  paymentHistoryVisible.value = false;
  currentTenant.value = null;
  currentPaymentHistory.value = [];
};

// 处理新增缴费对话框关闭
const handleAddPaymentDialogClose = () => {
  addPaymentVisible.value = false;
  if (paymentFormRef.value) {
    paymentFormRef.value.resetFields();
  }
};

// 组件卸载前清理
onBeforeUnmount(() => {
  paymentHistoryVisible.value = false;
  addPaymentVisible.value = false;
  currentTenant.value = null;
  currentPaymentHistory.value = [];
  if (paymentFormRef.value) {
    paymentFormRef.value.resetFields();
  }
});

// 显示缴费历史
const showPaymentHistory = async (tenant) => {
  try {
    currentTenant.value = tenant;
    currentPaymentHistory.value = await store.getTenantPaymentHistory(tenant.id);
    paymentHistoryVisible.value = true;
  } catch (error) {
    console.error('获取缴费历史失败:', error);
    ElMessage.error('获取缴费历史失败');
    handleDialogClose();
  }
};

// 根据交租方式计算金额
const calculateRentAmount = (baseAmount, frequency) => {
  switch (frequency) {
    case 'monthly':
      return baseAmount;
    case 'quarterly':
      return baseAmount * 3;
    case 'semi_annual':
      return baseAmount * 6;
    case 'yearly':
      return baseAmount * 12;
    default:
      return baseAmount;
  }
};

// 显示新增缴费对话框
const showAddPaymentDialog = () => {
  if (!currentTenant.value) return;

  // 计算约定交租日期
  let dueDate;
  if (currentTenant.value.last_payment_date) {
    // 如果有上次交租记录，获取上次约定交租日期
    const matchingPayments = currentPaymentHistory.value
      .filter(p => new Date(p.payment_date).getTime() === new Date(currentTenant.value.last_payment_date).getTime())
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    
    const lastPayment = matchingPayments[matchingPayments.length - 1];
    
    if (lastPayment) {
      // 基于上次约定交租日期计算下一次约定交租日期
      dueDate = calculateNextPaymentDate(new Date(lastPayment.due_date), currentTenant.value.payment_frequency);
    } else {
      // 如果找不到上次约定交租日期，使用入住日期
      dueDate = new Date(currentTenant.value.check_in_date);
    }
  } else {
    // 如果没有交租记录，使用入住日期
    dueDate = new Date(currentTenant.value.check_in_date);
  }

  // 根据交租方式计算金额
  const amount = calculateRentAmount(currentTenant.value.rent_amount, currentTenant.value.payment_frequency);

  paymentForm.value = {
    payment_date: new Date(),
    due_date: dueDate,
    amount: amount,
    payment_method: 'cash',
    payment_type: 'rent',
    notes: ''
  };
  addPaymentVisible.value = true;
};

const handlePaymentTypeChange = (value) => {
  if (!currentTenant.value) return;

  if (value === 'rent') {
    // 如果切换到租金类型，重新计算约定交租日期和金额
    if (currentTenant.value.last_payment_date) {
      const matchingPayments = currentPaymentHistory.value
        .filter(p => 
          p.payment_type === 'rent' && 
          new Date(p.payment_date).getTime() === new Date(currentTenant.value.last_payment_date).getTime()
        )
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
      
      const lastPayment = matchingPayments[matchingPayments.length - 1];
      
      if (lastPayment) {
        paymentForm.value.due_date = calculateNextPaymentDate(new Date(lastPayment.due_date), currentTenant.value.payment_frequency);
      } else {
        paymentForm.value.due_date = new Date(currentTenant.value.check_in_date);
      }
    } else {
      paymentForm.value.due_date = new Date(currentTenant.value.check_in_date);
    }
    // 设置租金金额
    paymentForm.value.amount = calculateRentAmount(currentTenant.value.rent_amount, currentTenant.value.payment_frequency);
  } else {
    // 如果是其他费用类型，清空约定日期并设置金额为0
    paymentForm.value.due_date = null;
    paymentForm.value.amount = 0;
  }
};

// 提交缴费
const submitPayment = async () => {
  if (!paymentFormRef.value || !currentTenant.value) return;
  
  try {
    await paymentFormRef.value.validate();
    const paymentData = {
      ...paymentForm.value,
      tenant_id: currentTenant.value.id,
      payment_date: new Date(paymentForm.value.payment_date).toISOString().split('T')[0],
      due_date: paymentForm.value.due_date ? new Date(paymentForm.value.due_date).toISOString().split('T')[0] : null
    };
    
    await store.addPaymentRecord(paymentData);
    
    // 如果是租金类型，更新租客的最后交租日期
    if (paymentForm.value.payment_type === 'rent') {
      await store.updateTenant({
        ...currentTenant.value,
        last_payment_date: paymentData.payment_date
      });
    }
    
    ElMessage.success('缴费成功');
    addPaymentVisible.value = false;
    await showPaymentHistory(currentTenant.value);
    // 重新加载租客数据以更新显示
    await loadTenantsData();
  } catch (error) {
    if (error === 'cancel') return;
    console.error('缴费失败:', error);
    ElMessage.error(error.message || '缴费失败');
  }
};

// 判断是否是某个类型的最新缴费记录
const isLatestPaymentOfType = (payment) => {
  if (!currentPaymentHistory.value.length) return false;
  
  // 获取同类型的所有缴费记录
  const sameTypePayments = currentPaymentHistory.value
    .filter(p => p.payment_type === payment.payment_type)
    .sort((a, b) => {
      const dateA = new Date(a.payment_date);
      const dateB = new Date(b.payment_date);
      if (dateB.getTime() === dateA.getTime()) {
        return b.id - a.id;
      }
      return dateB.getTime() - dateA.getTime();
    });
  
  // 如果当前记录是第一条记录，则是最新的
  return sameTypePayments.length > 0 && 
         sameTypePayments[0].id === payment.id;
};

// 删除缴费记录
const deletePaymentRecord = async (paymentId) => {
  if (!currentTenant.value) return;
  
  try {
    // 获取当前租客的所有交租记录
    const paymentHistory = await store.getTenantPaymentHistory(currentTenant.value.id);
    
    // 找到要删除的记录
    const paymentToDelete = paymentHistory.find(p => p.id === paymentId);
    if (!paymentToDelete) {
      throw new Error('未找到要删除的记录');
    }

    // 获取同类型的所有记录并按缴费日期和ID排序
    const sameTypePayments = paymentHistory
      .filter(p => p.payment_type === paymentToDelete.payment_type)
      .sort((a, b) => {
        const dateA = new Date(a.payment_date);
        const dateB = new Date(b.payment_date);
        if (dateB.getTime() === dateA.getTime()) {
          return b.id - a.id;
        }
        return dateB.getTime() - dateA.getTime();
      });

    // 获取最近一次缴费的记录
    const latestPayment = sameTypePayments[0];

    // 检查是否是最新记录
    if (latestPayment.id !== paymentId) {
      ElMessage.warning('只能删除最近一次缴费记录');
      return;
    }

    await ElMessageBox.confirm('确定要删除这条缴费记录吗？', '警告', {
      type: 'warning'
    });
    await store.deletePaymentRecord(paymentId);
    ElMessage.success('删除成功');
    await showPaymentHistory(currentTenant.value);
    // 重新加载租客数据以更新显示
    await loadTenantsData();
  } catch (error) {
    if (error === 'cancel') return;
    ElMessage.error(error.message || '删除失败');
  }
};

// 获取交租周期标签
const getPaymentFrequencyLabel = (frequency) => {
  const labels = {
    'monthly': '月',
    'semi_annual': '半年',
    'quarterly': '季',
    'yearly': '年'
  };
  return labels[frequency] || frequency;
};

// 获取缴费方式标签
const getPaymentMethodLabel = (method) => {
  const labels = {
    'cash': '现金',
    'wechat': '微信',
    'alipay': '支付宝',
    'bank': '银行转账'
  };
  return labels[method] || method;
};

// 获取缴费类型标签
const getPaymentTypeLabel = (type) => {
  const labels = {
    'rent': '租金',
    'water': '水费',
    'electricity': '电费',
    'maintenance': '维修费'
  };
  return labels[type] || type;
};

// 在script setup部分添加handleLocationTabClick方法
const handleLocationTabClick = (location) => {
  if (selectedLocation.value === location) {
    // 如果点击的是当前选中的tab，则取消筛选
    selectedLocation.value = '';
  } else {
    // 否则选中新的tab
    selectedLocation.value = location;
  }
};
</script>

<style scoped>
.schedule-container {
  padding: 12px;
  max-width: 100%;
  overflow-x: hidden;
}

.filter-section {
  margin-bottom: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.filter-select {
  width: 100%;
  max-width: 200px;
}

.schedule-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.location-block {
  background-color: #f5f7fa;
  border-radius: 8px;
  padding: 16px;
}

.location-title {
  margin: 0 0 16px 0;
  font-size: 18px;
  color: #303133;
}

.floors-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.floor-block {
  background-color: white;
  border-radius: 6px;
  padding: 12px;
}

.floor-title {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #606266;
}

.rooms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.tenant-block {
  background-color: #f0f9eb;
  border-radius: 4px;
  padding: 12px;
  transition: all 0.3s ease;
  position: relative;
  min-height: 80px;
}

.tenant-block.overdue {
  background-color: #fef0f0;
}

.tenant-block.paid {
  background-color: #f0f9eb;
}

.tenant-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tenant-name {
  font-size: 15px;
  font-weight: bold;
  color: #303133;
  word-break: break-all;
}

.tenant-room {
  font-size: 13px;
  color: #606266;
}

.payment-status {
  position: absolute;
  top: 6px;
  right: 6px;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  text-align: center;
  white-space: nowrap;
}

.payment-status.overdue {
  background-color: #fef0f0;
  color: #f56c6c;
  border: 1px solid #f56c6c;
}

.payment-status.paid {
  background-color: #f0f9eb;
  color: #67c23a;
  border: 1px solid #67c23a;
}

/* 底部地点选择栏样式 */
.location-tabs {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #fff;
  display: flex;
  padding: 12px 16px;
  gap: 12px;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.08);
  z-index: 1000;
  border-top: 1px solid #ebeef5;
}

.location-tab {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  font-size: 15px;
  color: #606266;
  background-color: #f5f7fa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border: 1px solid #e4e7ed;
  font-weight: 500;
}

.location-tab:hover {
  background-color: #ecf5ff;
  color: #409eff;
  border-color: #409eff;
}

.location-tab.active {
  background-color: #409eff;
  color: #fff;
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .schedule-container {
    padding: 8px;
    padding-bottom: 72px; /* 增加底部空间 */
  }

  .filter-section {
    flex-direction: column;
    gap: 8px;
  }

  .filter-select {
    max-width: 100%;
  }

  .location-block {
    padding: 12px;
  }

  .location-title {
    font-size: 16px;
    margin-bottom: 12px;
  }

  .floor-block {
    padding: 8px;
  }

  .floor-title {
    font-size: 14px;
    margin-bottom: 8px;
  }

  .rooms-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .tenant-block {
    padding: 8px;
    min-height: 60px;
  }

  .tenant-name {
    font-size: 14px;
    margin-right: 40px;
  }

  .tenant-room {
    font-size: 12px;
  }

  .payment-status {
    font-size: 10px;
    padding: 1px 4px;
    max-width: 35px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* 底部标签栏在移动端的样式 */
  .location-tabs {
    padding: 10px 12px;
    gap: 8px;
  }

  .location-tab {
    font-size: 14px;
    padding: 8px 0;
  }
}

/* 小屏幕手机适配 */
@media screen and (max-width: 375px) {
  .rooms-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .tenant-block {
    min-height: 50px;
    padding: 6px;
  }

  .tenant-name {
    font-size: 13px;
    margin-right: 35px;
  }

  .tenant-room {
    font-size: 11px;
  }

  .payment-status {
    font-size: 9px;
    padding: 1px 3px;
    max-width: 30px;
  }

  /* 小屏幕底部标签栏样式 */
  .location-tabs {
    padding: 8px 10px;
    gap: 6px;
  }

  .location-tab {
    font-size: 13px;
    padding: 7px 0;
  }
}

/* 缴费历史对话框样式 */
.payment-history-dialog :deep(.el-dialog) {
  margin: 0;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  max-height: 90vh;
  border-radius: 16px 16px 0 0;
}

@media screen and (min-width: 768px) {
  .payment-history-dialog :deep(.el-dialog) {
    margin: 5vh auto;
    position: relative;
    width: 70%;
    max-height: 80vh;
    border-radius: 8px;
  }
}

.payment-history-content {
  max-height: calc(90vh - 120px);
  overflow-y: auto;
}

.payment-history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 0 16px;
}

.tenant-info {
  font-size: 14px;
  color: #606266;
}

.tenant-info p {
  margin: 4px 0;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .payment-history-dialog :deep(.el-dialog) {
    border-radius: 12px 12px 0 0;
  }

  .payment-history-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .tenant-info {
    font-size: 13px;
  }
}

/* 小屏幕手机适配 */
@media screen and (max-width: 375px) {
  .payment-history-dialog :deep(.el-dialog) {
    border-radius: 8px 8px 0 0;
  }

  .payment-history-header {
    gap: 8px;
  }

  .tenant-info {
    font-size: 12px;
  }
}

.amount-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.monthly-rent-hint {
  color: #909399;
  font-size: 12px;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .amount-input-group {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style> 