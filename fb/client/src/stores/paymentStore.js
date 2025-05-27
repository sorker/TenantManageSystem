import { defineStore } from 'pinia';
import { paymentApi } from '@/api';

export const usePaymentStore = defineStore('payment', {
  state: () => ({
    payments: [],
    currentPayment: null,
    loading: false,
    error: null
  }),

  getters: {
    getPaymentById: (state) => (id) => 
      state.payments.find(payment => payment.id === id),
    paymentsByTenant: (state) => (tenantId) => 
      state.payments.filter(payment => payment.tenant_id === tenantId),
    paymentsByDate: (state) => (startDate, endDate) => 
      state.payments.filter(payment => 
        payment.payment_date >= startDate && payment.payment_date <= endDate
      ),
    paymentsByType: (state) => (type) => 
      state.payments.filter(payment => payment.payment_type === type),
    totalAmount: (state) => 
      state.payments.reduce((sum, payment) => sum + payment.amount, 0),
    totalAmountByTenant: (state) => (tenantId) => 
      state.payments
        .filter(payment => payment.tenant_id === tenantId)
        .reduce((sum, payment) => sum + payment.amount, 0),
    getLastPaymentByTenant: (state) => (tenantId) => {
      const tenantPayments = state.payments
        .filter(payment => payment.tenant_id === tenantId)
        .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
      return tenantPayments[0] || null;
    },
    getOverduePayments: (state) => {
      const today = new Date();
      return state.payments.filter(payment => 
        new Date(payment.due_date) < today && 
        (!payment.payment_date || new Date(payment.payment_date) > new Date(payment.due_date))
      );
    },
    amountByPaymentMethod: (state) => {
      return state.payments.reduce((acc, payment) => {
        const method = payment.payment_method;
        acc[method] = (acc[method] || 0) + payment.amount;
        return acc;
      }, {});
    },
    amountByPaymentType: (state) => {
      return state.payments.reduce((acc, payment) => {
        const type = payment.payment_type;
        acc[type] = (acc[type] || 0) + payment.amount;
        return acc;
      }, {});
    }
  },

  actions: {
    async fetchPayments(params = {}) {
      this.loading = true;
      this.error = null;
      try {
        const response = await paymentApi.getList(params);
        this.payments = response.data;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchPaymentById(id) {
      this.loading = true;
      this.error = null;
      try {
        const response = await paymentApi.getById(id);
        this.currentPayment = response.data;
        return response.data;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createPayment(paymentData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await paymentApi.create(paymentData);
        this.payments.push(response.data);
        return response.data;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updatePayment(id, paymentData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await paymentApi.update(id, paymentData);
        const index = this.payments.findIndex(p => p.id === id);
        if (index !== -1) {
          this.payments[index] = response.data;
        }
        return response.data;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deletePayment(id) {
      this.loading = true;
      this.error = null;
      try {
        await paymentApi.delete(id);
        this.payments = this.payments.filter(p => p.id !== id);
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    clearCurrentPayment() {
      this.currentPayment = null;
    }
  }
}); 