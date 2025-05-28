import { defineStore } from 'pinia';
import { locationApi } from '../api';

export const useLocationStore = defineStore('location', {
  state: () => ({
    locations: [],
    currentLocation: null,
    loading: false,
    error: null
  }),

  getters: {
    getLocationById: (state) => (id) => {
      return state.locations.find(location => location.id === id);
    },
    locationsWithStats: (state) => 
      (state.locations || []).map(location => ({
        ...location,
        occupancyRate: location.room_count > 0 
          ? (location.tenant_count / location.room_count * 100).toFixed(1) 
          : 0
      }))
  },

  actions: {
    async fetchLocations() {
      this.loading = true;
      this.error = null;
      try {
        const response = await locationApi.getList();
        this.locations = response;
        return this.locations;
      } catch (error) {
        this.error = '获取位置列表失败';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchLocationById(id) {
      this.loading = true;
      this.error = null;
      try {
        const response = await locationApi.getById(id);
        this.currentLocation = response;
        return response;
      } catch (error) {
        this.error = '获取位置失败';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async addLocation(locationData) {
      try {
        console.log('发送到服务器的数据:', locationData);
        const response = await locationApi.create(locationData);
        console.log('服务器响应:', response);
        if (!response) {
          throw new Error('服务器返回数据为空');
        }
        this.locations.push(response);
        return response;
      } catch (error) {
        console.error('添加位置失败:', error);
        if (error.response) {
          console.error('错误响应:', error.response.data);
          console.error('错误状态:', error.response.status);
        }
        this.error = error.response?.data?.message || error.message || '添加位置失败';
        throw error;
      }
    },

    async updateLocation(locationData) {
      try {
        const response = await locationApi.update(locationData.id, locationData);
        const index = this.locations.findIndex(l => l.id === locationData.id);
        if (index !== -1) {
          this.locations[index] = response;
        }
        return response;
      } catch (error) {
        this.error = '更新位置失败';
        throw error;
      }
    },

    async deleteLocation(id) {
      try {
        await locationApi.delete(id);
        this.locations = this.locations.filter(location => location.id !== id);
        return true;
      } catch (error) {
        this.error = '删除位置失败';
        throw error;
      }
    },

    clearCurrentLocation() {
      this.currentLocation = null;
    }
  }
}); 