<template>
  <div class="statistics-container">
    <!-- 顶部卡片统计 -->
    <el-row :gutter="20" class="stat-cards">
      <el-col :span="6">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>总收入</span>
              <el-tag type="success">本月</el-tag>
            </div>
          </template>
          <div class="card-content">
            <div class="amount">¥{{ monthlyIncome.toFixed(2) }}</div>
            <div class="trend" :class="{ 'up': incomeTrend > 0, 'down': incomeTrend < 0 }">
              {{ Math.abs(incomeTrend) }}% {{ incomeTrend > 0 ? '↑' : '↓' }}
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>总房间数</span>
              <el-tag>总计</el-tag>
            </div>
          </template>
          <div class="card-content">
            <div class="amount">{{ totalRooms }}</div>
            <div class="sub-text">间</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>入住率</span>
              <el-tag type="warning">当前</el-tag>
            </div>
          </template>
          <div class="card-content">
            <div class="amount">{{ occupancyRate }}%</div>
            <el-progress :percentage="occupancyRate" :status="getOccupancyStatus(occupancyRate)" />
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>租户数</span>
              <el-tag type="info">当前</el-tag>
            </div>
          </template>
          <div class="card-content">
            <div class="amount">{{ totalTenants }}</div>
            <div class="sub-text">人</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="20" class="chart-row">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>收入趋势</span>
              <el-radio-group v-model="incomeTimeRange" size="small">
                <el-radio-button label="week">周</el-radio-button>
                <el-radio-button label="month">月</el-radio-button>
                <el-radio-button label="year">年</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div class="chart-container">
            <v-chart class="chart" :option="incomeChartOption" autoresize />
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>入住率趋势</span>
              <el-radio-group v-model="occupancyTimeRange" size="small">
                <el-radio-button label="week">周</el-radio-button>
                <el-radio-button label="month">月</el-radio-button>
                <el-radio-button label="year">年</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div class="chart-container">
            <v-chart class="chart" :option="occupancyChartOption" autoresize />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="chart-row">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>设施使用率</span>
            </div>
          </template>
          <div class="chart-container">
            <v-chart class="chart" :option="facilityChartOption" autoresize />
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>收入来源分布</span>
            </div>
          </template>
          <div class="chart-container">
            <v-chart class="chart" :option="incomeSourceChartOption" autoresize />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { usePaymentStore } from '@/stores/paymentStore'
import { useRoomStore } from '@/stores/roomStore'
import { useTenantStore } from '@/stores/tenantStore'
import { useFacilityStore } from '@/stores/facilityStore'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart, PieChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent
} from 'echarts/components'
import VChart from 'vue-echarts'
import { ElMessage } from 'element-plus'

// 注册 ECharts 组件
use([
  CanvasRenderer,
  LineChart,
  BarChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent
])

// Store
const paymentStore = usePaymentStore()
const roomStore = useRoomStore()
const tenantStore = useTenantStore()
const facilityStore = useFacilityStore()

// 状态
const loading = ref(false)
const incomeTimeRange = ref('month')
const occupancyTimeRange = ref('month')

// 统计数据
const monthlyIncome = ref(0)
const incomeTrend = ref(0)
const totalRooms = ref(0)
const occupancyRate = ref(0)
const totalTenants = ref(0)

// 图表配置
const incomeChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis'
  },
  xAxis: {
    type: 'category',
    data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  },
  yAxis: {
    type: 'value',
    name: '金额 (元)'
  },
  series: [{
    data: [1500, 2300, 1800, 2100, 1900, 2500, 2200],
    type: 'line',
    smooth: true,
    areaStyle: {}
  }]
}))

const occupancyChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis'
  },
  xAxis: {
    type: 'category',
    data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  },
  yAxis: {
    type: 'value',
    name: '入住率 (%)',
    max: 100
  },
  series: [{
    data: [85, 87, 86, 88, 89, 90, 88],
    type: 'line',
    smooth: true
  }]
}))

const facilityChartOption = computed(() => ({
  tooltip: {
    trigger: 'item'
  },
  legend: {
    orient: 'vertical',
    left: 'left'
  },
  series: [{
    type: 'pie',
    radius: '50%',
    data: [
      { value: 35, name: '家具' },
      { value: 25, name: '电器' },
      { value: 20, name: '基础设施' },
      { value: 20, name: '其他' }
    ],
    emphasis: {
      itemStyle: {
        shadowBlur: 10,
        shadowOffsetX: 0,
        shadowColor: 'rgba(0, 0, 0, 0.5)'
      }
    }
  }]
}))

const incomeSourceChartOption = computed(() => ({
  tooltip: {
    trigger: 'item'
  },
  legend: {
    orient: 'vertical',
    left: 'left'
  },
  series: [{
    type: 'pie',
    radius: '50%',
    data: [
      { value: 60, name: '租金' },
      { value: 20, name: '押金' },
      { value: 15, name: '水电费' },
      { value: 5, name: '其他' }
    ],
    emphasis: {
      itemStyle: {
        shadowBlur: 10,
        shadowOffsetX: 0,
        shadowColor: 'rgba(0, 0, 0, 0.5)'
      }
    }
  }]
}))

// 方法
const getOccupancyStatus = (rate) => {
  if (rate >= 90) return 'exception'
  if (rate >= 70) return 'warning'
  return 'success'
}

const fetchStatistics = async () => {
  loading.value = true
  try {
    // 获取收入统计
    const payments = await paymentStore.fetchPayments()
    monthlyIncome.value = payments.reduce((sum, payment) => sum + payment.amount, 0)
    
    // 获取房间统计
    const rooms = await roomStore.fetchRooms()
    totalRooms.value = rooms.length
    const occupiedRooms = rooms.filter(room => room.status === 'occupied').length
    occupancyRate.value = Math.round((occupiedRooms / totalRooms.value) * 100)
    
    // 获取租户统计
    const tenants = await tenantStore.fetchTenants()
    totalTenants.value = tenants.length
    
    // 获取设施统计
    await facilityStore.fetchFacilities()
    
    // 计算收入趋势
    const lastMonthIncome = 50000 // 模拟数据
    incomeTrend.value = Math.round(((monthlyIncome.value - lastMonthIncome) / lastMonthIncome) * 100)
  } catch (error) {
    ElMessage.error('获取统计数据失败')
  } finally {
    loading.value = false
  }
}

// 监听时间范围变化
watch([incomeTimeRange, occupancyTimeRange], () => {
  fetchStatistics()
})

// 初始化
onMounted(async () => {
  await fetchStatistics()
})
</script>

<style scoped>
.statistics-container {
  padding: 20px;
}

.stat-cards {
  margin-bottom: 20px;
}

.chart-row {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-content {
  text-align: center;
}

.amount {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 8px;
}

.sub-text {
  font-size: 14px;
  color: #909399;
}

.trend {
  font-size: 14px;
  &.up {
    color: #67c23a;
  }
  &.down {
    color: #f56c6c;
  }
}

.chart-container {
  height: 300px;
}

.chart {
  height: 100%;
}
</style> 