import { defineStore } from 'pinia';
import { locationApi } from '@/api';

export const useLocationStore = defineStore('location', {
  state: () => ({
    locations: [],
    currentLocation: null,
    loading: false,
    error: null
  }),

  getters: {
    getLocationById: (state) => (id) => 
      state.locations.find(location => location.id === id),
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
        this.locations = response.data;
      } catch (error) {
        this.error = error.message;
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
        this.currentLocation = response.data;
        return response.data;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createLocation(locationData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await locationApi.create(locationData);
        this.locations.push(response.data);
        return response.data;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateLocation(id, locationData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await locationApi.update(id, locationData);
        const index = this.locations.findIndex(l => l.id === id);
        if (index !== -1) {
          this.locations[index] = response.data;
        }
        return response.data;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deleteLocation(id) {
      this.loading = true;
      this.error = null;
      try {
        await locationApi.delete(id);
        this.locations = this.locations.filter(l => l.id !== id);
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    clearCurrentLocation() {
      this.currentLocation = null;
    }
  }
}); 