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
          >
            <template #default="{ row }">
              {{ formatNumber(row.average_overdue_days, 1) }}天
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </el-card>
  </div>
</template>

<script>
import { defineComponent, ref, onMounted, onUnmounted, nextTick, computed } from 'vue';
import * as echarts from 'echarts';
import dayjs from 'dayjs';

export default defineComponent({
  setup() {
    // 状态定义
    const dateType = ref('month'); // 'year' 或 'month'
    const selectedYear = ref(dayjs().format('YYYY'));
    const selectedMonth = ref(dayjs().format('YYYY-MM'));
    const selectedPaymentType = ref('');
    const loading = ref(false);
    const statisticsData = ref([]);
    const monthlyData = ref([]);
    const paymentMethodData = ref([]);
    const paymentTypes = ref([]);
    const isLoadingTypes = ref(true);
    const monthlyChartContainer = ref(null);
    const monthlyChartInstance = ref(null);
    const currentPeriodTotal = ref(0);
    const currentPeriodCount = ref(0);

    // 统计指标
    const totalAmount = ref(0);
    const totalCount = ref(0);
    const onTimeRate = ref(0);
    const averageOverdueDays = ref(0);

    // 费用类型映射
    const PAYMENT_TYPE_LABELS = {
      'rent': '租金',
      'water': '水费',
      'electricity': '电费',
      'property': '物业费'
    };

    // 添加独立的年度和月度时间选择
    const yearStatistics = ref({
      year: dayjs().format('YYYY')
    });
    const monthStatistics = ref({
      month: dayjs().format('YYYY-MM')
    });

    // 计算默认值
    const yearDefaultValue = computed(() => dayjs(yearStatistics.value.year).toDate());
    const monthDefaultValue = computed(() => dayjs(monthStatistics.value.month).toDate());

    // 格式化数字
    const formatNumber = (value, decimals = 0) => {
      if (value === null || value === undefined) return '0';
      return Number(value).toFixed(decimals);
    };

    // 计算准时率
    const calculateOnTimeRate = (row) => {
      const total = row.on_time_count + row.overdue_count;
      if (total === 0) return '0.00';
      return ((row.on_time_count / total) * 100).toFixed(2);
    };

    // 禁用未来日期
    const disabledDate = (time) => {
      return time > dayjs().endOf('day');
    };

    // 初始化图表
    const initCharts = () => {
      console.log('Initializing charts...');
      // 初始化月度趋势图表
      if (monthlyChartContainer.value && !monthlyChartInstance.value) {
        console.log('Creating chart instance...');
        monthlyChartInstance.value = echarts.init(monthlyChartContainer.value);
        console.log('Chart instance created:', monthlyChartInstance.value);
      }
    };

    // 更新月度趋势图表
    const updateMonthlyChart = () => {
      if (!monthlyChartInstance.value) {
        return;
      }

      let xAxisData = [];
      let seriesData = [];

      if (dateType.value === 'year') {
        // 使用后端返回的月度数据，已经包含了所有月份
        xAxisData = monthlyData.value.map(item => `${parseInt(item.month)}月`);
        seriesData = monthlyData.value.map(item => Number(item.total_amount || 0));
      } else {
        // 月度视图：显示1-31日
        const daysInMonth = dayjs(selectedMonth.value).daysInMonth();
        const dailyDataMap = new Map(
          monthlyData.value.map(item => [item.date.split('-')[2], item.total_amount || 0])
        );

        // 生成当月所有日期的数据
        for (let i = 1; i <= daysInMonth; i++) {
          const dayKey = String(i).padStart(2, '0');
          xAxisData.push(`${i}日`);
          seriesData.push(Number(dailyDataMap.get(dayKey) || 0));
        }
      }

      const option = {
        title: {
          text: dateType.value === 'year' ? '年度收款趋势' : '月度收款趋势',
          left: 'center'
        },
        tooltip: {
          trigger: 'axis',
          formatter: function(params) {
            const data = params[0];
            return `${data.name}<br/>${data.seriesName}: ¥${formatNumber(data.value, 2)}`;
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: xAxisData,
          axisLabel: {
            interval: 0,
            rotate: dateType.value === 'year' ? 0 : 30
          }
        },
        yAxis: {
          type: 'value',
          name: '金额 (元)',
          axisLabel: {
            formatter: (value) => `¥${formatNumber(value, 0)}`
          }
        },
        series: [{
          name: '收款金额',
          type: 'line',
          data: seriesData,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: {
            color: '#409EFF'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [{
                offset: 0,
                color: 'rgba(64,158,255,0.2)'
              }, {
                offset: 1,
                color: 'rgba(64,158,255,0)'
              }]
            }
          }
        }]
      };

      monthlyChartInstance.value.setOption(option, true);
    };

    // 获取费用类型显示名称
    const getPaymentTypeLabel = (type) => {
      return PAYMENT_TYPE_LABELS[type] || type;
    };

    // 加载费用类型
    const loadPaymentTypes = async () => {
      isLoadingTypes.value = true;
      try {
        const types = await window.electronAPI.getPaymentTypes();
        paymentTypes.value = types || [];
      } catch (error) {
        console.error('Failed to load payment types:', error);
        paymentTypes.value = [];
      } finally {
        isLoadingTypes.value = false;
      }
    };

    // 加载统计数据
    const loadStatistics = async () => {
      loading.value = true;
      try {
        let startDate, endDate;
        
        if (dateType.value === 'year') {
          const currentYear = yearStatistics.value.year;
          startDate = dayjs(currentYear).startOf('year');
          endDate = dayjs(currentYear).endOf('year');
        } else {
          const currentMonth = monthStatistics.value.month;
          startDate = dayjs(currentMonth).startOf('month');
          endDate = dayjs(currentMonth).endOf('month');
        }

        const params = {
          startDate: startDate.format('YYYY-MM-DD'),
          endDate: endDate.format('YYYY-MM-DD'),
          payment_type: selectedPaymentType.value || null
        };

        // 获取总体统计数据
        const stats = await window.electronAPI.getPaymentStatistics(params);
        statisticsData.value = stats;

        // 计算总计指标
        totalAmount.value = stats.reduce((sum, item) => sum + item.total_amount, 0);
        totalCount.value = stats.reduce((sum, item) => sum + item.payment_count, 0);
        
        const totalOnTime = stats.reduce((sum, item) => sum + item.on_time_count, 0);
        const totalPayments = stats.reduce((sum, item) => sum + item.payment_count, 0);
        onTimeRate.value = totalPayments > 0 ? (totalOnTime / totalPayments) * 100 : 0;

        // 获取月度统计数据
        const monthlyStats = await window.electronAPI.getMonthlyPaymentStatistics({
          year: dateType.value === 'year' ? yearStatistics.value.year : monthStatistics.value.month.split('-')[0],
          month: dateType.value === 'month' ? monthStatistics.value.month.split('-')[1] : null,
          payment_type: selectedPaymentType.value
        });
        
        monthlyData.value = monthlyStats;
        
        // 计算当前期间的总金额
        if (dateType.value === 'year') {
          currentPeriodTotal.value = monthlyStats.reduce((sum, item) => sum + (Number(item.total_amount) || 0), 0);
          currentPeriodCount.value = monthlyStats.reduce((sum, item) => sum + (Number(item.payment_count) || 0), 0);
        } else {
          currentPeriodTotal.value = monthlyStats.reduce((sum, item) => sum + (Number(item.total_amount) || 0), 0);
          currentPeriodCount.value = monthlyStats.reduce((sum, item) => sum + (Number(item.payment_count) || 0), 0);
        }

        // 确保图表已初始化并更新
        nextTick(() => {
          initCharts();
          updateMonthlyChart();
        });

      } catch (error) {
        console.error('Failed to load statistics:', error);
      } finally {
        loading.value = false;
      }
    };

    // 事件处理器
    const handleDateTypeChange = () => {
      loadStatistics();
    };

    const handleDateChange = () => {
      // 根据当前统计类型更新对应的时间值
      if (dateType.value === 'year') {
        yearStatistics.value.year = selectedYear.value;
      } else {
        monthStatistics.value.month = selectedMonth.value;
      }
      loadStatistics();
    };

    const handlePaymentTypeChange = () => {
      loadStatistics();
    };

    // 监听窗口大小变化
    const handleResize = () => {
      monthlyChartInstance.value?.resize();
    };

    onMounted(() => {
      nextTick(async () => {
        // 初始化年度和月度的时间值
        yearStatistics.value.year = selectedYear.value;
        monthStatistics.value.month = selectedMonth.value;
        await loadPaymentTypes();
        await loadStatistics();
        initCharts();
      });
      window.addEventListener('resize', handleResize);
    });

    // 确保在组件卸载时清理图表实例
    onUnmounted(() => {
      window.removeEventListener('resize', handleResize);
      if (monthlyChartInstance.value) {
        monthlyChartInstance.value.dispose();
        monthlyChartInstance.value = null;
      }
    });

    return {
      dateType,
      selectedYear,
      selectedMonth,
      yearStatistics,
      monthStatistics,
      selectedPaymentType,
      paymentTypes,
      isLoadingTypes,
      loading,
      statisticsData,
      totalAmount,
      totalCount,
      onTimeRate,
      averageOverdueDays,
      monthlyChartContainer,
      currentPeriodTotal,
      currentPeriodCount,
      handleDateTypeChange,
      handleDateChange,
      handlePaymentTypeChange,
      formatNumber,
      calculateOnTimeRate,
      getPaymentTypeLabel,
      PAYMENT_TYPE_LABELS,
      yearDefaultValue,
      monthDefaultValue,
    };
  },
});
</script>

<style scoped>
.statistics-container {
  padding: 24px;
}

.statistics-card {
  margin-bottom: 24px;
}

.filter-section {
  margin-bottom: 24px;
}

.statistics-cards {
  margin-bottom: 24px;
}

.charts-section {
  margin-bottom: 24px;
}

.detail-table-card {
  margin-top: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.statistic-item {
  text-align: center;
}

.statistic-title {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.statistic-value {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.chart-container {
  width: 100%;
  height: 400px;
  min-height: 400px;
}
</style>
