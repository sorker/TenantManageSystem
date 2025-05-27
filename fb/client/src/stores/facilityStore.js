import { defineStore } from 'pinia';
import { facilityApi } from '@/api';

export const useFacilityStore = defineStore('facility', {
  state: () => ({
    facilities: [],
    currentFacility: null,
    loading: false,
    error: null
  }),

  getters: {
    getFacilityById: (state) => (id) => 
      (state.facilities || []).find(facility => facility.id === id),
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
        this.facilities = response.data;
      } catch (error) {
        this.error = error.message;
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
        this.currentFacility = response.data;
        return response.data;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createFacility(facilityData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await facilityApi.create(facilityData);
        this.facilities.push(response.data);
        return response.data;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateFacility(id, facilityData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await facilityApi.update(id, facilityData);
        const index = this.facilities.findIndex(f => f.id === id);
        if (index !== -1) {
          this.facilities[index] = response.data;
        }
        return response.data;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deleteFacility(id) {
      this.loading = true;
      this.error = null;
      try {
        await facilityApi.delete(id);
        this.facilities = this.facilities.filter(f => f.id !== id);
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    clearCurrentFacility() {
      this.currentFacility = null;
    }
  }
}); 