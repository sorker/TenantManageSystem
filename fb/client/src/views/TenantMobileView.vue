<template>
  <div class="tenant-mobile-container">
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

    <!-- 租客展示区域 -->
    <div v-loading="loading" class="tenant-content">
      <template v-if="!loading && filteredLocations.length > 0">
        <template v-for="location in filteredLocations" :key="location">
          <div class="location-block">
            <h2 class="location-title">{{ location }}</h2>
            <div class="floors-container">
              <template v-for="floor in getFloorsForLocation(location)" :key="floor">
                <div class="floor-section">
                  <div class="tenants-list">
                    <template v-for="tenant in getTenantsForLocationAndFloor(location, floor)" :key="tenant.id">
                      <div 
                        class="tenant-card"
                        :class="{ 
                          'overdue': tenant.isOverdue, 
                          'paid': !tenant.isOverdue,
                          'empty': tenant.is_empty 
                        }"
                        @click="tenant.is_empty ? showAddTenantDialog(tenant) : showTenantDetail(tenant)"
                      >
                        <div class="tenant-card-header">
                          <div class="room-number">{{ tenant.room_number }}</div>
                          <div class="payment-status" :class="{ 
                            'overdue': tenant.isOverdue, 
                            'paid': !tenant.isOverdue,
                            'empty': tenant.is_empty 
                          }">
                            {{ tenant.statusText }}
                          </div>
                        </div>
                        <div class="tenant-card-body">
                          <div class="tenant-info">
                            <div class="info-item">
                              <span class="label">租客：</span>
                              <span class="value">{{ tenant.name }}</span>
                            </div>
                            <div class="info-item">
                              <span class="label">电话：</span>
                              <span class="value">{{ tenant.phone || '未设置' }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </template>
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

    <!-- 租客详情对话框 -->
    <el-dialog
      v-model="tenantDetailVisible"
      :title="`${currentTenant?.name || ''} 的详细信息`"
      width="100%"
      class="tenant-detail-dialog"
      :before-close="handleDialogClose"
      destroy-on-close
    >
      <div class="tenant-detail-content">
        <div class="tenant-detail-header">
          <div class="tenant-info">
            <p>房间号：{{ currentTenant?.room_number }}</p>
            <p>租金：{{ currentTenant?.rent_amount }}元/{{ getPaymentFrequencyLabel(currentTenant?.payment_frequency) }}</p>
          </div>
          <el-button type="primary" @click="showAddPaymentDialog">
            新增缴费
          </el-button>
        </div>
        
        <el-tabs v-model="activeTab">
          <el-tab-pane label="缴费历史" name="payment">
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
          </el-tab-pane>
          <el-tab-pane label="合同信息" name="contract">
            <div class="contract-info">
              <div class="info-item">
                <span class="label">入住日期：</span>
                <span class="value">{{ currentTenant?.check_in_date ? new Date(currentTenant.check_in_date).toLocaleDateString() : '-' }}</span>
              </div>
              <div class="info-item">
                <span class="label">合同状态：</span>
                <span class="value">{{ currentTenant?.is_active ? '有效' : '已终止' }}</span>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-dialog>

    <!-- 新增缴费对话框 -->
    <el-dialog
      v-model="addPaymentVisible"
      title="新增交租记录"
      width="100%"
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
          <el-button @click="addPaymentVisible = false" :disabled="submitting">取消</el-button>
          <el-button 
            type="primary" 
            @click="submitPayment"
            :loading="submitting"
            :disabled="submitting"
          >
            {{ submitting ? '提交中...' : '确定' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 添加租客对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEditing ? '编辑租客' : '新增租客'"
      width="100%"
      class="tenant-dialog"
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
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="租金" prop="rent_amount">
          <el-input-number 
            v-model="tenantForm.rent_amount" 
            :min="0" 
            :precision="2"
            :step="100"
            style="width: 100%"
            @change="handleRentAmountChange"
          />
        </el-form-item>
        <el-form-item label="交租方式" prop="payment_frequency">
          <el-select v-model="tenantForm.payment_frequency" style="width: 100%">
            <el-option label="按月" value="monthly" />
            <el-option label="按半年" value="semi_annual" />
            <el-option label="按季" value="quarterly" />
            <el-option label="按年" value="yearly" />
          </el-select>
        </el-form-item>
        <el-form-item label="最后交租日期" prop="last_payment_date">
          <el-date-picker
            v-model="tenantForm.last_payment_date"
            type="date"
            placeholder="选择日期"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false" :disabled="submitting">取消</el-button>
          <el-button 
            type="primary" 
            @click="submitTenantForm"
            :loading="submitting"
            :disabled="submitting"
          >
            {{ submitting ? '提交中...' : '确定' }}
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
import { useRoomStore } from '../stores/room';
import { useLocationStore } from '../stores/location';

const store = useTenantStore();
const selectedLocation = ref('');
const selectedFloor = ref('');
const rooms = ref([]);
const loading = ref(false);
const tenantsData = ref({});

// 获取所有唯一的地点
const uniqueLocations = computed(() => {
  const locations = new Set();
  rooms.value.forEach(room => {
    if (room.location_name) {
      locations.add(room.location_name);
    }
  });
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
  const tenants = tenantsData.value[key] || [];
  
  // 获取该楼层的所有房间
  const floorRooms = rooms.value.filter(r => 
    r.location_name === location && 
    r.floor === floor
  );

  // 创建包含所有房间的数组
  const allRooms = floorRooms.map(room => {
    // 查找该房间的所有租客，并按入住日期降序排序
    const roomTenants = tenants
      .filter(t => t.room === room.id)
      .sort((a, b) => new Date(b.check_in_date) - new Date(a.check_in_date));
    
    // 获取当前在租的租客（第一个活跃的租客）
    const activeTenant = roomTenants.find(t => t.is_active);
    
    if (activeTenant) {
      // 如果有活跃租客，返回租客信息
      return {
        ...activeTenant,
        statusText: getPaymentStatusText(activeTenant),
        isOverdue: isTenantOverdue(activeTenant)
      };
    } else {
      // 如果没有活跃租客，返回空房间信息
      return {
        id: `empty-${room.id}`,
        room_number: room.room_number,
        name: '空置',
        phone: '',
        is_empty: true,
        statusText: '空置',
        isOverdue: false
      };
    }
  });

  return allRooms.sort((a, b) => {
    // 按房间号排序
    return a.room_number.localeCompare(b.room_number);
  });
};

// 监听筛选条件变化
watch([selectedLocation, selectedFloor], () => {
  loadTenantsData();
});

// 组件挂载时加载数据
onMounted(async () => {
  await loadTenantsData();
});

// 加载租客数据
const loadTenantsData = async () => {
  loading.value = true;
  try {
    const roomsResponse = await store.fetchRooms();
    // 转换房间数据格式
    rooms.value = roomsResponse.map(room => ({
      id: room.id,
      location_name: room.location.name,
      floor: room.floor,
      room_number: room.room_number,
      is_occupied: room.is_occupied
    }));
    const tenants = await store.fetchTenants();

    for (const location of uniqueLocations.value) {
      for (const floor of getFloorsForLocation(location)) {
        const key = `${location}-${floor}`;
        
        // 获取该楼层的租客
        const floorTenants = tenants.filter(t => {
          const room = rooms.value.find(r => r.id === t.room);
          return room && room.location_name === location && room.floor === floor;
        }).map(tenant => ({
          ...tenant,
          statusText: getPaymentStatusText(tenant),
          isOverdue: isTenantOverdue(tenant)
        })).sort((a, b) => {
          const roomA = rooms.value.find(r => r.id === a.room);
          const roomB = rooms.value.find(r => r.id === b.room);
          return roomA.room_number.localeCompare(roomB.room_number);
        });

        tenantsData.value[key] = floorTenants;
      }
    }
  } catch (error) {
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
};

// 判断租客是否逾期
const isTenantOverdue = (tenant) => {
  if (!tenant.payment_frequency || !tenant.check_in_date) return false;

  // 如果是第一次交租
  if (!tenant.last_payment_date) {
    const checkInDate = new Date(tenant.check_in_date);
    const today = new Date();
    return today > checkInDate;
  }

  // 获取最近一次租金缴费记录
  const lastRentPayment = tenant.payment_history
    .filter(p => p.payment_type === 'rent')
    .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))[0];

  if (!lastRentPayment) return false;

  // 计算下一次交租日期
  const nextDueDate = calculateNextPaymentDate(new Date(lastRentPayment.due_date), tenant.payment_frequency);
  const today = new Date();
  return today > nextDueDate;
};

// 获取交租状态文本
const getPaymentStatusText = (tenant) => {
  if (!tenant.payment_frequency || !tenant.check_in_date) return '未设置交租周期';

  // 如果是第一次交租
  if (!tenant.last_payment_date) {
    const checkInDate = new Date(tenant.check_in_date);
    const today = new Date();
    const diffTime = today.getTime() - checkInDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? `逾期${diffDays}天` : `距离交租${-diffDays}天`;
  }

  // 获取最近一次租金缴费记录
  const lastRentPayment = tenant.payment_history
    .filter(p => p.payment_type === 'rent')
    .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))[0];

  if (!lastRentPayment) return '未交租';

  // 计算下一次交租日期
  const nextDueDate = calculateNextPaymentDate(new Date(lastRentPayment.due_date), tenant.payment_frequency);
  const today = new Date();
  const diffTime = nextDueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `逾期${-diffDays}天`;
  } else if (diffDays <= 7) {
    return `距离交租还有${diffDays}天`;
  }

  return '已交租';
};

// 租客详情相关
const tenantDetailVisible = ref(false);
const addPaymentVisible = ref(false);
const currentTenant = ref(null);
const currentPaymentHistory = ref([]);
const paymentFormRef = ref(null);
const activeTab = ref('payment');
const submitting = ref(false);

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
  tenantDetailVisible.value = false;
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
  tenantDetailVisible.value = false;
  addPaymentVisible.value = false;
  currentTenant.value = null;
  currentPaymentHistory.value = [];
  if (paymentFormRef.value) {
    paymentFormRef.value.resetFields();
  }
});

// 显示租客详情
const showTenantDetail = async (tenant) => {
  try {
    currentTenant.value = tenant;
    currentPaymentHistory.value = tenant.payment_history;
    tenantDetailVisible.value = true;
  } catch (error) {
    console.error('获取租客详情失败:', error);
    ElMessage.error('获取租客详情失败');
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
  if (!paymentFormRef.value || !currentTenant.value || submitting.value) return;
  
  try {
    submitting.value = true;
    await paymentFormRef.value.validate();
    const paymentData = {
      ...paymentForm.value,
      amount: Number(paymentForm.value.amount),
      tenant_id: currentTenant.value.id,
      payment_date: paymentForm.value.payment_date ? 
        new Date(paymentForm.value.payment_date).toISOString().split('T')[0] : null,
      due_date: paymentForm.value.due_date ? 
        new Date(paymentForm.value.due_date).toISOString().split('T')[0] : null
    };
    
    // 打印提交的数据
    console.log('提交的缴费数据:', paymentData);
    
    // 使用正确的 API 路径添加缴费记录
    await store.addPayment(paymentData);
    
    // 如果是租金类型，更新租客的最后交租日期
    if (paymentForm.value.payment_type === 'rent') {
      await store.updateTenant({
        ...currentTenant.value,
        last_payment_date: paymentData.payment_date
      });
    }
    
    ElMessage.success('缴费成功');
    addPaymentVisible.value = false;
    
    // 重新加载租客数据以更新显示
    await loadTenantsData();
    
    // 重新获取当前租客的最新数据
    const updatedTenants = await store.fetchTenants();
    if (!updatedTenants) {
      throw new Error('获取租客数据失败');
    }
    
    const updatedTenant = updatedTenants.find(t => t.id === currentTenant.value.id);
    if (!updatedTenant) {
      throw new Error('未找到更新后的租客数据');
    }
    
    currentTenant.value = updatedTenant;
    currentPaymentHistory.value = updatedTenant.payment_history || [];
    
  } catch (error) {
    if (error === 'cancel') return;
    console.error('缴费失败:', error);
    // 打印更详细的错误信息
    if (error.response) {
      console.error('错误响应数据:', error.response.data);
      console.error('错误状态码:', error.response.status);
    }
    ElMessage.error(error.response?.data?.message || error.message || '缴费失败');
  } finally {
    submitting.value = false;
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
    // 获取同类型的所有记录并按缴费日期和ID排序
    const sameTypePayments = currentTenant.value.payment_history
      .filter(p => p.payment_type === currentTenant.value.payment_history.find(p => p.id === paymentId)?.payment_type)
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
    
    // 使用正确的 API 路径删除缴费记录
    await store.deletePayment(paymentId);
    ElMessage.success('删除成功');
    
    // 重新加载租客数据以更新显示
    await loadTenantsData();
    
    // 重新获取当前租客的最新数据
    const updatedTenant = await store.fetchTenants();
    currentTenant.value = updatedTenant.find(t => t.id === currentTenant.value.id);
    currentPaymentHistory.value = currentTenant.value.payment_history;
  } catch (error) {
    if (error === 'cancel') return;
    ElMessage.error(error.message || '删除失败');
  }
};

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

// 处理地点标签点击
const handleLocationTabClick = (location) => {
  if (selectedLocation.value === location) {
    // 如果点击的是当前选中的tab，则取消筛选
    selectedLocation.value = '';
  } else {
    // 否则选中新的tab
    selectedLocation.value = location;
  }
};

// 添加新的状态变量
const dialogVisible = ref(false);
const isEditing = ref(false);
const formRef = ref(null);
const roomStore = useRoomStore();
const locationStore = useLocationStore();

// 租客表单数据
const tenantForm = ref({
  name: '',
  phone: '',
  id_number: '',
  wechat_id: '',
  check_in_date: new Date(),
  rent_amount: 0,
  payment_frequency: 'monthly',
  last_payment_date: null,
  is_active: true
});

// 表单验证规则
const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ],
  id_number: [
    { required: true, message: '请输入身份证号', trigger: 'blur' },
    { pattern: /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/, message: '请输入正确的身份证号', trigger: 'blur' }
  ],
  check_in_date: [{ required: true, message: '请选择入住时间', trigger: 'change' }],
  rent_amount: [{ required: true, message: '请输入租金', trigger: 'blur' }],
  payment_frequency: [{ required: true, message: '请选择交租方式', trigger: 'change' }]
};

// 显示新增租客对话框
const showAddTenantDialog = async (emptyRoom) => {
  try {
    isEditing.value = false;
    submitting.value = false;
    
    // 重置表单
    tenantForm.value = {
      name: '',
      phone: '',
      id_number: '',
      wechat_id: '',
      check_in_date: new Date(),
      rent_amount: 0,
      payment_frequency: 'monthly',
      last_payment_date: null,
      is_active: true
    };
    
    // 获取房间信息
    const room = rooms.value.find(r => r.room_number === emptyRoom.room_number);
    if (!room) {
      ElMessage.error('未找到房间信息');
      return;
    }
    
    // 设置房间信息
    tenantForm.value.room = room.id;
    
    dialogVisible.value = true;
  } catch (error) {
    console.error('打开新增租客对话框失败:', error);
    ElMessage.error('打开新增租客对话框失败');
  }
};

// 提交租客表单
const submitTenantForm = async () => {
  if (!formRef.value) return;
  
  try {
    submitting.value = true;
    await formRef.value.validate();
    
    // 格式化数据
    const formData = {
      ...tenantForm.value,
      check_in_date: tenantForm.value.check_in_date ? 
        new Date(tenantForm.value.check_in_date).toISOString().split('T')[0] : null,
      last_payment_date: tenantForm.value.last_payment_date ? 
        new Date(tenantForm.value.last_payment_date).toISOString().split('T')[0] : null
    };

    await store.addTenant(formData);
    ElMessage.success('添加成功');
    dialogVisible.value = false;
    
    // 重新加载数据
    await loadTenantsData();
  } catch (error) {
    if (error === 'cancel') return;
    console.error('添加租客失败:', error);
    ElMessage.error(error.message || '添加租客失败');
  } finally {
    submitting.value = false;
  }
};

// 处理租金金额变化
const handleRentAmountChange = (value) => {
  tenantForm.value.rent_amount = Number(value);
};
</script>

<style scoped>
.tenant-mobile-container {
  padding: 12px;
  max-width: 100%;
  overflow-x: hidden;
  padding-bottom: 72px;
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

.tenant-content {
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
  gap: 12px;
}

.floor-section {
  background-color: white;
  border-radius: 6px;
  padding: 8px;
}

.tenants-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 6px;
}

.tenant-card {
  background-color: #f0f9eb;
  border-radius: 6px;
  padding: 6px;
  transition: all 0.3s ease;
  min-height: 80px;
}

.tenant-card.overdue {
  background-color: #fef0f0;
}

.tenant-card.paid {
  background-color: #f0f9eb;
}

.tenant-card.empty {
  background-color: #f4f4f5;
  cursor: default;
}

.payment-status {
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 8px;
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

.payment-status.empty {
  background-color: #f4f4f5;
  color: #909399;
  border: 1px solid #dcdfe6;
}

.tenant-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.room-number {
  font-size: 14px;
  font-weight: bold;
  color: #303133;
}

.tenant-card-body {
  background-color: white;
  border-radius: 4px;
  padding: 4px;
}

.tenant-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-item {
  display: flex;
  align-items: center;
  font-size: 11px;
}

.info-item .label {
  color: #909399;
  width: 35px;
  flex-shrink: 0;
}

.info-item .value {
  color: #303133;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

/* 租客详情对话框样式 */
.tenant-detail-dialog :deep(.el-dialog) {
  margin: 0;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  max-height: 90vh;
  border-radius: 16px 16px 0 0;
}

.tenant-detail-content {
  max-height: calc(90vh - 120px);
  overflow-y: auto;
}

.tenant-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 0 16px;
}

.contract-info {
  padding: 16px;
  background-color: #f5f7fa;
  border-radius: 8px;
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
  .tenant-mobile-container {
    padding: 8px;
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

  .tenant-card {
    padding: 10px;
  }

  .room-number {
    font-size: 15px;
  }

  .payment-status {
    font-size: 11px;
    padding: 1px 6px;
  }

  .info-item {
    font-size: 13px;
  }

  .info-item .label {
    width: 60px;
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

  .floors-container {
    gap: 8px;
  }

  .floor-section {
    padding: 6px;
  }
}

/* 小屏幕手机适配 */
@media screen and (max-width: 375px) {
  .tenant-card {
    padding: 4px;
    min-height: 70px;
  }

  .room-number {
    font-size: 13px;
  }

  .payment-status {
    font-size: 9px;
    padding: 1px 3px;
  }

  .info-item {
    font-size: 10px;
  }

  .info-item .label {
    width: 30px;
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

  .floors-container {
    gap: 6px;
  }

  .floor-section {
    padding: 4px;
  }
}

.tenant-dialog :deep(.el-dialog) {
  margin: 0;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  max-height: 90vh;
  border-radius: 16px 16px 0 0;
}

.tenant-dialog :deep(.el-dialog__body) {
  max-height: calc(90vh - 120px);
  overflow-y: auto;
  padding: 20px;
}

.tenant-dialog :deep(.el-form-item__content) {
  flex-wrap: nowrap;
  margin-left: 0 !important;
}

.tenant-dialog :deep(.el-form-item__label) {
  width: 100px !important;
  text-align: right;
  padding-right: 12px;
}
</style> 