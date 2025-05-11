<template>
  <div class="statistics-container">
    <el-card class="statistics-card">
      <template #header>
        <div class="card-header">
          <span>付款统计分析</span>
          <div class="header-controls">
            <el-select v-model="paymentType" placeholder="费用类型" style="margin-right: 15px">
              <el-option label="全部类型" value="" />
              <el-option label="房租" value="rent" />
              <el-option label="水电费" value="utility" />
              <el-option label="物业费" value="property" />
              <el-option label="其他" value="other" />
            </el-select>
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              @change="handleDateChange"
            />
          </div>
        </div>
      </template>

      <!-- 统计概览 -->
      <div class="statistics-overview">
        <el-row :gutter="20">
          <el-col :span="6" v-for="(item, index) in overviewData" :key="index">
            <el-card class="overview-item" shadow="hover">
              <el-tooltip :content="item.tooltip" placement="top">
                <div>
                  <div class="overview-value">{{ item.value }}</div>
                  <div class="overview-label">{{ item.label }}</div>
                  <div class="overview-trend" :class="item.trend">
                    {{ item.trendValue }}
                    <el-icon v-if="item.trend === 'up'"><ArrowUp /></el-icon>
                    <el-icon v-else><ArrowDown /></el-icon>
                  </div>
                </div>
              </el-tooltip>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- 图表区域 -->
      <div class="charts-container">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-card class="chart-card">
              <template #header>
                <div class="chart-header">
                  <span>收入趋势分析</span>
                  <el-radio-group v-model="trendTimeUnit" size="small">
                    <el-radio-button value="day">日</el-radio-button>
                    <el-radio-button value="month">月</el-radio-button>
                    <el-radio-button value="year">年</el-radio-button>
                  </el-radio-group>
                </div>
              </template>
              <div ref="trendChartRef" class="chart"></div>
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card class="chart-card">
              <template #header>
                <div class="chart-header">
                  <span>付款分析</span>
                  <el-radio-group v-model="analysisType" size="small">
                    <el-radio-button value="type">类型分布</el-radio-button>
                    <el-radio-button value="method">支付方式</el-radio-button>
                  </el-radio-group>
                </div>
              </template>
              <div ref="distributionChartRef" class="chart"></div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- 逾期分析 -->
      <el-card class="overdue-analysis">
        <template #header>
          <div class="chart-header">
            <span>逾期分析</span>
          </div>
        </template>
        <el-row :gutter="20">
          <el-col :span="12">
            <div ref="overdueChartRef" class="chart"></div>
          </el-col>
          <el-col :span="12">
            <div class="overdue-list">
              <h4>即将到期付款</h4>
              <el-table :data="upcomingPayments" style="width: 100%">
                <el-table-column prop="tenant_name" label="租户" width="100" />
                <el-table-column prop="due_date" label="到期日" width="100" />
                <el-table-column prop="amount" label="金额" width="100">
                  <template #default="scope">
                    ¥{{ scope.row.amount.toFixed(2) }}
                  </template>
                </el-table-column>
                <el-table-column prop="days_left" label="剩余天数" width="100">
                  <template #default="scope">
                    <el-tag :type="scope.row.days_left <= 3 ? 'danger' : 'warning'">
                      {{ scope.row.days_left }}天
                    </el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-col>
        </el-row>
      </el-card>

      <!-- 详细数据表格 -->
      <el-card class="payment-records">
        <template #header>
          <div class="table-header">
            <span>付款记录</span>
            <el-button type="primary" @click="exportData">导出数据</el-button>
          </div>
        </template>
        <el-table 
          :data="tableData" 
          style="width: 100%" 
          border
          v-loading="loading"
          @sort-change="handleSortChange">
          <el-table-column prop="payment_date" label="付款日期" sortable="custom" width="120">
            <template #default="scope">
              {{ formatDate(scope.row.payment_date) }}
            </template>
          </el-table-column>
          <el-table-column prop="due_date" label="到期日" width="120">
            <template #default="scope">
              {{ formatDate(scope.row.due_date) }}
            </template>
          </el-table-column>
          <el-table-column prop="tenant_name" label="租户" width="100" />
          <el-table-column prop="payment_type" label="费用类型" width="100">
            <template #default="scope">
              <el-tag :type="getPaymentTypeTag(scope.row.payment_type)">
                {{ getPaymentTypeLabel(scope.row.payment_type) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="amount" label="金额" width="120">
            <template #default="scope">
              ¥{{ scope.row.amount.toFixed(2) }}
            </template>
          </el-table-column>
          <el-table-column prop="payment_method" label="支付方式" width="100">
            <template #default="scope">
              <el-tag type="info">{{ scope.row.payment_method }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="scope">
              <el-tag :type="getPaymentStatusTag(scope.row)">
                {{ getPaymentStatus(scope.row) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="notes" label="备注" />
        </el-table>
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
      </el-card>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted, nextTick, watch } from 'vue'
import * as echarts from 'echarts'
import { ArrowUp, ArrowDown } from '@element-plus/icons-vue'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { ElMessage } from 'element-plus'

// 声明 electronAPI 类型
declare global {
  interface Window {
    electronAPI: {
      getPaymentOverview: (params: any) => Promise<any>
      getPaymentTrend: (params: any) => Promise<any>
      getPaymentDistribution: (params: any) => Promise<any>
      getOverdueAnalysis: (params: any) => Promise<any>
      getUpcomingPayments: () => Promise<any>
      getPaymentRecords: (params: any) => Promise<any>
      exportPaymentData: (params: any) => Promise<any>
    }
  }
}

// 检查 electronAPI 是否可用
const isElectronAPIAvailable = typeof window !== 'undefined' && window.electronAPI

// 状态变量
const dateRange = ref<[Date, Date]>([startOfMonth(subMonths(new Date(), 1)), endOfMonth(new Date())])
const paymentType = ref('')
const trendTimeUnit = ref('month')
const analysisType = ref('type')
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const tableData = ref([])
const upcomingPayments = ref([])
const chartsInitialized = ref(false)

// 图表容器引用
const trendChartRef = ref<HTMLElement | null>(null)
const distributionChartRef = ref<HTMLElement | null>(null)
const overdueChartRef = ref<HTMLElement | null>(null)

// 图表实例
let trendChartInstance: echarts.ECharts | null = null
let distributionChartInstance: echarts.ECharts | null = null
let overdueChartInstance: echarts.ECharts | null = null

// 统计概览数据
const overviewData = ref([
  {
    label: '本月收入',
    value: '¥0',
    trend: 'up',
    trendValue: '+0%',
    tooltip: '相比上月增长'
  },
  {
    label: '待收款项',
    value: '¥0',
    trend: 'up',
    trendValue: '0笔',
    tooltip: '未支付订单数量'
  },
  {
    label: '逾期金额',
    value: '¥0',
    trend: 'down',
    trendValue: '0笔',
    tooltip: '已逾期未支付订单'
  },
  {
    label: '收款率',
    value: '0%',
    trend: 'up',
    trendValue: '+0%',
    tooltip: '相比上月增长'
  }
])

// 格式化日期
const formatDate = (date: string) => {
  return format(new Date(date), 'yyyy-MM-dd')
}

// 获取付款类型标签
const getPaymentTypeLabel = (type: string) => {
  const types = {
    rent: '房租',
    utility: '水电费',
    property: '物业费',
    other: '其他'
  }
  return types[type] || type
}

// 获取付款类型标签样式
const getPaymentTypeTag = (type: string) => {
  const types = {
    rent: '',
    utility: 'success',
    property: 'warning',
    other: 'info'
  }
  return types[type] || 'info'
}

// 获取付款状态
const getPaymentStatus = (row: any) => {
  const dueDate = new Date(row.due_date)
  const today = new Date()
  if (today > dueDate) {
    return '已逾期'
  }
  return '正常'
}

// 获取付款状态标签样式
const getPaymentStatusTag = (row: any) => {
  return getPaymentStatus(row) === '已逾期' ? 'danger' : 'success'
}

// 销毁图表实例
const disposeCharts = () => {
  if (trendChartInstance) {
    trendChartInstance.dispose()
    trendChartInstance = null
  }
  if (distributionChartInstance) {
    distributionChartInstance.dispose()
    distributionChartInstance = null
  }
  if (overdueChartInstance) {
    overdueChartInstance.dispose()
    overdueChartInstance = null
  }
  chartsInitialized.value = false
}

// 初始化图表
const initCharts = async () => {
  if (chartsInitialized.value) return

  await nextTick()
  
  if (trendChartRef.value) {
    trendChartInstance = echarts.init(trendChartRef.value)
  }
  
  if (distributionChartRef.value) {
    distributionChartInstance = echarts.init(distributionChartRef.value)
  }
  
  if (overdueChartRef.value) {
    overdueChartInstance = echarts.init(overdueChartRef.value)
  }

  chartsInitialized.value = true
}

// 更新趋势图表
const updateTrendChart = (data: any) => {
  if (!trendChartInstance) return

  const option = {
    title: {
      text: '收入趋势'
    },
    tooltip: {
      trigger: 'axis',
      formatter: '{b}: ¥{c}'
    },
    xAxis: {
      type: 'category',
      data: data?.labels || []
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '¥{value}'
      }
    },
    series: [{
      data: data?.values || [],
      type: 'line',
      smooth: true,
      areaStyle: {
        opacity: 0.3
      }
    }]
  }
  trendChartInstance.setOption(option)
}

// 更新分布图表
const updateDistributionChart = (data: any) => {
  if (!distributionChartInstance) return

  const option = {
    title: {
      text: analysisType.value === 'type' ? '费用类型分布' : '支付方式分布'
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: ¥{c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [{
      type: 'pie',
      radius: '50%',
      data: data || [],
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  }
  distributionChartInstance.setOption(option)
}

// 更新逾期分析图表
const updateOverdueChart = (data: any) => {
  if (!overdueChartInstance) return

  const option = {
    title: {
      text: '逾期趋势'
    },
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['逾期金额', '逾期率']
    },
    xAxis: {
      type: 'category',
      data: data?.labels || []
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
        name: '比率',
        axisLabel: {
          formatter: '{value}%'
        }
      }
    ],
    series: [
      {
        name: '逾期金额',
        type: 'bar',
        data: data?.amounts || []
      },
      {
        name: '逾期率',
        type: 'line',
        yAxisIndex: 1,
        data: data?.rates || []
      }
    ]
  }
  overdueChartInstance.setOption(option)
}

// 加载数据
const loadData = async () => {
  if (!isElectronAPIAvailable) {
    ElMessage.error('Electron API 不可用')
    return
  }

  loading.value = true
  try {
    if (!chartsInitialized.value) {
      await initCharts()
    }

    // 1. 加载统计概览数据
    const overviewResult = await window.electronAPI.getPaymentOverview({
      startDate: dateRange.value[0],
      endDate: dateRange.value[1],
      paymentType: paymentType.value
    })
    
    overviewData.value = [
      {
        label: '本月收入',
        value: `¥${overviewResult.currentMonthIncome.toFixed(2)}`,
        trend: overviewResult.incomeGrowth >= 0 ? 'up' : 'down',
        trendValue: `${overviewResult.incomeGrowth > 0 ? '+' : ''}${overviewResult.incomeGrowth}%`,
        tooltip: '相比上月增长'
      },
      {
        label: '待收款项',
        value: `¥${overviewResult.pendingAmount.toFixed(2)}`,
        trend: 'up',
        trendValue: `${overviewResult.pendingCount}笔`,
        tooltip: '未支付订单数量'
      },
      {
        label: '逾期金额',
        value: `¥${overviewResult.overdueAmount.toFixed(2)}`,
        trend: 'down',
        trendValue: `${overviewResult.overdueCount}笔`,
        tooltip: '已逾期未支付订单'
      },
      {
        label: '收款率',
        value: `${overviewResult.collectionRate}%`,
        trend: overviewResult.collectionRateGrowth >= 0 ? 'up' : 'down',
        trendValue: `${overviewResult.collectionRateGrowth > 0 ? '+' : ''}${overviewResult.collectionRateGrowth}%`,
        tooltip: '相比上月增长'
      }
    ]

    // 2. 加载趋势图数据
    const trendResult = await window.electronAPI.getPaymentTrend({
      startDate: dateRange.value[0],
      endDate: dateRange.value[1],
      timeUnit: trendTimeUnit.value,
      paymentType: paymentType.value
    })
    updateTrendChart(trendResult)

    // 3. 加载分布图数据
    const distributionResult = await window.electronAPI.getPaymentDistribution({
      startDate: dateRange.value[0],
      endDate: dateRange.value[1],
      type: analysisType.value
    })
    updateDistributionChart(distributionResult)

    // 4. 加载逾期分析数据
    const overdueResult = await window.electronAPI.getOverdueAnalysis({
      startDate: dateRange.value[0],
      endDate: dateRange.value[1]
    })
    updateOverdueChart(overdueResult)

    // 5. 加载即将到期付款
    upcomingPayments.value = await window.electronAPI.getUpcomingPayments()

    // 6. 加载表格数据
    const { data, total: totalCount } = await window.electronAPI.getPaymentRecords({
      startDate: dateRange.value[0],
      endDate: dateRange.value[1],
      paymentType: paymentType.value,
      page: currentPage.value,
      pageSize: pageSize.value
    })
    
    tableData.value = data
    total.value = totalCount
  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

// 事件处理函数
const handleDateChange = () => {
  loadData()
}

const handleSortChange = (column: any) => {
  loadData()
}

const handleSizeChange = (val: number) => {
  pageSize.value = val
  loadData()
}

const handleCurrentChange = (val: number) => {
  currentPage.value = val
  loadData()
}

// 导出数据
const exportData = async () => {
  if (!isElectronAPIAvailable) {
    ElMessage.error('Electron API 不可用')
    return
  }

  try {
    await window.electronAPI.exportPaymentData({
      startDate: dateRange.value[0],
      endDate: dateRange.value[1],
      paymentType: paymentType.value
    })
    ElMessage.success('数据导出成功')
  } catch (error) {
    console.error('导出数据失败:', error)
    ElMessage.error('导出数据失败')
  }
}

// 监听数据变化
watch([paymentType, trendTimeUnit, analysisType], () => {
  loadData()
})

// 监听图表容器大小变化
const handleResize = () => {
  if (!chartsInitialized.value) return
  trendChartInstance?.resize()
  distributionChartInstance?.resize()
  overdueChartInstance?.resize()
}

window.addEventListener('resize', handleResize)

// 组件卸载时清理
onUnmounted(() => {
  disposeCharts()
  window.removeEventListener('resize', handleResize)
})

// 组件挂载后初始化
onMounted(async () => {
  await loadData()
})
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

.header-controls {
  display: flex;
  align-items: center;
}

.statistics-overview {
  margin-bottom: 30px;
}

.overview-item {
  text-align: center;
  padding: 20px;
}

.overview-value {
  font-size: 24px;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 10px;
}

.overview-label {
  color: #666;
  margin-bottom: 10px;
}

.overview-trend {
  font-size: 12px;
  &.up {
    color: #67C23A;
  }
  &.down {
    color: #F56C6C;
  }
}

.chart-card {
  margin-bottom: 20px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart {
  height: 300px;
}

.overdue-analysis {
  margin-bottom: 20px;
}

.overdue-list {
  padding: 0 20px;
}

.payment-records {
  margin-top: 20px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
