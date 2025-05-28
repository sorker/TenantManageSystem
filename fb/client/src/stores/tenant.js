import { defineStore } from 'pinia';
import { tenantApi } from '../api';

export const useTenantStore = defineStore('tenant', {
  state: () => ({
    tenants: [],
    currentTenant: null,
    loading: false,
    error: null
  }),

  getters: {
    getTenantById: (state) => (id) => {
      return state.tenants.find(tenant => tenant.id === id);
    },
    activeTenants: (state) => {
      return state.tenants.filter(tenant => tenant.is_active);
    }
  },

  actions: {
    async fetchTenants() {
      this.loading = true;
      this.error = null;
      try {
        const response = await tenantApi.getList();
        this.tenants = response;
        return this.tenants;
      } catch (error) {
        this.error = error.message;
        throw new Error('获取租客列表失败');
      } finally {
        this.loading = false;
      }
    },

    async addTenant(tenantData) {
      try {
        const response = await tenantApi.create(tenantData);
        this.tenants.push(response);
        return response;
      } catch (error) {
        throw new Error('添加租客失败');
      }
    },

    async updateTenant(tenantData) {
      try {
        const response = await tenantApi.update(tenantData.id, tenantData);
        const index = this.tenants.findIndex(t => t.id === tenantData.id);
        if (index !== -1) {
          this.tenants[index] = response;
        }
        return response;
      } catch (error) {
        throw new Error('更新租客失败');
      }
    },

    async deleteTenant(id) {
      try {
        await tenantApi.delete(id);
        this.tenants = this.tenants.filter(tenant => tenant.id !== id);
        return true;
      } catch (error) {
        throw new Error('删除租客失败');
      }
    },

    async terminateContract(tenantId) {
      try {
        const response = await tenantApi.terminateContract(tenantId);
        const index = this.tenants.findIndex(t => t.id === tenantId);
        if (index !== -1) {
          this.tenants[index] = response;
        }
        return response;
      } catch (error) {
        throw new Error('终止合同失败');
      }
    },

    async renewContract(tenantId) {
      try {
        const response = await tenantApi.renewContract(tenantId);
        const index = this.tenants.findIndex(t => t.id === tenantId);
        if (index !== -1) {
          this.tenants[index] = response;
        }
        return response;
      } catch (error) {
        throw new Error('续签合同失败');
      }
    },

    async getPaymentHistory(tenantId) {
      try {
        const response = await tenantApi.getPaymentHistory(tenantId);
        return response;
      } catch (error) {
        throw new Error('获取支付历史失败');
      }
    },

    async addPayment(paymentData) {
      try {
        const response = await tenantApi.addPayment(paymentData);
        return response;
      } catch (error) {
        throw new Error('添加支付记录失败');
      }
    },

    async deletePaymentRecord(paymentId) {
      try {
        await tenantApi.deletePaymentRecord(paymentId);
        return true;
      } catch (error) {
        throw new Error('删除支付记录失败');
      }
    },

    async getContractImages(tenantId) {
      try {
        const response = await tenantApi.getContractImages(tenantId);
        return response;
      } catch (error) {
        throw new Error('获取合同文件失败');
      }
    }
  }
}); 