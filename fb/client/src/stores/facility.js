import { defineStore } from 'pinia';
import { facilityApi } from '../api';

export const useFacilityStore = defineStore('facility', {
  state: () => ({
    facilities: [],
    currentFacility: null,
    loading: false,
    error: null
  }),

  getters: {
    getFacilityById: (state) => (id) => {
      return state.facilities.find(facility => facility.id === id);
    },
    facilitiesWithStats: (state) => 
      (state.facilities || []).map(facility => ({
        ...facility,
        usageRate: facility.room_count > 0 
          ? (facility.room_count / (state.facilities?.length || 1) * 100).toFixed(1) 
          : 0
      })),
    getFacilitiesByRoom: (state) => (roomId) => 
      (state.facilities || []).filter(facility => 
        facility.room_ids && facility.room_ids.includes(roomId)
      ),
    getMostUsedFacilities: (state) => {
      return [...(state.facilities || [])]
        .sort((a, b) => b.room_count - a.room_count)
        .slice(0, 5);
    },
    getUnusedFacilities: (state) => 
      (state.facilities || []).filter(facility => facility.room_count === 0),
    facilitiesByUsageRate: (state) => {
      return [...(state.facilities || [])].sort((a, b) => {
        const rateA = a.room_count > 0 ? a.room_count / (state.facilities?.length || 1) : 0;
        const rateB = b.room_count > 0 ? b.room_count / (state.facilities?.length || 1) : 0;
        return rateB - rateA;
      });
    }
  },

  actions: {
    async fetchFacilities() {
      this.loading = true;
      this.error = null;
      try {
        const response = await facilityApi.getList();
        this.facilities = response;
        return this.facilities;
      } catch (error) {
        console.error('获取设施列表失败:', error);
        this.error = error.response?.data?.message || '获取设施列表失败';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchFacilityById(id) {
      this.loading = true;
      this.error = null;
      try {
        const response = await facilityApi.getById(id);
        this.currentFacility = response;
        return response;
      } catch (error) {
        console.error('获取设施详情失败:', error);
        this.error = error.response?.data?.message || '获取设施详情失败';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async addFacility(facilityData) {
      try {
        console.log('发送到服务器的数据:', facilityData);
        const response = await facilityApi.create(facilityData);
        console.log('服务器响应:', response);
        this.facilities.push(response);
        return response;
      } catch (error) {
        console.error('添加设施失败:', error);
        this.error = error.response?.data?.message || '添加设施失败';
        throw error;
      }
    },

    async updateFacility(facilityData) {
      try {
        const response = await facilityApi.update(facilityData.id, facilityData);
        const index = this.facilities.findIndex(f => f.id === facilityData.id);
        if (index !== -1) {
          this.facilities[index] = response;
        }
        return response;
      } catch (error) {
        console.error('更新设施失败:', error);
        this.error = error.response?.data?.message || '更新设施失败';
        throw error;
      }
    },

    async deleteFacility(id) {
      try {
        await axios.delete(`/api/facilities/${id}`);
        this.facilities = this.facilities.filter(facility => facility.id !== id);
        return true;
      } catch (error) {
        throw new Error('删除设施失败');
      }
    },

    clearCurrentFacility() {
      this.currentFacility = null;
    }
  }
}); 