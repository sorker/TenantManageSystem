<template>
  <div class="print-payment-container">
    <!-- 顶部操作栏 -->
    <div class="operation-bar">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            @change="handleDateChange"
          />
        </el-col>
        <el-col :span="4">
          <el-select v-model="selectedType" placeholder="支付类型" @change="handleTypeChange">
            <el-option label="全部" value="" />
            <el-option label="租金" value="rent" />
            <el-option label="押金" value="deposit" />
            <el-option label="水电费" value="utility" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="handlePrint">
            <el-icon><Printer /></el-icon>打印
          </el-button>
        </el-col>
      </el-row>
    </div>

    <!-- 打印内容区域 -->
    <div ref="printContent" class="print-content">
      <!-- 打印头部 -->
      <div class="print-header">
        <h2>支付记录清单</h2>
        <div class="print-info">
          <p>打印时间：{{ currentTime }}</p>
          <p>租户：{{ tenantName }}</p>
          <p>房间号：{{ roomNumber }}</p>
        </div>
      </div>

      <!-- 支付记录表格 -->
      <el-table
        v-loading="loading"
        :data="filteredPayments"
        style="width: 100%"
        border
      >
        <el-table-column prop="payment_date" label="支付日期" width="120" />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getTypeTag(row.type)">
              {{ getTypeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="金额" width="120">
          <template #default="{ row }">
            ¥{{ row.amount.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="payment_method" label="支付方式" width="120">
          <template #default="{ row }">
            {{ getPaymentMethodLabel(row.payment_method) }}
          </template>
        </el-table-column>
        <el-table-column prop="description" label="说明" min-width="200" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTag(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>

      <!-- 打印底部 -->
      <div class="print-footer">
        <div class="summary">
          <p>总金额：¥{{ totalAmount.toFixed(2) }}</p>
          <p>记录数：{{ filteredPayments.length }} 条</p>
        </div>
        <div class="signature">
          <p>打印人：{{ currentUser }}</p>
          <p>日期：{{ currentDate }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { usePaymentStore } from '@/stores/paymentStore'
import { useTenantStore } from '@/stores/tenantStore'
import { Printer } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

// Store
const paymentStore = usePaymentStore()
const tenantStore = useTenantStore()

// 路由参数
const route = useRoute()
const tenantId = computed(() => route.params.id)

// 状态
const loading = ref(false)
const dateRange = ref([])
const selectedType = ref('')
const printContent = ref(null)
const tenantName = ref('')
const roomNumber = ref('')
const currentUser = ref('管理员') // 这里应该从用户状态获取

// 计算属性
const currentTime = computed(() => {
  return new Date().toLocaleString()
})

const currentDate = computed(() => {
  return new Date().toLocaleDateString()
})

const filteredPayments = computed(() => {
  let payments = paymentStore.paymentsByTenant(tenantId.value)

  if (dateRange.value && dateRange.value.length === 2) {
    const [start, end] = dateRange.value
    payments = payments.filter(payment => {
      const paymentDate = new Date(payment.payment_date)
      return paymentDate >= start && paymentDate <= end
    })
  }

  if (selectedType.value) {
    payments = payments.filter(payment => payment.type === selectedType.value)
  }

  return payments
})

const totalAmount = computed(() => {
  return filteredPayments.value.reduce((sum, payment) => sum + payment.amount, 0)
})

// 方法
const getTypeLabel = (type) => {
  const types = {
    rent: '租金',
    deposit: '押金',
    utility: '水电费',
    other: '其他'
  }
  return types[type] || type
}

const getTypeTag = (type) => {
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
    wechat: '微信支付',
    alipay: '支付宝',
    other: '其他'
  }
  return methods[method] || method
}

const getStatusLabel = (status) => {
  const statuses = {
    paid: '已支付',
    pending: '待支付',
    cancelled: '已取消',
    refunded: '已退款'
  }
  return statuses[status] || status
}

const getStatusTag = (status) => {
  const statuses = {
    paid: 'success',
    pending: 'warning',
    cancelled: 'info',
    refunded: 'danger'
  }
  return statuses[status] || ''
}

const handleDateChange = () => {
  fetchPayments()
}

const handleTypeChange = () => {
  fetchPayments()
}

const handlePrint = () => {
  const content = printContent.value.innerHTML
  const printWindow = window.open('', '_blank')
  
  printWindow.document.write(`
    <html>
      <head>
        <title>支付记录打印</title>
        <style>
          body { font-family: Arial, sans-serif; }
          .print-header { text-align: center; margin-bottom: 20px; }
          .print-info { margin: 20px 0; }
          .print-footer { margin-top: 20px; }
          .summary { margin-bottom: 20px; }
          .signature { text-align: right; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          @media print {
            .operation-bar { display: none; }
          }
        </style>
      </head>
      <body>
        ${content}
      </body>
    </html>
  `)
  
  printWindow.document.close()
  printWindow.print()
}

const fetchPayments = async () => {
  loading.value = true
  try {
    await paymentStore.fetchPayments()
    const tenant = await tenantStore.fetchTenantById(tenantId.value)
    tenantName.value = tenant.name
    roomNumber.value = tenant.room_number
  } catch (error) {
    ElMessage.error('获取支付记录失败')
  } finally {
    loading.value = false
  }
}

// 初始化
onMounted(async () => {
  await fetchPayments()
})
</script>

<style scoped>
.print-payment-container {
  padding: 20px;
}

.operation-bar {
  margin-bottom: 20px;
}

.print-content {
  background: #fff;
  padding: 20px;
}

.print-header {
  text-align: center;
  margin-bottom: 20px;
}

.print-info {
  margin: 20px 0;
  display: flex;
  justify-content: space-around;
}

.print-footer {
  margin-top: 20px;
  display: flex;
  justify-content: space-between;
}

.summary {
  font-weight: bold;
}

.signature {
  text-align: right;
}

@media print {
  .operation-bar {
    display: none;
  }
  
  .print-content {
    padding: 0;
  }
}
</style> 