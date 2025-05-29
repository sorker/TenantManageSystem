import { defineStore } from 'pinia';
import { api } from '../api';

export const useStatisticsStore = defineStore('statistics', {
  state: () => ({
    loading: false,
    totalAmount: 0,
    currentPeriodTotal: 0,
    currentPeriodCount: 0,
    onTimeRate: 0,
    statisticsData: [],
    chartData: {
      dates: [],
      amounts: [],
      counts: []
    },
    filters: {
      dateRange: 'year',
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      paymentType: 'all',
      locationId: 'all'
    }
  }),

  getters: {
    formattedTotalAmount: (state) => {
      return state.totalAmount.toLocaleString('zh-CN', {
        style: 'currency',
        currency: 'CNY'
      });
    },
    formattedCurrentPeriodAmount: (state) => {
      return state.currentPeriodTotal.toLocaleString('zh-CN', {
        style: 'currency',
        currency: 'CNY'
      });
    },
    formattedOnTimeRate: (state) => {
      return `${(state.onTimeRate * 100).toFixed(1)}%`;
    }
  },

  actions: {
    async fetchStatistics(params) {
      this.loading = true;
      try {
        const response = await api.get('statistics/overview/', { params });
        this.totalAmount = response.totalAmount;
        this.currentPeriodTotal = response.currentPeriodTotal;
        this.currentPeriodCount = response.currentPeriodCount;
        this.onTimeRate = response.onTimeRate;
        this.statisticsData = response.statisticsData;
        this.chartData = response.chartData;
      } catch (error) {
        console.error('获取统计数据失败:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchPaymentTrends() {
      try {
        const params = {
          dateRange: this.filters.dateRange,
          year: this.filters.year,
          month: this.filters.month,
          paymentType: this.filters.paymentType,
          locationId: this.filters.locationId
        };

        const response = await api.get('/statistics/trends', { params });
        this.statisticsData = response.data;
        return this.statisticsData;
      } catch (error) {
        throw new Error('获取支付趋势数据失败');
      }
    },

    async fetchPaymentDetails() {
      try {
        const params = {
          dateRange: this.filters.dateRange,
          year: this.filters.year,
          month: this.filters.month,
          paymentType: this.filters.paymentType,
          locationId: this.filters.locationId
        };

        const response = await api.get('/statistics/details', { params });
        this.statisticsData = response.data;
        return this.statisticsData;
      } catch (error) {
        throw new Error('获取支付详情数据失败');
      }
    },

    updateFilters(filters) {
      this.filters = { ...this.filters, ...filters };
    },

    resetFilters() {
      this.filters = {
        dateRange: 'year',
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        paymentType: 'all',
        locationId: 'all'
      };
    }
  }
}); 