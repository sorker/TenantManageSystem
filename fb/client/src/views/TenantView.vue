<template>
  <div class="tenant-container">
    <!-- 顶部操作栏 -->
    <div class="operation-bar">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-input
            v-model="searchQuery"
            placeholder="搜索租户姓名/电话"
            clearable
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="4">
          <el-select v-model="selectedStatus" placeholder="租户状态" @change="handleStatusChange">
            <el-option label="全部" value="" />
            <el-option label="活跃" value="active" />
            <el-option label="非活跃" value="inactive" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>新增租户
          </el-button>
        </el-col>
      </el-row>
    </div>

    <!-- 租户列表 -->
    <el-table
      v-loading="loading"
      :data="filteredTenants"
      style="width: 100%"
      border
    >
      <el-table-column prop="name" label="姓名" min-width="100" />
      <el-table-column prop="phone" label="电话" min-width="120" />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'info'">
            {{ row.status === 'active' ? '活跃' : '非活跃' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="room_number" label="房间号" width="100" />
      <el-table-column prop="location_name" label="位置" min-width="120" />
      <el-table-column prop="check_in_date" label="入住日期" width="120">
        <template #default="{ row }">
          {{ formatDate(row.check_in_date) }}
        </template>
      </el-table-column>
      <el-table-column prop="last_payment_date" label="最后支付日期" width="120">
        <template #default="{ row }">
          {{ row.last_payment_date ? formatDate(row.last_payment_date) : '-' }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="250" fixed="right">
        <template #default="{ row }">
          <el-button-group>
            <el-button type="primary" link @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button type="success" link @click="handleViewPayments(row)">
              支付记录
            </el-button>
            <el-button type="warning" link @click="handleAddPayment(row)">
              添加支付
            </el-button>
            <el-button type="danger" link @click="handleDelete(row)">
              删除
            </el-button>
          </el-button-group>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '新增租户' : '编辑租户'"
      width="500px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="80px"
      >
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="电话" prop="phone">
          <el-input v-model="form.phone" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status" placeholder="请选择状态">
            <el-option label="活跃" value="active" />
            <el-option label="非活跃" value="inactive" />
          </el-select>
        </el-form-item>
        <el-form-item label="位置" prop="location_id">
          <el-select v-model="form.location_id" placeholder="请选择位置" @change="handleLocationSelect">
            <el-option
              v-for="location in locations"
              :key="location.id"
              :label="location.name"
              :value="location.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="房间" prop="room_id">
          <el-select v-model="form.room_id" placeholder="请选择房间">
            <el-option
              v-for="room in availableRooms"
              :key="room.id"
              :label="room.room_number"
              :value="room.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="入住日期" prop="check_in_date">
          <el-date-picker
            v-model="form.check_in_date"
            type="date"
            placeholder="选择日期"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 支付记录对话框 -->
    <el-dialog
      v-model="paymentDialogVisible"
      title="支付记录"
      width="800px"
    >
      <el-table :data="currentTenantPayments" border>
        <el-table-column prop="payment_date" label="支付日期" width="180">
          <template #default="{ row }">
            {{ formatDate(row.payment_date) }}
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="金额" width="120">
          <template #default="{ row }">
            ¥{{ row.amount.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="payment_type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getPaymentTypeTag(row.payment_type)">
              {{ getPaymentTypeLabel(row.payment_type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="payment_method" label="支付方式" width="120">
          <template #default="{ row }">
            {{ getPaymentMethodLabel(row.payment_method) }}
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
      </el-table>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="paymentDialogVisible = false">关闭</el-button>
          <el-button type="primary" @click="handlePrintPayments">
            打印记录
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 添加支付对话框 -->
    <el-dialog
      v-model="addPaymentDialogVisible"
      title="添加支付记录"
      width="500px"
    >
      <el-form
        ref="paymentFormRef"
        :model="paymentForm"
        :rules="paymentRules"
        label-width="100px"
      >
        <el-form-item label="支付日期" prop="payment_date">
          <el-date-picker
            v-model="paymentForm.payment_date"
            type="datetime"
            placeholder="选择日期时间"
          />
        </el-form-item>
        <el-form-item label="金额" prop="amount">
          <el-input-number
            v-model="paymentForm.amount"
            :precision="2"
            :step="100"
            :min="0"
          />
        </el-form-item>
        <el-form-item label="支付类型" prop="payment_type">
          <el-select v-model="paymentForm.payment_type" placeholder="请选择类型">
            <el-option label="租金" value="rent" />
            <el-option label="押金" value="deposit" />
            <el-option label="水电费" value="utility" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="支付方式" prop="payment_method">
          <el-select v-model="paymentForm.payment_method" placeholder="请选择支付方式">
            <el-option label="现金" value="cash" />
            <el-option label="银行转账" value="bank_transfer" />
            <el-option label="支付宝" value="alipay" />
            <el-option label="微信支付" value="wechat" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="paymentForm.description"
            type="textarea"
            :rows="3"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="addPaymentDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handlePaymentSubmit">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTenantStore } from '@/stores/tenantStore'
import { usePaymentStore } from '@/stores/paymentStore'
import { useLocationStore } from '@/stores/locationStore'
import { useRoomStore } from '@/stores/roomStore'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import dayjs from 'dayjs'

// Router
const router = useRouter()

// Store
const tenantStore = useTenantStore()
const paymentStore = usePaymentStore()
const locationStore = useLocationStore()
const roomStore = useRoomStore()

// 状态
const loading = ref(false)
const searchQuery = ref('')
const selectedStatus = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const dialogVisible = ref(false)
const dialogType = ref('add')
const formRef = ref(null)
const paymentDialogVisible = ref(false)
const addPaymentDialogVisible = ref(false)
const paymentFormRef = ref(null)
const currentTenant = ref(null)

// 表单数据
const form = ref({
  name: '',
  phone: '',
  email: '',
  status: 'active',
  location_id: null,
  room_id: null,
  check_in_date: null
})

// 支付表单数据
const paymentForm = ref({
  payment_date: '',
  amount: 0,
  payment_type: '',
  payment_method: '',
  description: ''
})

// 表单验证规则
const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
  location_id: [{ required: true, message: '请选择位置', trigger: 'change' }],
  room_id: [{ required: true, message: '请选择房间', trigger: 'change' }],
  check_in_date: [{ required: true, message: '请选择入住日期', trigger: 'change' }]
}

// 支付表单验证规则
const paymentRules = {
  payment_date: [{ required: true, message: '请选择支付日期', trigger: 'change' }],
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }],
  payment_type: [{ required: true, message: '请选择支付类型', trigger: 'change' }],
  payment_method: [{ required: true, message: '请选择支付方式', trigger: 'change' }]
}

// 计算属性
const locations = computed(() => locationStore.locations)
const availableRooms = computed(() => {
  if (!form.value.location_id) {
    return [];
  }
  try {
    const rooms = roomStore.roomsByLocation(form.value.location_id);
    return Array.isArray(rooms) ? rooms : [];
  } catch (error) {
    console.error('获取房间列表失败:', error);
    return [];
  }
})

const filteredTenants = computed(() => {
  let tenants = tenantStore.tenants;

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    tenants = tenants.filter(tenant => 
      tenant.name.toLowerCase().includes(query) ||
      tenant.phone.includes(query)
    );
  }

  if (selectedStatus.value) {
    tenants = tenants.filter(tenant => tenant.status === selectedStatus.value);
  }

  return tenants;
})

const currentTenantPayments = computed(() => 
  paymentStore.paymentsByTenant(currentTenant.value?.id)
)

// 方法
const formatDate = (date) => {
  return dayjs(date).format('YYYY-MM-DD')
}

const getPaymentTypeLabel = (type) => {
  const types = {
    rent: '租金',
    deposit: '押金',
    utility: '水电费',
    other: '其他'
  }
  return types[type] || type
}

const getPaymentTypeTag = (type) => {
  const types = {
    rent: 'success',
    deposit: 'warning',
    utility: 'info',
    other: ''
  }
  return types[type] || ''
}

const getPaymentMethodLabel = (method) => {
  const methods = {
    cash: '现金',
    bank_transfer: '银行转账',
    alipay: '支付宝',
    wechat: '微信支付',
    other: '其他'
  }
  return methods[method] || method
}

const handleSearch = () => {
  currentPage.value = 1
  fetchTenants()
}

const handleStatusChange = () => {
  currentPage.value = 1
  fetchTenants()
}

const handleSizeChange = (val) => {
  pageSize.value = val
  fetchTenants()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchTenants()
}

const handleLocationSelect = async () => {
  form.value.room_id = null;
  if (form.value.location_id) {
    try {
      await roomStore.fetchRooms();
    } catch (error) {
      ElMessage.error('获取房间列表失败');
    }
  }
}

const handleAdd = () => {
  dialogType.value = 'add'
  form.value = {
    name: '',
    phone: '',
    email: '',
    status: 'active',
    location_id: null,
    room_id: null,
    check_in_date: null
  }
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogType.value = 'edit'
  form.value = {
    ...row,
    check_in_date: row.check_in_date ? new Date(row.check_in_date) : null
  }
  dialogVisible.value = true
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除这个租户吗？', '提示', {
      type: 'warning'
    })
    await tenantStore.deleteTenant(row.id)
    ElMessage.success('删除成功')
    fetchTenants()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error(error.response?.data?.message || '删除失败')
    }
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    const submitData = {
      ...form.value,
      check_in_date: form.value.check_in_date ? dayjs(form.value.check_in_date).format('YYYY-MM-DD') : null
    }
    
    if (dialogType.value === 'add') {
      await tenantStore.createTenant(submitData)
      ElMessage.success('创建成功')
    } else {
      await tenantStore.updateTenant(submitData.id, submitData)
      ElMessage.success('更新成功')
    }
    
    dialogVisible.value = false
    fetchTenants()
  } catch (error) {
    console.error('操作失败:', error)
    ElMessage.error(error.response?.data?.message || '操作失败')
  }
}

const handleViewPayments = async (row) => {
  currentTenant.value = row
  await paymentStore.fetchPayments({ tenant_id: row.id })
  paymentDialogVisible.value = true
}

const handleAddPayment = (row) => {
  currentTenant.value = row
  paymentForm.value = {
    payment_date: new Date(),
    amount: 0,
    payment_type: 'rent',
    payment_method: 'cash',
    description: ''
  }
  addPaymentDialogVisible.value = true
}

const handlePaymentSubmit = async () => {
  if (!paymentFormRef.value) return
  
  try {
    await paymentFormRef.value.validate()
    
    await paymentStore.createPayment({
      ...paymentForm.value,
      tenant_id: currentTenant.value.id
    })
    
    ElMessage.success('添加支付记录成功')
    addPaymentDialogVisible.value = false
    await paymentStore.fetchPayments({ tenant_id: currentTenant.value.id })
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

const handlePrintPayments = () => {
  router.push(`/print-payment-history/${currentTenant.value.id}`)
}

const fetchTenants = async () => {
  loading.value = true
  try {
    await tenantStore.fetchTenants()
    total.value = tenantStore.tenants.length
  } catch (error) {
    console.error('获取租户列表失败:', error)
    ElMessage.error(error.response?.data?.message || '获取租户列表失败')
  } finally {
    loading.value = false
  }
}

// 初始化
onMounted(async () => {
  try {
    await Promise.all([
      locationStore.fetchLocations(),
      roomStore.fetchRooms(),
      fetchTenants()
    ])
  } catch (error) {
    console.error('初始化数据失败:', error)
    ElMessage.error('初始化数据失败')
  }
})
</script>

<style scoped>
.tenant-container {
  padding: 20px;
}

.operation-bar {
  margin-bottom: 20px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style> 