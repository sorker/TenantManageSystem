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
    getTenantById: (state) => (id) => {
      return state.tenants.find(tenant => tenant.id === id);
    },
    activeTenants: (state) => {
      return state.tenants.filter(tenant => tenant.is_active);
    },
    uniqueLocations: (state) => {
      const locations = new Set();
      state.tenants.forEach(tenant => {
        if (tenant.room?.location?.name) {
          locations.add(tenant.room.location.name);
        }
      });
      return Array.from(locations);
    }
  },

  actions: {
    async fetchTenants(params = {}) {
      this.loading = true;
      this.error = null;
      try {
        // 构建查询参数
        const queryParams = {};
        
        // 只有当参数存在且不为空时才添加到查询参数中
        if (params.is_active !== undefined && params.is_active !== null) {
          queryParams.is_active = params.is_active;
        }
        if (params.location && params.location.trim()) {
          queryParams.location = params.location;
        }
        if (params.room_number && params.room_number.trim()) {
          queryParams.room_number = params.room_number;
        }
        if (params.room && params.room !== '') {
          queryParams.room = params.room;
        }
        
        console.log('Fetching tenants with params:', queryParams);
        const response = await tenantApi.getList(queryParams);
        console.log('Tenants API response:', response);
        this.tenants = response;
        return response;
      } catch (error) {
        console.error('Error fetching tenants:', error);
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async addTenant(tenant) {
      try {
        const response = await tenantApi.create(tenant);
        await this.fetchTenants();
        return response;
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    async updateTenant(tenant) {
      try {
        const response = await tenantApi.update(tenant.id, tenant);
        await this.fetchTenants();
        return response;
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    async deleteTenant(id) {
      try {
        console.log('Deleting tenant with ID:', id);
        const response = await tenantApi.delete(id);
        console.log('Delete response:', response);
        await this.fetchTenants();
        return response;
      } catch (error) {
        console.error('Error deleting tenant:', error);
        this.error = error.message;
        throw error;
      }
    },

    async getPaymentHistory(tenantId) {
      try {
        const response = await tenantApi.getPaymentHistory(tenantId);
        return response;
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    async addPayment(payment) {
      try {
        const response = await tenantApi.addPayment(payment);
        return response;
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    async deletePaymentRecord(paymentId) {
      try {
        await tenantApi.deletePayment(paymentId);
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    async fetchRooms() {
      try {
        const response = await tenantApi.getRooms();
        return response;
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    async getTenantContractImages(tenantId) {
      try {
        const response = await tenantApi.getContractImages(tenantId);
        return response.data;
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    async terminateContract(tenantId) {
      try {
        await tenantApi.terminateContract(tenantId);
        await this.fetchTenants();
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    async renewContract(tenantId) {
      try {
        await tenantApi.renewContract(tenantId);
        await this.fetchTenants();
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    }
  }
}); 