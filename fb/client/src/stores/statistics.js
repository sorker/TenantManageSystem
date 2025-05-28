import { defineStore } from 'pinia';
import { api } from '../api';

export const useStatisticsStore = defineStore('statistics', {
  state: () => ({
    loading: false,
    statistics: {
      totalAmount: 0,
      currentPeriodAmount: 0,
      paymentCount: 0,
      onTimeRate: 0,
      trends: [],
      details: []
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
      return state.statistics.totalAmount.toLocaleString('zh-CN', {
        style: 'currency',
        currency: 'CNY'
      });
    },
    formattedCurrentPeriodAmount: (state) => {
      return state.statistics.currentPeriodAmount.toLocaleString('zh-CN', {
        style: 'currency',
        currency: 'CNY'
      });
    },
    formattedOnTimeRate: (state) => {
      return `${(state.statistics.onTimeRate * 100).toFixed(1)}%`;
    }
  },

  actions: {
    async fetchStatistics() {
      this.loading = true;
      try {
        const response = await api.get('/statistics', { params: this.filters });
        this.statistics = response;
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
        this.statistics.trends = response.data;
        return this.statistics.trends;
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
        this.statistics.details = response.data;
        return this.statistics.details;
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