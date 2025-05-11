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
          {{ row.room_number || '-' }}
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
              @click="deleteTenant(row.id)"
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
        <div v-else class="no-images">
          <el-empty description="暂无合同文件" />
        </div>
        <div class="contract-images-actions">
          <el-upload
            action="#"
            list-type="picture-card"
            :auto-upload="false"
            :on-change="handleContractImageChange"
            :on-remove="handleContractImageRemove"
            :file-list="contractImageList"
            :before-upload="beforeContractImageUpload"
            :limit="10"
            multiple
          >
            <el-icon><Plus /></el-icon>
            <template #tip>
              <div class="el-upload__tip">
                支持 jpg/png 格式，单个文件不超过 5MB
              </div>
            </template>
          </el-upload>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="contractImagesVisible = false">关闭</el-button>
          <el-button type="primary" @click="saveContractImages">
            保存
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- Payment History Dialog -->
    <el-dialog
      v-model="paymentHistoryVisible"
      title="交租历史"
      width="800px"
    >
      <div class="payment-history-container">
        <div class="payment-history-header">
          <div class="payment-history-actions">
            <el-button type="primary" @click="showAddPaymentDialog">
              新增交租记录
            </el-button>
            <el-select 
              v-model="selectedYear" 
              placeholder="选择年份"
              style="width: 120px; margin-left: 16px;"
            >
              <el-option
                v-for="year in availableYears"
                :key="year"
                :label="year + '年'"
                :value="year"
              />
            </el-select>
          </div>
        </div>
        
        <el-table
          :data="filteredPaymentHistory"
          style="width: 100%"
        >
          <el-table-column prop="due_date" label="约定日期">
            <template #default="{ row }">
              {{ row.due_date ? new Date(row.due_date).toLocaleDateString() : '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="payment_date" label="缴费日期">
            <template #default="{ row }">
              {{ new Date(row.payment_date).toLocaleDateString() }}
            </template>
          </el-table-column>
          <el-table-column prop="payment_type" label="费用类别">
            <template #default="{ row }">
              {{ getPaymentTypeLabel(row.payment_type) }}
            </template>
          </el-table-column>
          <el-table-column prop="amount" label="金额">
            <template #default="{ row }">
              ¥{{ row.amount }}
            </template>
          </el-table-column>
          <el-table-column prop="payment_method" label="支付方式">
            <template #default="{ row }">
              {{ getPaymentMethodLabel(row.payment_method) }}
            </template>
          </el-table-column>
          <el-table-column prop="notes" label="备注" />
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button 
                size="small" 
                type="danger"
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
      width="500px"
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
          />
        </el-form-item>
        <el-form-item label="费用类别" prop="payment_type">
          <el-select v-model="paymentForm.payment_type" @change="handlePaymentTypeChange">
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
          />
        </el-form-item>
        <el-form-item label="金额" prop="amount">
          <div class="amount-input-group">
            <el-input-number v-model="paymentForm.amount" :min="0" :precision="2" />
            <span v-if="paymentForm.payment_type === 'rent'" class="monthly-rent-hint">
              (月租:¥{{ currentTenant?.rent_amount || 0 }})
            </span>
          </div>
        </el-form-item>
        <el-form-item label="支付方式" prop="payment_method">
          <el-select v-model="paymentForm.payment_method">
            <el-option label="现金" value="cash" />
            <el-option label="微信" value="wechat" />
            <el-option label="支付宝" value="alipay" />
            <el-option label="银行转账" value="bank" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="notes">
          <el-input v-model="paymentForm.notes" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="addPaymentVisible = false">取消</el-button>
          <el-button type="primary" @click="submitPaymentForm">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- Renew Contract Dialog -->
    <el-dialog
      v-model="renewDialogVisible"
      title="续租"
      width="500px"
    >
      <el-form
        ref="renewFormRef"
        :model="renewForm"
        :rules="renewRules"
        label-width="100px"
      >
        <el-form-item label="房间号" prop="room_id">
          <el-select v-model="renewForm.room_id" placeholder="请选择房间">
            <el-option
              v-for="room in availableRooms"
              :key="room.id"
              :label="`${room.location_name} - ${room.room_number}`"
              :value="room.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="租金" prop="rent_amount">
          <el-input-number v-model="renewForm.rent_amount" :min="0" />
        </el-form-item>
        <el-form-item label="交租方式" prop="payment_frequency">
          <el-select v-model="renewForm.payment_frequency">
            <el-option label="按月" value="monthly" />
            <el-option label="按季" value="quarterly" />
            <el-option label="按年" value="yearly" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="renewDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitRenewForm">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- Print Dialog -->
    <el-dialog
      v-model="printDialogVisible"
      title="打印交租历史"
      width="400px"
    >
      <el-form>
        <el-form-item label="选择年份">
          <el-select 
            v-model="printYear" 
            placeholder="选择年份"
            style="width: 120px;"
          >
            <el-option
              v-for="year in printYearOptions"
              :key="year"
              :label="year + '年'"
              :value="year"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="printDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="printPaymentHistory">
            打印
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 打印内容 -->
    <div ref="printSection" class="print-section">
      <div class="print-header">
        <h2>{{ printTenant?.name || '' }} - {{ printYear }}年交租记录</h2>
      </div>
      <el-table
        :data="printPaymentData"
        style="width: 100%"
        border
      >
        <el-table-column prop="due_date" label="约定交租日期">
          <template #default="{ row }">
            {{ row.due_date ? new Date(row.due_date).toLocaleDateString() : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="payment_date" label="实际交租日期">
          <template #default="{ row }">
            {{ new Date(row.payment_date).toLocaleDateString() }}
          </template>
        </el-table-column>
        <el-table-column prop="payment_type" label="费用类别">
          <template #default="{ row }">
            {{ getPaymentTypeLabel(row.payment_type) }}
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="金额">
          <template #default="{ row }">
            ¥{{ row.amount }}
          </template>
        </el-table-column>
        <el-table-column prop="payment_method" label="支付方式">
          <template #default="{ row }">
            {{ getPaymentMethodLabel(row.payment_method) }}
          </template>
        </el-table-column>
        <el-table-column prop="notes" label="备注" />
      </el-table>
      <div class="print-footer">
        <p>打印时间：{{ new Date().toLocaleString() }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useTenantStore } from '../stores/tenant';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();
const store = useTenantStore();
const loading = ref(false);
const searchQuery = ref('');
const dialogVisible = ref(false);
const isEditing = ref(false);
const formRef = ref(null);
const contractImagesVisible = ref(false);
const currentContractImages = ref([]);
const contractImageList = ref([]);
const currentTenantId = ref(null);
const availableRooms = ref([]);
const paymentHistoryVisible = ref(false);
const addPaymentVisible = ref(false);
const currentPaymentHistory = ref([]);
const paymentFormRef = ref(null);
const locationFilter = ref('');
const roomNumberFilter = ref('');
const rooms = ref([]);
const renewDialogVisible = ref(false);
const renewFormRef = ref(null);
const selectedYear = ref(new Date().getFullYear());
const renewForm = ref({
  room_id: null,
  rent_amount: 0,
  payment_frequency: 'monthly'
});

const renewRules = {
  room_id: [{ required: true, message: '请选择房间', trigger: 'change' }],
  rent_amount: [{ required: true, message: '请输入租金', trigger: 'blur' }],
  payment_frequency: [{ required: true, message: '请选择交租方式', trigger: 'change' }]
};

const tenantForm = ref({
  name: '',
  phone: '',
  id_number: '',
  wechat_id: '',
  check_in_date: '',
  rent_amount: 0,
  payment_frequency: 'monthly',
  is_active: true,
  room_id: null
});

const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入电话', trigger: 'blur' }],
  id_number: [{ required: true, message: '请输入身份证号', trigger: 'blur' }],
  check_in_date: [{ required: true, message: '请选择入住时间', trigger: 'change' }],
  rent_amount: [{ required: true, message: '请输入租金', trigger: 'blur' }],
  payment_frequency: [{ required: true, message: '请选择交租方式', trigger: 'change' }]
};

const paymentForm = ref({
  payment_date: new Date(),
  due_date: null,
  amount: 0,
  payment_method: 'cash',
  payment_type: 'rent',
  notes: ''
});

const paymentRules = {
  payment_date: [{ required: true, message: '请选择交租日期', trigger: 'change' }],
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }],
  payment_method: [{ required: true, message: '请选择支付方式', trigger: 'change' }],
  payment_type: [{ required: true, message: '请选择费用类别', trigger: 'change' }]
};

const deletedImages = ref([]);

const filteredTenants = computed(() => {
  let filtered = store.tenants;
  
  // 首先根据 URL 参数中的 roomId 筛选
  if (route.query.roomId) {
    const roomId = parseInt(route.query.roomId);
    filtered = filtered.filter(tenant => tenant.room_id === roomId);
  }
  
  // 然后根据选择的地址和房间号筛选
  if (locationFilter.value) {
    const roomIds = rooms.value
      .filter(r => r.location === locationFilter.value)
      .map(r => r.id);
    filtered = filtered.filter(tenant => roomIds.includes(tenant.room_id));
  }
  
  if (roomNumberFilter.value) {
    const roomIds = rooms.value
      .filter(r => r.room_number.includes(roomNumberFilter.value))
      .map(r => r.id);
    filtered = filtered.filter(tenant => roomIds.includes(tenant.room_id));
  }
  
  // 最后根据搜索关键词筛选
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(tenant => 
      tenant.name.toLowerCase().includes(query) ||
      tenant.phone.toLowerCase().includes(query) ||
      tenant.id_number.toLowerCase().includes(query)
    );
  }
  
  return filtered;
});

const fetchAvailableRooms = async () => {
  try {
    const rooms = await window.electronAPI.getRooms();
    availableRooms.value = rooms.filter(room => !room.is_occupied);
  } catch (error) {
    console.error('获取房间列表失败:', error);
    ElMessage.error('获取房间列表失败');
  }
};

onMounted(async () => {
  await Promise.all([
    store.fetchTenants(),
    fetchAvailableRooms()
  ]);
});

const showAddDialog = () => {
  isEditing.value = false;
  tenantForm.value = {
    name: '',
    phone: '',
    id_number: '',
    wechat_id: '',
    check_in_date: new Date().toISOString().split('T')[0],
    rent_amount: 0,
    payment_frequency: 'monthly',
    is_active: true,
    room_id: null
  };
  dialogVisible.value = true;
};

const editTenant = (tenant) => {
  isEditing.value = true;
  tenantForm.value = { 
    ...tenant,
    room_id: tenant.room_id || null
  };
  dialogVisible.value = true;
};

const submitForm = async () => {
  if (!formRef.value) return;
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        // 创建一个新的对象，确保日期被正确格式化
        const tenantData = {
          ...tenantForm.value,
          check_in_date: tenantForm.value.check_in_date ? 
            new Date(tenantForm.value.check_in_date).toISOString().split('T')[0] : 
            null
        };

        if (isEditing.value) {
          await store.updateTenant(tenantData);
          ElMessage.success('更新成功');
        } else {
          const newTenant = await store.addTenant(tenantData);
          console.log('新增租客信息:', newTenant);
          
          // 检查是否已存在相同日期和租客的日程
          const existingSchedules = await window.electronAPI.getSchedules();
          const hasDuplicate = existingSchedules.some(schedule => 
            schedule.room_id === tenantData.room_id && 
            new Date(schedule.date).toISOString().split('T')[0] === tenantData.check_in_date
          );

          // 只有在不存在重复日程时才添加新日程
          if (!hasDuplicate) {
            // 创建第一次交租日程，使用入住日期作为约定交租日期
            const scheduleData = {
              title: `${tenantData.name} 交租`,
              type: 'rent',
              date: tenantData.check_in_date,
              description: `租客 ${tenantData.name} 的第一次交租日期`,
              room_id: tenantData.room_id
            };

            // 添加日程
            await window.electronAPI.addSchedule(scheduleData);
          }

          // 等待一下确保数据已更新
          await new Promise(resolve => setTimeout(resolve, 100));
          // 验证是否成功添加到列表
          const isAdded = store.tenants.some(tenant => tenant.id === newTenant.id);
          console.log('是否成功添加到列表:', isAdded);
          if (!isAdded) {
            console.warn('租客可能未成功添加到列表中，请刷新页面检查');
          }
          ElMessage.success('添加成功');
        }
        dialogVisible.value = false;
      } catch (error) {
        console.error('操作失败:', error);
        ElMessage.error(error.message || '操作失败，请稍后重试');
      }
    }
  });
};

const deleteTenant = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除这个租客吗？', '警告', {
      type: 'warning'
    });
    await store.deleteTenant(id);
    ElMessage.success('删除成功');
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message);
    }
  }
};

const handleImageError = (e) => {
  console.error('Image load error:', e);
  ElMessage.error('图片加载失败，请检查文件是否存在');
};

const showContractImages = async (tenant) => {
  currentTenantId.value = tenant.id;
  try {
    currentContractImages.value = await store.getTenantContractImages(tenant.id);
    contractImageList.value = currentContractImages.value.map(img => ({
      name: img.name,
      url: img.url,
      id: img.id
    }));
    // 清空删除列表
    deletedImages.value = [];
    contractImagesVisible.value = true;
  } catch (error) {
    console.error('获取合同图片失败:', error);
    ElMessage.error('获取合同图片失败');
  }
};

const beforeContractImageUpload = (file) => {
  const isImage = file.type.startsWith('image/');
  const isLt5M = file.size / 1024 / 1024 < 5;

  if (!isImage) {
    ElMessage.error('只能上传图片文件！');
    return false;
  }
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过 5MB！');
    return false;
  }
  return true;
};

const handleContractImageChange = (file) => {
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    contractImageList.value.push({
      name: file.name,
      url: e.target.result,
      type: 'contract'
    });
  };
  reader.readAsDataURL(file.raw);
};

const handleContractImageRemove = (file) => {
  const index = contractImageList.value.findIndex(f => f.name === file.name);
  if (index !== -1) {
    const removedFile = contractImageList.value[index];
    // 如果是已保存的图片（有 id），添加到删除列表中
    if (removedFile.id) {
      deletedImages.value.push(removedFile);
    }
    contractImageList.value.splice(index, 1);
  }
};

const saveContractImages = async () => {
  if (contractImageList.value.length === 0 && deletedImages.value.length === 0) {
    ElMessage.warning('请至少上传一张合同图片');
    return;
  }

  try {
    // 创建一个新数组，只包含需要的数据
    const imagesToSave = contractImageList.value.map(img => ({
      name: img.name,
      url: img.url,
      type: 'contract'
    }));
    
    // 将要删除的图片ID列表传给后端
    const deleteIds = deletedImages.value.map(img => img.id).filter(Boolean);
    
    await store.updateTenantContractImages(currentTenantId.value, imagesToSave, deleteIds);
    // 手动刷新一次列表
    await store.fetchTenants();
    ElMessage.success('合同图片保存成功');
    contractImagesVisible.value = false;
  } catch (error) {
    console.error('保存合同图片失败:', error);
    ElMessage.error(error.message || '保存失败');
  }
};

const terminateContract = async (tenant) => {
  try {
    await ElMessageBox.confirm('确定要将该租客标记为已退租吗？', '警告', {
      type: 'warning'
    });
    await store.updateTenant({ ...tenant, is_active: false });
    ElMessage.success('已标记为退租状态');
    await store.fetchTenants();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '操作失败');
    }
  }
};

const renewContract = async (tenant) => {
  try {
    // 设置当前租客ID
    currentTenantId.value = tenant.id;
    // 初始化续租表单数据
    renewForm.value = {
      room_id: tenant.room_id,
      rent_amount: tenant.rent_amount,
      payment_frequency: tenant.payment_frequency
    };
    renewDialogVisible.value = true;
  } catch (error) {
    ElMessage.error(error.message || '操作失败');
  }
};

const submitRenewForm = async () => {
  if (!renewFormRef.value) return;
  
  await renewFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        const currentTenant = store.tenants.find(t => t.id === currentTenantId.value);
        if (!currentTenant) {
          throw new Error('未找到租客信息');
        }

        // 更新租客信息
        await store.updateTenant({
          ...currentTenant,
          is_active: true,
          room_id: renewForm.value.room_id,
          rent_amount: renewForm.value.rent_amount,
          payment_frequency: renewForm.value.payment_frequency
        });

        ElMessage.success('续租成功');
        renewDialogVisible.value = false;
        await store.fetchTenants();
      } catch (error) {
        console.error('续租失败:', error);
        ElMessage.error(error.message || '续租失败');
      }
    }
  });
};

const showPaymentHistory = async (tenant) => {
  currentTenantId.value = tenant.id;
  selectedYear.value = new Date().getFullYear();
  try {
    currentPaymentHistory.value = await store.getTenantPaymentHistory(tenant.id);
    paymentHistoryVisible.value = true;
  } catch (error) {
    console.error('获取交租历史失败:', error);
    ElMessage.error('获取交租历史失败');
  }
};

const showAddPaymentDialog = (tenant) => {
  if (!tenant) return;
  currentTenantId.value = tenant.id;

  // 计算约定交租日期
  let dueDate;
  if (tenant.last_payment_date) {
    // 如果有上次交租记录，获取上次约定交租日期
    // 先找到所有实际交租日期匹配的记录，然后按约定日期排序取最后一个
    const matchingPayments = currentPaymentHistory.value
      .filter(p => new Date(p.payment_date).getTime() === new Date(tenant.last_payment_date).getTime())
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    
    const lastPayment = matchingPayments[matchingPayments.length - 1];
    
    if (lastPayment) {
      // 基于上次约定交租日期计算下一次约定交租日期
      dueDate = calculateNextPaymentDate(new Date(lastPayment.due_date), tenant.payment_frequency);
    } else {
      // 如果找不到上次约定交租日期，使用入住日期
      dueDate = new Date(tenant.check_in_date);
    }
  } else {
    // 如果没有交租记录，使用入住日期
    dueDate = new Date(tenant.check_in_date);
  }

  // 根据交租方式计算金额
  const amount = calculateRentAmount(tenant.rent_amount, tenant.payment_frequency);

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

const handlePaymentTypeChange = (value) => {
  const currentTenant = store.tenants.find(t => t.id === currentTenantId.value);
  if (!currentTenant) return;

  if (value === 'rent') {
    // 如果切换到租金类型，重新计算约定交租日期和金额
    if (currentTenant.last_payment_date) {
      const matchingPayments = currentPaymentHistory.value
        .filter(p => 
          p.payment_type === 'rent' && 
          new Date(p.payment_date).getTime() === new Date(currentTenant.last_payment_date).getTime()
        )
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
      
      const lastPayment = matchingPayments[matchingPayments.length - 1];
      
      if (lastPayment) {
        paymentForm.value.due_date = calculateNextPaymentDate(new Date(lastPayment.due_date), currentTenant.payment_frequency);
      } else {
        paymentForm.value.due_date = new Date(currentTenant.check_in_date);
      }
    } else {
      paymentForm.value.due_date = new Date(currentTenant.check_in_date);
    }
    // 设置租金金额
    paymentForm.value.amount = calculateRentAmount(currentTenant.rent_amount, currentTenant.payment_frequency);
  } else {
    // 如果是其他费用类型，清空约定日期并设置金额为0
    paymentForm.value.due_date = null;
    paymentForm.value.amount = 0;
  }
};

const submitPaymentForm = async () => {
  if (!paymentFormRef.value) return;
  
  await paymentFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        const paymentData = {
          ...paymentForm.value,
          tenant_id: currentTenantId.value,
          payment_date: new Date(paymentForm.value.payment_date).toISOString().split('T')[0],
          due_date: paymentForm.value.payment_type === 'rent' ? 
            new Date(paymentForm.value.due_date).toISOString().split('T')[0] : 
            null
        };
        
        // 添加交租记录
        await store.addPaymentRecord(paymentData);
        
        // 更新租户的最后交租日期（只有租金类型才更新）
        if (paymentForm.value.payment_type === 'rent') {
          const currentTenant = store.tenants.find(t => t.id === currentTenantId.value);
          if (currentTenant) {
            await store.updateTenant({
              ...currentTenant,
              last_payment_date: paymentData.payment_date
            });

            // 创建下一次交租日程，基于本次约定交租日期计算
            const nextPaymentDate = calculateNextPaymentDate(
              new Date(paymentData.due_date),
              currentTenant.payment_frequency
            );

            // 检查是否已存在相同日期和租客的日程
            const existingSchedules = await window.electronAPI.getSchedules();
            const hasDuplicate = existingSchedules.some(schedule => 
              schedule.room_id === currentTenant.room_id && 
              new Date(schedule.date).toISOString().split('T')[0] === nextPaymentDate.toISOString().split('T')[0]
            );

            // 只有在不存在重复日程时才添加新日程
            if (!hasDuplicate) {
              // 创建日程数据
              const scheduleData = {
                title: `${currentTenant.name} 交租`,
                type: 'rent',
                date: nextPaymentDate.toISOString(),
                description: `租客 ${currentTenant.name} 的交租日期`,
                room_id: currentTenant.room_id
              };

              // 添加日程
              await window.electronAPI.addSchedule(scheduleData);
            }
          }
        }
        
        ElMessage.success('添加成功');
        addPaymentVisible.value = false;
        await showPaymentHistory({ id: currentTenantId.value });
        // 刷新租户列表以显示更新后的最后交租日期
        await store.fetchTenants();
      } catch (error) {
        console.error('添加交租记录失败:', error);
        ElMessage.error(error.message || '添加失败');
      }
    }
  });
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

const deletePaymentRecord = async (paymentId) => {
  try {
    await ElMessageBox.confirm('确定要删除这条交租记录吗？', '警告', {
      type: 'warning'
    });
    await store.deletePaymentRecord(paymentId);
    ElMessage.success('删除成功');
    await showPaymentHistory({ id: currentTenantId.value });
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败');
    }
  }
};

const getPaymentFrequencyLabel = (frequency) => {
  const labels = {
    'monthly': '按月',
    'semi_annual': '按半年',
    'quarterly': '按季',
    'yearly': '按年'
  };
  return labels[frequency] || frequency;
};

const getPaymentMethodLabel = (method) => {
  const labels = {
    'cash': '现金',
    'wechat': '微信',
    'alipay': '支付宝',
    'bank': '银行转账'
  };
  return labels[method] || method;
};

const getPaymentTypeLabel = (type) => {
  const labels = {
    'rent': '租金',
    'water': '水费',
    'electricity': '电费',
    'maintenance': '维修费'
  };
  return labels[type] || type;
};

// 显示隐私信息
const showPrivacyInfo = (tenant) => {
  const content = `
电话：${tenant.phone}
身份证号：${tenant.id_number}
微信号：${tenant.wechat_id || '未填写'}
  `.trim();
  
  ElMessageBox.alert(content, '隐私信息', {
    confirmButtonText: '关闭',
    callback: () => {
      // 关闭后的回调，可以为空
    }
  });
};

// 获取所有唯一的地址
const uniqueLocations = computed(() => {
  const locations = new Set(rooms.value.map(r => r.location_name));
  return Array.from(locations).filter(Boolean).sort();
});

// 获取所有房间信息
const fetchRooms = async () => {
  try {
    rooms.value = await window.electronAPI.getRooms();
  } catch (error) {
    console.error('获取房间列表失败:', error);
    ElMessage.error('获取房间列表失败');
  }
};

onMounted(async () => {
  await Promise.all([
    store.fetchTenants(),
    fetchRooms()
  ]);
});

// 修改 isPaymentOverdue 函数为异步函数
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
    const paymentHistory = await store.getTenantPaymentHistory(tenant.id);
    
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
    return diffDays < (periodDays - 7);
  } catch (error) {
    console.error('获取交租历史失败:', error);
    return false;
  }
};

// 添加一个 watch 来处理异步的 isPaymentOverdue
watch(() => store.tenants, async (newTenants) => {
  if (!newTenants) return;
  
  // 为每个租客添加 isOverdue 属性
  for (const tenant of newTenants) {
    tenant.isOverdue = await isPaymentOverdue(tenant);
  }
}, { deep: true, immediate: true });

// 添加过滤后的交租历史计算属性
const filteredPaymentHistory = computed(() => {
  return currentPaymentHistory.value.filter(payment => {
    const paymentYear = new Date(payment.payment_date).getFullYear();
    return paymentYear === selectedYear.value;
  });
});

// 添加可用年份的计算属性
const availableYears = computed(() => {
  const years = new Set(currentPaymentHistory.value.map(payment => 
    new Date(payment.payment_date).getFullYear()
  ));
  const currentYear = new Date().getFullYear();
  years.add(currentYear); // 确保当年总是可选的
  return Array.from(years).sort((a, b) => b - a); // 降序排列
});

// 获取当前租客信息
const currentTenant = computed(() => {
  return store.tenants.find(t => t.id === currentTenantId.value);
});

// 打印相关
const printDialogVisible = ref(false);
const printSection = ref(null);
const printYear = ref(new Date().getFullYear());
const printTenant = ref(null);
const printPaymentData = ref([]);

// 获取可打印年份选项
const printYearOptions = computed(() => {
  if (!printTenant.value) return [];
  const years = new Set(printPaymentData.value.map(payment => 
    new Date(payment.payment_date).getFullYear()
  ));
  const currentYear = new Date().getFullYear();
  years.add(currentYear);
  return Array.from(years).sort((a, b) => b - a);
});

// 显示打印对话框
const showPrintDialog = async (tenant) => {
  printTenant.value = tenant;
  printYear.value = new Date().getFullYear();
  try {
    // 获取该租客的所有交租记录
    const history = await store.getTenantPaymentHistory(tenant.id);
    printPaymentData.value = history;
    printDialogVisible.value = true;
  } catch (error) {
    console.error('获取交租历史失败:', error);
    ElMessage.error('获取交租历史失败');
  }
};

// 执行打印
const printPaymentHistory = () => {
  // 过滤选定年份的数据
  printPaymentData.value = printPaymentData.value.filter(payment => 
    new Date(payment.payment_date).getFullYear() === printYear.value
  );

  const printContent = printSection.value.innerHTML;
  const originalContent = document.body.innerHTML;
  
  // 创建打印样式
  const printStyles = `
    <style>
      @media print {
        body {
          padding: 20px;
          font-family: Arial, sans-serif;
        }
        .print-header {
          text-align: center;
          margin-bottom: 20px;
        }
        .print-footer {
          margin-top: 20px;
          text-align: right;
          font-size: 12px;
          color: #666;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f5f7fa;
        }
      }
    </style>
  `;

  // 设置打印内容
  document.body.innerHTML = printStyles + printContent;
  
  // 打印
  window.print();
  
  // 恢复原始内容
  document.body.innerHTML = originalContent;
  
  // 重新挂载 Vue 组件
  window.location.reload();
};

// 跳转到打印页面
const goPrintPage = (tenant) => {
  router.push(`/print-payment-history/${tenant.id}`);
};
</script>

<style scoped>
.tenant-container {
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

.contract-images-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.contract-preview {
  width: 100%;
  margin-bottom: 20px;
}

.image-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f5f7fa;
}

.contract-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.image-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8px;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  text-align: center;
}

.image-name {
  font-size: 14px;
}

.contract-images-actions {
  width: 100%;
  margin-top: 20px;
}

.no-images {
  width: 100%;
  height: 400px;
  display: flex;
  justify-content: center;
  align-items: center;
}

:deep(.el-carousel__item) {
  display: flex;
  justify-content: center;
  align-items: center;
}

:deep(.el-upload--picture-card) {
  width: 120px;
  height: 120px;
  line-height: 120px;
}

:deep(.el-upload-list--picture-card .el-upload-list__item) {
  width: 120px;
  height: 120px;
}

.payment-history-container {
  padding: 20px;
}

.payment-history-header {
  margin-bottom: 20px;
}

.payment-history-actions {
  display: flex;
  align-items: center;
}

.filter-container {
  display: flex;
  align-items: center;
  margin-left: 16px;
}

.overdue-payment {
  color: #f56c6c;
  font-weight: bold;
}

.amount-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.monthly-rent-hint {
  color: #909399;
  font-size: 13px;
}

.print-section {
  display: none;
}

@media print {
  .print-section {
    display: block;
  }
}
</style> 