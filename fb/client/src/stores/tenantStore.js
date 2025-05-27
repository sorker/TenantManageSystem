import { defineStore } from 'pinia';
import { tenantApi } from '@/api';

export const useTenantStore = defineStore('tenant', {
  state: () => ({
    tenants: [],
    currentTenant: null,
    loading: false,
    error: null
  }),

  getters: {
    activeTenants: (state) => state.tenants.filter(tenant => tenant.is_active),
    getTenantById: (state) => (id) => state.tenants.find(tenant => tenant.id === id)
  },

  actions: {
    async fetchTenants() {
      this.loading = true;
      this.error = null;
      try {
        const response = await tenantApi.getList();
        this.tenants = response.data;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchTenantById(id) {
      this.loading = true;
      this.error = null;
      try {
        const response = await tenantApi.getById(id);
        this.currentTenant = response.data;
        return response.data;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createTenant(tenantData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await tenantApi.create(tenantData);
        this.tenants.push(response.data);
        return response.data;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateTenant(id, tenantData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await tenantApi.update(id, tenantData);
        const index = this.tenants.findIndex(t => t.id === id);
        if (index !== -1) {
          this.tenants[index] = response.data;
        }
        return response.data;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deleteTenant(id) {
      this.loading = true;
      this.error = null;
      try {
        await tenantApi.delete(id);
        this.tenants = this.tenants.filter(t => t.id !== id);
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    clearCurrentTenant() {
      this.currentTenant = null;
    }
  }
}); 