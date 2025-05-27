import { defineStore } from 'pinia';
import { roomApi } from '@/api';

export const useRoomStore = defineStore('room', {
  state: () => ({
    rooms: [],
    currentRoom: null,
    loading: false,
    error: null
  }),

  getters: {
    availableRooms: (state) => state.rooms.filter(room => !room.is_occupied),
    getRoomById: (state) => (id) => state.rooms.find(room => room.id === id),
    roomsByLocation: (state) => (locationId) => {
      if (!state.rooms || !locationId) return [];
      return state.rooms.filter(room => room.location_id === locationId);
    }
  },

  actions: {
    async fetchRooms() {
      this.loading = true;
      this.error = null;
      try {
        const response = await roomApi.getList();
        this.rooms = response.data;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchRoomById(id) {
      this.loading = true;
      this.error = null;
      try {
        const response = await roomApi.getById(id);
        this.currentRoom = response.data;
        return response.data;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createRoom(roomData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await roomApi.create(roomData);
        this.rooms.push(response.data);
        return response.data;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateRoom(id, roomData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await roomApi.update(id, roomData);
        const index = this.rooms.findIndex(r => r.id === id);
        if (index !== -1) {
          this.rooms[index] = response.data;
        }
        return response.data;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deleteRoom(id) {
      this.loading = true;
      this.error = null;
      try {
        await roomApi.delete(id);
        this.rooms = this.rooms.filter(r => r.id !== id);
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    clearCurrentRoom() {
      this.currentRoom = null;
    }
  }
}); 