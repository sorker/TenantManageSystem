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
          style="width: 200px; margin-right: 16px;"
        />
        <el-select
          v-model="statusFilter"
          placeholder="租客状态"
          clearable
          style="width: 120px;"
        >
          <el-option label="在租" :value="true" />
          <el-option label="已退租" :value="false" />
        </el-select>
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
      <el-table-column prop="room" label="房间号">
        <template #default="{ row }">
          {{ getRoomInfo(row.room) }}
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
              v-if="!row.last_payment_date"
              @click="deleteTenant(row)"
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
          <el-input-number 
            v-model="tenantForm.rent_amount" 
            :min="0" 
            :precision="2"
            :step="100"
            @change="handleRentAmountChange"
          />
        </el-form-item>
        <el-form-item label="交租方式" prop="payment_frequency">
          <el-select v-model="tenantForm.payment_frequency">
            <el-option label="按月" value="monthly" />
            <el-option label="按半年" value="semi_annual" />
            <el-option label="按季" value="quarterly" />
            <el-option label="按年" value="yearly" />
          </el-select>
        </el-form-item>
        <el-form-item label="房间信息" prop="room_id">
          <div class="cascade-select">
            <el-select 
              v-model="tenantForm.location_id" 
              placeholder="请选择位置" 
              @change="handleLocationChange"
              style="width: 150px; margin-right: 8px;"
            >
              <el-option
                v-for="location in locations"
                :key="location.id"
                :label="location.name"
                :value="location.id"
              />
            </el-select>
            
            <el-select 
              v-model="tenantForm.floor" 
              placeholder="请选择楼层" 
              :disabled="!tenantForm.location_id"
              @change="handleFloorChange"
              style="width: 100px; margin-right: 8px;"
            >
              <el-option
                v-for="floor in availableFloors"
                :key="floor"
                :label="`${floor}层`"
                :value="floor"
              />
            </el-select>
            
            <el-select 
              v-model="tenantForm.room_id" 
              placeholder="请选择房间号" 
              :disabled="!tenantForm.floor"
              style="width: 100px;"
            >
              <el-option
                v-for="room in filteredRooms"
                :key="room.id"
                :label="room.room_number"
                :value="room.id"
              />
            </el-select>
          </div>
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
import { useRouter, useRoute } from 'vue-router';
import { useTenantStore } from '../stores/tenant';
import { useRoomStore } from '../stores/room';
import { useLocationStore } from '../stores/location';
import { ElMessage, ElMessageBox } from 'element-plus';

const router = useRouter();
const route = useRoute();
const store = useTenantStore();
const roomStore = useRoomStore();
const locationStore = useLocationStore();

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
const statusFilter = ref(true);

// 表单相关
const formRef = ref(null);
const paymentFormRef = ref(null);
const tenantForm = ref({
  name: '',
  phone: '',
  id_number: '',
  wechat_id: '',
  check_in_date: new Date(),
  rent_amount: 0,
  payment_frequency: 'monthly',
  location_id: '',
  floor: null,
  room_id: '',
  last_payment_date: null,
  is_active: true
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
  payment_frequency: [{ required: true, message: '请选择交租方式', trigger: 'change' }],
  location_id: [{ required: true, message: '请选择位置', trigger: 'change' }],
  floor: [{ required: true, message: '请选择楼层', trigger: 'change' }],
  room_id: [{ required: true, message: '请选择房间号', trigger: 'change' }]
};

const paymentRules = {
  payment_date: [{ required: true, message: '请选择交租日期', trigger: 'change' }],
  payment_type: [{ required: true, message: '请选择费用类别', trigger: 'change' }],
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }],
  payment_method: [{ required: true, message: '请选择支付方式', trigger: 'change' }]
};

// 计算属性
const uniqueLocations = computed(() => {
  const locations = new Set();
  roomStore.rooms.forEach(room => {
    if (room.location_name) {
      locations.add(room.location_name);
    }
  });
  const result = Array.from(locations).sort();
  return result;
});

const availableRooms = computed(() => {
  if (!roomStore.rooms) return [];
  return roomStore.rooms.filter(room => {
    // 过滤掉已经有租客的房间
    const hasTenant = store.tenants.some(tenant => 
      tenant.room === room.id && tenant.is_active
    );
    return !hasTenant;
  });
});

const filteredTenants = computed(() => {
  let filtered = store.tenants;
  
  // 地址筛选
  if (locationFilter.value) {
    filtered = filtered.filter(tenant => {
      const room = roomStore.getRoomById(tenant.room);
      return room && room.location_name === locationFilter.value;
    });
  }
  
  // 房间号筛选
  if (roomNumberFilter.value) {
    filtered = filtered.filter(tenant => {
      const room = roomStore.getRoomById(tenant.room);
      return room && room.room_number && 
        room.room_number.toString().includes(roomNumberFilter.value);
    });
  }
  
  // 状态筛选
  if (statusFilter.value !== null) {
    filtered = filtered.filter(tenant => tenant.is_active === statusFilter.value);
  }
  
  return filtered;
});

// 获取可用的楼层
const availableFloors = computed(() => {
  if (!tenantForm.value.location_id || !rooms.value) return [];
  
  // 获取该位置下的所有未占用房间
  const locationRooms = rooms.value.filter(room => 
    room.location.id === tenantForm.value.location_id && 
    !room.is_occupied && 
    !store.tenants.some(tenant => tenant.room === room.id && tenant.is_active)
  );
  
  // 提取并排序楼层
  const floors = new Set(locationRooms.map(room => room.floor).filter(Boolean));
  return Array.from(floors).sort((a, b) => a - b);
});

// 根据选择的位置和楼层过滤房间
const filteredRooms = computed(() => {
  if (!tenantForm.value.location_id || !tenantForm.value.floor || !rooms.value) return [];
  
  return rooms.value.filter(room => 
    room.location.id === tenantForm.value.location_id && 
    room.floor === tenantForm.value.floor &&
    !room.is_occupied &&
    !store.tenants.some(tenant => tenant.room === room.id && tenant.is_active)
  );
});

// 方法
const showAddDialog = async () => {
  isEditing.value = false;
  try {
    loading.value = true;
    // 确保获取最新的可用房间列表
    await roomStore.fetchRooms();
    
    // 重置表单
    tenantForm.value = {
      name: '',
      phone: '',
      id_number: '',
      wechat_id: '',
      check_in_date: new Date(),
      rent_amount: 0,
      payment_frequency: 'monthly',
      location_id: '',
      floor: null,
      room_id: '',
      last_payment_date: null,
      is_active: true
    };
    
    // 确保房间数据已加载
    if (roomStore.rooms.length === 0) {
      ElMessage.warning('没有可用的房间');
      return;
    }
    
    dialogVisible.value = true;
  } catch (error) {
    ElMessage.error('获取房间列表失败');
    console.error('获取房间列表失败:', error);
  } finally {
    loading.value = false;
  }
};

const editTenant = (tenant) => {
  isEditing.value = true;
  tenantForm.value = {
    ...tenant,
    rent_amount: Number(tenant.rent_amount),
    check_in_date: tenant.check_in_date ? new Date(tenant.check_in_date) : null,
    last_payment_date: tenant.last_payment_date ? new Date(tenant.last_payment_date) : null,
    location_id: tenant.room?.location?.id || '',
    floor: tenant.room?.floor || null,
    room_id: tenant.room || ''
  };
  dialogVisible.value = true;
};

const submitForm = async () => {
  if (!formRef.value) return;
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        // 格式化数据
        const formData = {
          ...tenantForm.value,
          check_in_date: tenantForm.value.check_in_date ? 
            new Date(tenantForm.value.check_in_date).toISOString().split('T')[0] : null,
          last_payment_date: tenantForm.value.last_payment_date ? 
            new Date(tenantForm.value.last_payment_date).toISOString().split('T')[0] : null,
          room: tenantForm.value.room_id
        };

        // 删除不需要的字段
        delete formData.location_id;
        delete formData.floor;
        delete formData.room_id;

        if (isEditing.value) {
          await store.updateTenant(formData);
          ElMessage.success('更新成功');
        } else {
          await store.addTenant(formData);
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
    loading.value = true;
    currentContractImages.value = await store.getTenantContractImages(tenant.id);
    if (currentContractImages.value.length === 0) {
      ElMessage.info('暂无合同文件');
    } else {
      contractImagesVisible.value = true;
    }
  } catch (error) {
    ElMessage.error('获取合同文件失败');
    console.error('获取合同文件失败:', error);
  } finally {
    loading.value = false;
  }
};

const showPrivacyInfo = (tenant) => {
  currentTenant.value = tenant;
  privacyInfoVisible.value = true;
};

const showPaymentHistory = async (tenant) => {
  currentTenant.value = tenant;
  try {
    loading.value = true;
    currentPaymentHistory.value = await store.getPaymentHistory(tenant.id);
    if (currentPaymentHistory.value.length === 0) {
      ElMessage.info('暂无交租记录');
    } else {
      paymentHistoryVisible.value = true;
    }
  } catch (error) {
    ElMessage.error('获取交租历史失败');
    console.error('获取交租历史失败:', error);
  } finally {
    loading.value = false;
  }
};

const showAddPaymentDialog = (tenant) => {
  currentTenant.value = tenant;
  const baseAmount = Number(tenant.rent_amount) || 0;
  let amount = baseAmount;
  
  // 根据交租方式计算金额
  switch (tenant.payment_frequency) {
    case 'semi_annual':
      amount = baseAmount * 6;
      break;
    case 'quarterly':
      amount = baseAmount * 3;
      break;
    case 'yearly':
      amount = baseAmount * 12;
      break;
    default: // monthly
      amount = baseAmount;
  }

  // 计算约定交租日期
  let dueDate;
  if (tenant.last_payment_date) {
    // 如果有上次交租日期，基于上次交租日期计算
    dueDate = new Date(tenant.last_payment_date);
    switch (tenant.payment_frequency) {
      case 'semi_annual':
        dueDate.setMonth(dueDate.getMonth() + 6);
        break;
      case 'quarterly':
        dueDate.setMonth(dueDate.getMonth() + 3);
        break;
      case 'yearly':
        dueDate.setFullYear(dueDate.getFullYear() + 1);
        break;
      default: // monthly
        dueDate.setMonth(dueDate.getMonth() + 1);
    }
  } else {
    // 如果是第一次交租，约定日期就是入住当日
    dueDate = new Date(tenant.check_in_date);
  }

  paymentForm.value = {
    payment_date: new Date(),
    payment_type: 'rent',
    due_date: dueDate,
    amount: amount,
    payment_method: 'cash',
    notes: ''
  };
  addPaymentVisible.value = true;
};

const submitPayment = async () => {
  if (!paymentFormRef.value || !currentTenant.value) {
    ElMessage.error('租客信息不完整');
    return;
  }
  
  await paymentFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        // 确保tenant_id是数字类型
        const tenantId = Number(currentTenant.value.id);
        if (isNaN(tenantId)) {
          throw new Error('租客ID格式不正确');
        }

        const paymentData = {
          ...paymentForm.value,
          amount: Number(paymentForm.value.amount),
          tenant_id: tenantId,
          payment_date: paymentForm.value.payment_date ? 
            new Date(paymentForm.value.payment_date).toISOString().split('T')[0] : null,
          due_date: paymentForm.value.due_date ? 
            new Date(paymentForm.value.due_date).toISOString().split('T')[0] : null
        };

        console.log('提交的支付数据:', paymentData);

        await store.addPayment(paymentData);
        
        // 如果是租金支付，更新租客的最后交租日期
        if (paymentData.payment_type === 'rent') {
          await store.updateTenant({
            ...currentTenant.value,
            last_payment_date: paymentData.payment_date
          });
        }
        
        ElMessage.success('添加缴费记录成功');
        addPaymentVisible.value = false;
        fetchData();
      } catch (error) {
        console.error('添加缴费记录失败:', error);
        if (error.response) {
          console.error('错误响应:', error.response.data);
          ElMessage.error(error.response.data.message || '添加缴费记录失败');
        } else {
          ElMessage.error(error.message || '添加缴费记录失败');
        }
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
    await store.deletePaymentRecord(id, currentTenant.value.id);
    ElMessage.success('删除成功');
    // 重新加载支付历史
    currentPaymentHistory.value = await store.getPaymentHistory(currentTenant.value.id);
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
  if (!roomId) return '-';
  const room = roomStore.getRoomById(roomId);
  if (!room) return '-';
  const locationName = room.location?.name || room.location_name || '未知地址';
  return `${locationName} - ${room.room_number || '未知房间号'}`;
};

const getPaymentFrequencyLabel = (frequency) => {
  const map = {
    monthly: '按月',
    semi_annual: '按半年',
    quarterly: '按季',
    yearly: '按年'
  };
  return map[frequency] || '未知';
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
  const sameTypePayments = currentPaymentHistory.value
    .filter(p => p.payment_type === payment.payment_type)
    .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
  return sameTypePayments[0]?.id === payment.id;
};

const isLatestPaymentRecord = async (tenant) => {
  try {
    const paymentHistory = await store.getPaymentHistory(tenant.id);
    return paymentHistory && paymentHistory.length === 1;
  } catch (error) {
    console.error('获取支付历史失败:', error);
    return false;
  }
};

const handlePaymentTypeChange = () => {
  if (paymentForm.value.payment_type === 'rent') {
    const baseAmount = currentTenant.value?.rent_amount || 0;
    let amount = baseAmount;
    
    // 根据交租方式计算金额
    switch (currentTenant.value?.payment_frequency) {
      case 'semi_annual':
        amount = baseAmount * 6;
        break;
      case 'quarterly':
        amount = baseAmount * 3;
        break;
      case 'yearly':
        amount = baseAmount * 12;
        break;
      default: // monthly
        amount = baseAmount;
    }
    
    paymentForm.value.amount = amount;
    
    // 更新约定交租日期
    let dueDate;
    if (currentTenant.value?.last_payment_date) {
      // 如果有上次交租日期，基于上次交租日期计算
      dueDate = new Date(currentTenant.value.last_payment_date);
      switch (currentTenant.value.payment_frequency) {
        case 'semi_annual':
          dueDate.setMonth(dueDate.getMonth() + 6);
          break;
        case 'quarterly':
          dueDate.setMonth(dueDate.getMonth() + 3);
          break;
        case 'yearly':
          dueDate.setFullYear(dueDate.getFullYear() + 1);
          break;
        default: // monthly
          dueDate.setMonth(dueDate.getMonth() + 1);
      }
    } else {
      // 如果是第一次交租，基于入住日期计算
      dueDate = new Date(currentTenant.value.check_in_date);
      switch (currentTenant.value.payment_frequency) {
        case 'semi_annual':
          dueDate.setMonth(dueDate.getMonth() + 6);
          break;
        case 'quarterly':
          dueDate.setMonth(dueDate.getMonth() + 3);
          break;
        case 'yearly':
          dueDate.setFullYear(dueDate.getFullYear() + 1);
          break;
        default: // monthly
          dueDate.setMonth(dueDate.getMonth() + 1);
      }
    }
    
    paymentForm.value.due_date = dueDate;
  } else {
    paymentForm.value.amount = 0;
    paymentForm.value.due_date = null;
  }
};

const handleImageError = (e) => {
  e.target.src = '/placeholder.png';
  ElMessage.warning('图片加载失败');
};

const handleRentAmountChange = (value) => {
  tenantForm.value.rent_amount = Number(value);
};

// 计算下一个交租日期
const calculateNextPaymentDate = (lastDueDate, frequency) => {
  const nextDate = new Date(lastDueDate);
  switch (frequency) {
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'semi_annual':
      nextDate.setMonth(nextDate.getMonth() + 6);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
  }
  return nextDate;
};

// 检查是否逾期
const isPaymentOverdue = async (tenant) => {
  if (!tenant.payment_frequency || !tenant.check_in_date) return false;
  
  // 如果是第一次交租，检查是否已经超过入住日期
  if (!tenant.last_payment_date) {
    const checkInDate = new Date(tenant.check_in_date);
    const today = new Date();
    const diffTime = today.getTime() - checkInDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0;
  }
  
  try {
    // 加载租客的交租历史
    const paymentHistory = await store.getPaymentHistory(tenant.id);
    
    // 先找到所有实际交租日期匹配的记录，然后按约定日期排序取最后一个
    const matchingPayments = paymentHistory
      .filter(p => new Date(p.payment_date).getTime() === new Date(tenant.last_payment_date).getTime())
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    
    const lastPayment = matchingPayments[matchingPayments.length - 1];
    
    if (!lastPayment) return false;
    
    // 基于上次约定交租日期计算下一次约定交租日期
    const nextDueDate = calculateNextPaymentDate(new Date(lastPayment.due_date), tenant.payment_frequency);
    const today = new Date();
    
    // 计算距离约定日期的天数
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
    
    // 如果距离约定日期在7天之内（包括已过期7天内）且未超过周期减7天，则显示红色
    return diffDays < -7;
  } catch (error) {
    console.error('获取交租历史失败:', error);
    return false;
  }
};

// 数据获取
const fetchData = async () => {
  loading.value = true;
  try {
    const params = {};
    
    // 添加状态筛选
    if (statusFilter.value !== null) {
      params.is_active = statusFilter.value;
    }
    
    // 添加地址筛选
    if (locationFilter.value) {
      params.location = locationFilter.value;
    }
    
    // 添加房间号筛选
    if (roomNumberFilter.value) {
      params.room_number = roomNumberFilter.value;
    }

    // 只有在有 roomId 参数时才添加 room 筛选
    if (route.query.roomId) {
      params.room = route.query.roomId;
    }
    
    console.log('Fetching tenants with params:', params);
    await Promise.all([
      store.fetchTenants(params),
      roomStore.fetchRooms()
    ]);
        
    // 计算每个租客的逾期状态
    for (const tenant of store.tenants) {
      try {
        tenant.isOverdue = await isPaymentOverdue(tenant);
      } catch (error) {
        console.error('计算逾期状态失败:', error);
        tenant.isOverdue = false;
      }
    }
  } catch (error) {
    ElMessage.error('获取数据失败');
    console.error('获取数据失败:', error);
  } finally {
    loading.value = false;
  }
};

// 监听筛选条件变化
watch([locationFilter, roomNumberFilter, statusFilter], () => {
  fetchData();
});

// 监听路由参数变化
watch(() => route.query.roomId, (newRoomId) => {
  if (newRoomId) {
    fetchData();
  }
}, { immediate: true });

// 生命周期钩子
onMounted(async () => {
  try {
    loading.value = true;
    await Promise.all([
      fetchLocations(),
      fetchRooms()
    ]);
  } catch (error) {
    console.error('初始化数据失败:', error);
    ElMessage.error('初始化数据失败');
  } finally {
    loading.value = false;
  }
});

// 添加获取房间标签的方法
const getRoomLabel = (room) => {
  if (!room) return '未知房间';
  const locationName = room.location?.name || room.location_name || '未知地址';
  const roomNumber = room.room_number || '未知房间号';
  return `${locationName} - ${roomNumber}`;
};

const deleteTenant = async (tenant) => {
  try {
    await ElMessageBox.confirm('确定要删除该租客吗？', '提示', {
      type: 'warning'
    });
    await store.deleteTenant(tenant.id);
    ElMessage.success('删除成功');
    fetchData();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败');
    }
  }
};

const locations = ref([]);
const rooms = ref([]);

// 处理位置变化
const handleLocationChange = () => {
  tenantForm.value.floor = null;
  tenantForm.value.room_id = '';
};

// 处理楼层变化
const handleFloorChange = () => {
  tenantForm.value.room_id = '';
};

// 获取位置列表
const fetchLocations = async () => {
  try {
    await locationStore.fetchLocations();
    locations.value = locationStore.locations;
  } catch (error) {
    ElMessage.error('获取位置列表失败');
    console.error('获取位置列表失败:', error);
  }
};

// 获取房间列表
const fetchRooms = async () => {
  try {
    await roomStore.fetchRooms();
    rooms.value = roomStore.rooms;
    console.log('获取到的房间数据:', rooms.value);
  } catch (error) {
    ElMessage.error('获取房间列表失败');
    console.error('获取房间列表失败:', error);
  }
};
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

.cascade-select {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  max-width: 100%;
}

.cascade-select .el-select {
  flex-shrink: 0;
}

/* 调整表单项的布局 */
:deep(.el-form-item__content) {
  flex-wrap: nowrap;
  margin-left: 0 !important;
}

:deep(.el-form-item__label) {
  width: 100px !important;
  text-align: right;
  padding-right: 12px;
}
</style> 