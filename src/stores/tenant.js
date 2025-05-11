import { defineStore } from 'pinia';

export const useTenantStore = defineStore('tenant', {
  state: () => ({
    tenants: [],
    loading: false,
    error: null
  }),

  actions: {
    async fetchTenants() {
      this.loading = true;
      try {
        const tenants = await window.electronAPI.getTenants();
        this.tenants = tenants;
      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },

    async addTenant(tenant) {
      try {
        const newTenant = await window.electronAPI.addTenant(tenant);
        await this.fetchTenants();
        return newTenant;
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    async updateTenant(tenant) {
      try {
        await window.electronAPI.updateTenant(tenant);
        await this.fetchTenants();
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    async updateTenantContractImages(tenantId, images, deleteIds) {
      try {
        await window.electronAPI.updateTenantContractImages(tenantId, images, deleteIds);
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    async getTenantContractImages(tenantId) {
      try {
        return await window.electronAPI.getTenantContractImages(tenantId);
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    async deleteTenant(id) {
      try {
        await window.electronAPI.deleteTenant(id);
        await this.fetchTenants();
      } catch (error) {
        this.error = error.message;
      }
    },

    async getTenantPaymentHistory(tenantId) {
      try {
        return await window.electronAPI.getTenantPaymentHistory(tenantId);
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    async addPaymentRecord(payment) {
      try {
        const newPayment = await window.electronAPI.addPaymentRecord(payment);
        return newPayment;
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    async deletePaymentRecord(paymentId) {
      try {
        await window.electronAPI.deletePaymentRecord(paymentId);
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    }
  },

  getters: {
    activeTenants: (state) => state.tenants.filter(t => t.is_active),
    inactiveTenants: (state) => state.tenants.filter(t => !t.is_active)
  }
}); 