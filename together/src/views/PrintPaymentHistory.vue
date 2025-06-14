<template>
  <div class="print-page">
    <div class="print-header">
      <div class="header-actions">
        <el-select 
          v-model="selectedYear" 
          placeholder="选择年份"
          style="width: 120px;"
        >
          <el-option
            v-for="year in availableYears"
            :key="year"
            :label="year + '年'"
            :value="year"
          />
        </el-select>
        <el-button type="primary" @click="printData">打印</el-button>
        <el-button @click="goBack">返回</el-button>
      </div>
    </div>

    <div class="print-content" ref="printSection">
      <div class="print-title">
        <h2>{{ tenantName }} - {{ selectedYear }}年交租记录</h2>
      </div>
      
      <el-table
        :data="filteredPayments"
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

      <div class="summary-section">
        <p>总计：{{ filteredPayments.length }}笔交易</p>
        <p>总金额：¥{{ totalAmount }}</p>
        <p class="print-time">打印时间：{{ new Date().toLocaleString() }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useTenantStore } from '../stores/tenant';
import { ElMessage } from 'element-plus';

const router = useRouter();
const route = useRoute();
const store = useTenantStore();

const selectedYear = ref(new Date().getFullYear());
const paymentHistory = ref([]);
const tenantName = ref('');

// 获取可选年份
const availableYears = computed(() => {
  const years = new Set(paymentHistory.value.map(payment => 
    new Date(payment.payment_date).getFullYear()
  ));
  const currentYear = new Date().getFullYear();
  years.add(currentYear);
  return Array.from(years).sort((a, b) => b - a);
});

// 过滤后的数据
const filteredPayments = computed(() => {
  return paymentHistory.value.filter(payment => 
    new Date(payment.payment_date).getFullYear() === selectedYear.value
  );
});

// 计算总金额
const totalAmount = computed(() => {
  return filteredPayments.value.reduce((sum, payment) => sum + payment.amount, 0);
});

// 费用类型标签
const PAYMENT_TYPE_LABELS = {
  'rent': '租金',
  'water': '水费',
  'electricity': '电费',
  'maintenance': '维修费'
};

// 支付方式标签
const PAYMENT_METHOD_LABELS = {
  'cash': '现金',
  'wechat': '微信',
  'alipay': '支付宝',
  'bank': '银行转账'
};

const getPaymentTypeLabel = (type) => {
  return PAYMENT_TYPE_LABELS[type] || type;
};

const getPaymentMethodLabel = (method) => {
  return PAYMENT_METHOD_LABELS[method] || method;
};

// 返回上一页
const goBack = () => {
  router.back();
};

// 执行打印
const printData = () => {
  // 创建打印专用的 iframe
  let printFrame = document.createElement('iframe');
  printFrame.style.position = 'fixed';
  printFrame.style.right = '0';
  printFrame.style.bottom = '0';
  printFrame.style.width = '0';
  printFrame.style.height = '0';
  printFrame.style.border = '0';
  document.body.appendChild(printFrame);

  // 获取打印内容
  const printContent = document.querySelector('.print-content');
  if (!printContent) return;

  // 设置 iframe 内容
  const frameDoc = printFrame.contentWindow.document;
  frameDoc.open();
  frameDoc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${tenantName.value} - ${selectedYear.value}年交租记录</title>
      <meta charset="utf-8">
      <style>
        body {
          padding: 20px;
          font-family: Arial, sans-serif;
        }
        .print-title {
          text-align: center;
          margin-bottom: 20px;
        }
        .print-content {
          width: 100%;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th, td {
          border: 1px solid #000;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f0f0f0;
        }
        .summary-section {
          margin-top: 20px;
          text-align: right;
        }
        .print-time {
          margin-top: 10px;
          color: #666;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      ${printContent.innerHTML}
    </body>
    </html>
  `);
  frameDoc.close();

  // 等待图片加载完成后打印
  printFrame.onload = () => {
    try {
      printFrame.contentWindow.focus();
      printFrame.contentWindow.print();
    } catch (e) {
      console.error('打印失败:', e);
      ElMessage.error('打印失败，请重试');
    }
    // 延迟移除 iframe
    setTimeout(() => {
      document.body.removeChild(printFrame);
    }, 100);
  };
};

onMounted(async () => {
  const tenantId = route.params.id;
  if (!tenantId) {
    ElMessage.error('未找到租客信息');
    router.back();
    return;
  }

  try {
    const tenant = store.tenants.find(t => t.id === tenantId);
    if (tenant) {
      tenantName.value = tenant.name;
    }
    
    // 获取交租历史
    const history = await store.getTenantPaymentHistory(tenantId);
    paymentHistory.value = history;
  } catch (error) {
    console.error('获取数据失败:', error);
    ElMessage.error('获取数据失败');
  }
});
</script>

<style scoped>
.print-page {
  padding: 20px;
}

.print-header {
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  gap: 16px;
  align-items: center;
}

.print-content {
  background-color: white;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.print-title {
  text-align: center;
  margin-bottom: 20px;
}

.summary-section {
  margin-top: 20px;
  text-align: right;
  font-size: 14px;
}

.print-time {
  margin-top: 10px;
  color: #909399;
  font-size: 12px;
}

@media print {
  .header-actions {
    display: none;
  }
}
</style> 