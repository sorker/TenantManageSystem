<template>
  <div class="statistics-container">
    <el-card class="statistics-card">
      <template #header>
        <div class="card-header">
          <span>支付统计</span>
        </div>
      </template>

      <!-- 时间范围选择 -->
      <div class="filter-section">
        <el-space>
          <el-radio-group v-model="dateType" @change="handleDateTypeChange">
            <el-radio-button value="year">年度统计</el-radio-button>
            <el-radio-button value="month">月度统计</el-radio-button>
          </el-radio-group>

          <el-date-picker
            v-if="dateType === 'year'"
            v-model="selectedYear"
            type="year"
            placeholder="选择年份"
            format="YYYY年"
            value-format="YYYY"
            @change="handleDateChange"
            :default-value="yearDefaultValue"
          />
          
          <el-date-picker
            v-else
            v-model="selectedMonth"
            type="month"
            placeholder="选择月份"
            format="YYYY年MM月"
            value-format="YYYY-MM"
            @change="handleDateChange"
            :default-value="monthDefaultValue"
          />

          <el-select
            v-model="selectedPaymentType"
            placeholder="选择费用类型"
            clearable
            style="width: 150px"
            @change="handlePaymentTypeChange"
            :loading="isLoadingTypes"
          >
            <el-option
              label="全部类型"
              value=""
            />
            <el-option
              v-for="type in paymentTypes"
              :key="type"
              :label="PAYMENT_TYPE_LABELS[type]"
              :value="type"
            />
          </el-select>

          <el-select
            v-model="selectedLocation"
            placeholder="选择位置"
            clearable
            style="width: 150px"
            @change="handleLocationChange"
            :loading="isLoadingLocations"
          >
            <el-option
              label="全部位置"
              value=""
            />
            <el-option
              v-for="location in locations"
              :key="location.id"
              :label="location.name"
              :value="location.id"
            />
          </el-select>
        </el-space>
      </div>

      <!-- 统计卡片 -->
      <div class="statistics-cards">
        <el-row :gutter="16">
          <el-col :span="6">
            <el-card shadow="hover">
              <div class="statistic-item">
                <div class="statistic-title">总收款金额</div>
                <div class="statistic-value">
                  ¥{{ formatNumber(totalAmount, 2) }}
                </div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="hover">
              <div class="statistic-item">
                <div class="statistic-title">{{ dateType === 'year' ? '本年收款' : '本月收款' }}</div>
                <div class="statistic-value">
                  ¥{{ formatNumber(currentPeriodTotal, 2) }}
                </div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="hover">
              <div class="statistic-item">
                <div class="statistic-title">{{ dateType === 'year' ? '本年笔数' : '本月笔数' }}</div>
                <div class="statistic-value">
                  {{ currentPeriodCount }}
                </div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="hover">
              <div class="statistic-item">
                <div class="statistic-title">准时率</div>
                <div class="statistic-value">
                  {{ formatNumber(onTimeRate, 2) }}%
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- 图表展示 -->
      <div class="charts-section">
        <el-row :gutter="16">
          <!-- 收款趋势图表 -->
          <el-col :span="24">
            <el-card>
              <template #header>
                <div class="card-header">
                  <span>收款趋势</span>
                </div>
              </template>
              <div ref="monthlyChartContainer" class="chart-container"></div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- 详细数据表格 -->
      <el-card class="detail-table-card">
        <template #header>
          <div class="card-header">
            <span>详细统计数据</span>
          </div>
        </template>
        <el-table
          :data="statisticsData"
          style="width: 100%"
          v-loading="loading"
          :border="true"
        >
          <el-table-column
            prop="payment_type"
            label="费用类型"
            min-width="120"
          >
            <template #default="{ row }">
              {{ getPaymentTypeLabel(row.payment_type) }}
            </template>
          </el-table-column>
          <el-table-column
            prop="payment_count"
            label="收款笔数"
            min-width="100"
          />
          <el-table-column
            prop="total_amount"
            label="总金额"
            min-width="120"
          >
            <template #default="{ row }">
              ¥{{ formatNumber(row.total_amount, 2) }}
            </template>
          </el-table-column>
          <el-table-column
            prop="average_amount"
            label="平均金额"
            min-width="120"
          >
            <template #default="{ row }">
              ¥{{ formatNumber(row.average_amount, 2) }}
            </template>
          </el-table-column>
          <el-table-column
            label="准时率"
            min-width="100"
          >
            <template #default="{ row }">
              {{ calculateOnTimeRate(row) }}%
            </template>
          </el-table-column>
          <el-table-column
            prop="average_overdue_days"
            label="平均逾期天数"
            min-width="120"
          />
        </el-table>
      </el-card>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { useStatisticsStore } from '../stores/statistics';
import { useLocationStore } from '../stores/location';
import * as echarts from 'echarts';

const statisticsStore = useStatisticsStore();
const locationStore = useLocationStore();

// 常量
const PAYMENT_TYPE_LABELS = {
  rent: '租金',
  deposit: '押金',
  utility: '水电费',
  other: '其他'
};

// 状态变量
const loading = ref(false);
const dateType = ref('month');
const selectedYear = ref(new Date().getFullYear().toString());
const selectedMonth = ref(new Date().toISOString().slice(0, 7));
const selectedPaymentType = ref('');
const selectedLocation = ref('');
const isLoadingTypes = ref(false);
const isLoadingLocations = ref(false);
const locations = ref([]);
const paymentTypes = ref(['rent', 'deposit', 'utility', 'other']);
const monthlyChartContainer = ref(null);
let monthlyChart = null;

// 计算属性
const yearDefaultValue = computed(() => new Date(selectedYear.value));
const monthDefaultValue = computed(() => new Date(selectedMonth.value));

const totalAmount = computed(() => {
  return statisticsStore.totalAmount;
});

const currentPeriodTotal = computed(() => {
  return statisticsStore.currentPeriodTotal;
});

const currentPeriodCount = computed(() => {
  return statisticsStore.currentPeriodCount;
});

const onTimeRate = computed(() => {
  return statisticsStore.onTimeRate;
});

const statisticsData = computed(() => {
  return statisticsStore.statisticsData;
});

// 方法
const handleDateTypeChange = () => {
  fetchStatistics();
};

const handleDateChange = () => {
  fetchStatistics();
};

const handlePaymentTypeChange = () => {
  fetchStatistics();
};

const handleLocationChange = () => {
  fetchStatistics();
};

const formatNumber = (num, digits = 0) => {
  return Number(num).toFixed(digits);
};

const getPaymentTypeLabel = (type) => {
  return PAYMENT_TYPE_LABELS[type] || type;
};

const calculateOnTimeRate = (row) => {
  if (!row.total_count) return 0;
  return formatNumber((row.on_time_count / row.total_count) * 100, 2);
};

const initChart = () => {
  if (!monthlyChartContainer.value) return;
  
  monthlyChart = echarts.init(monthlyChartContainer.value);
  updateChart();
};

const updateChart = () => {
  if (!monthlyChart) return;
  
  const chartData = statisticsStore.chartData;
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      data: ['收款金额', '收款笔数']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: chartData.dates
    },
    yAxis: [
      {
        type: 'value',
        name: '金额',
        axisLabel: {
          formatter: '¥{value}'
        }
      },
      {
        type: 'value',
        name: '笔数',
        axisLabel: {
          formatter: '{value}'
        }
      }
    ],
    series: [
      {
        name: '收款金额',
        type: 'bar',
        data: chartData.amounts
      },
      {
        name: '收款笔数',
        type: 'line',
        yAxisIndex: 1,
        data: chartData.counts
      }
    ]
  };
  
  monthlyChart.setOption(option);
};

const fetchStatistics = async () => {
  loading.value = true;
  try {
    const params = {
      dateType: dateType.value,
      year: selectedYear.value,
      month: selectedMonth.value,
      paymentType: selectedPaymentType.value,
      locationId: selectedLocation.value
    };
    
    await statisticsStore.fetchStatistics(params);
    updateChart();
  } catch (error) {
    ElMessage.error('获取统计数据失败');
  } finally {
    loading.value = false;
  }
};

const fetchLocations = async () => {
  isLoadingLocations.value = true;
  try {
    locations.value = await locationStore.fetchLocations();
  } catch (error) {
    ElMessage.error('获取位置列表失败');
  } finally {
    isLoadingLocations.value = false;
  }
};

// 生命周期钩子
onMounted(async () => {
  await Promise.all([
    fetchLocations(),
    fetchStatistics()
  ]);
  initChart();
  
  window.addEventListener('resize', () => {
    monthlyChart?.resize();
  });
});
</script>

<style scoped>
.statistics-container {
  padding: 20px;
}

.statistics-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-section {
  margin-bottom: 20px;
}

.statistics-cards {
  margin-bottom: 20px;
}

.statistic-item {
  text-align: center;
}

.statistic-title {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.statistic-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.chart-container {
  height: 400px;
}

.detail-table-card {
  margin-top: 20px;
}
</style> 