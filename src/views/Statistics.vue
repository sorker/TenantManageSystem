<template>
  <div class="statistics-container">
    <!-- 总金额展示卡片 -->
    <el-row :gutter="20" class="total-stats">
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>总收租金额</span>
            </div>
          </template>
          <div class="total-amount">
            ¥{{ totalAmount.toLocaleString() }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>本年收租金额</span>
            </div>
          </template>
          <div class="total-amount">
            ¥{{ currentYearAmount.toLocaleString() }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>本月收租金额</span>
            </div>
          </template>
          <div class="total-amount">
            ¥{{ currentMonthAmount.toLocaleString() }}
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 月度统计图表 -->
    <el-card class="chart-card">
      <template #header>
        <div class="card-header">
          <span>月度收租统计</span>
          <el-select v-model="selectedYear" placeholder="选择年份" @change="updateMonthlyChart">
            <el-option
              v-for="year in availableYears"
              :key="year"
              :label="year + '年'"
              :value="year"
            />
          </el-select>
        </div>
      </template>
      <div ref="monthlyChartRef" style="height: 300px"></div>
    </el-card>

    <!-- 年度统计图表 -->
    <el-card class="chart-card">
      <template #header>
        <div class="card-header">
          <span>年度收租统计</span>
        </div>
      </template>
      <div ref="yearlyChartRef" style="height: 300px"></div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as echarts from 'echarts'

// 模拟数据
const totalAmount = ref(1250000)
const currentYearAmount = ref(320000)
const currentMonthAmount = ref(28000)

const selectedYear = ref(new Date().getFullYear())
const availableYears = [2022, 2023, 2024]

// 图表实例
let monthlyChart = null
let yearlyChart = null

// DOM引用
const monthlyChartRef = ref(null)
const yearlyChartRef = ref(null)

// 初始化月度图表
const initMonthlyChart = () => {
  monthlyChart = echarts.init(monthlyChartRef.value)
  const monthlyData = [25000, 28000, 32000, 30000, 29000, 28000, 31000, 35000, 33000, 30000, 29000, 32000]
  
  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: '{b}月: ¥{c}'
    },
    xAxis: {
      type: 'category',
      data: Array.from({length: 12}, (_, i) => i + 1)
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '¥{value}'
      }
    },
    series: [{
      data: monthlyData,
      type: 'bar',
      name: '月收租金额',
      itemStyle: {
        color: '#409EFF'
      }
    }]
  }
  
  monthlyChart.setOption(option)
}

// 初始化年度图表
const initYearlyChart = () => {
  yearlyChart = echarts.init(yearlyChartRef.value)
  const yearlyData = [280000, 320000, 350000]
  
  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: '{b}: ¥{c}'
    },
    xAxis: {
      type: 'category',
      data: availableYears
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '¥{value}'
      }
    },
    series: [{
      data: yearlyData,
      type: 'line',
      name: '年收租金额',
      smooth: true,
      itemStyle: {
        color: '#67C23A'
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
            color: 'rgba(103, 194, 58, 0.3)'
          }, {
            offset: 1,
            color: 'rgba(103, 194, 58, 0.1)'
          }]
        }
      }
    }]
  }
  
  yearlyChart.setOption(option)
}

// 更新月度图表数据
const updateMonthlyChart = () => {
  // 这里可以根据选择的年份获取对应的月度数据
  // 目前使用模拟数据
  initMonthlyChart()
}

// 监听窗口大小变化，调整图表大小
const handleResize = () => {
  monthlyChart?.resize()
  yearlyChart?.resize()
}

onMounted(() => {
  initMonthlyChart()
  initYearlyChart()
  window.addEventListener('resize', handleResize)
})

</script>

<style scoped>
.statistics-container {
  padding: 20px;
}

.total-stats {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.total-amount {
  font-size: 24px;
  font-weight: bold;
  color: #409EFF;
  text-align: center;
}

.chart-card {
  margin-bottom: 20px;
}

.el-card {
  margin-bottom: 20px;
}
</style> 