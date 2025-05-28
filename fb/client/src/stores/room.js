import { defineStore } from 'pinia';
import { roomApi } from '../api';

export const useRoomStore = defineStore('room', {
  state: () => ({
    rooms: [],
    currentRoom: null,
    loading: false,
    error: null
  }),

  getters: {
    getRoomById: (state) => (id) => {
      return state.rooms.find(room => room.id === id);
    },
    availableRooms: (state) => {
      return state.rooms.filter(room => !room.current_tenant_id);
    },
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
        this.rooms = response;
        return this.rooms;
      } catch (error) {
        this.error = error.message;
        throw new Error('获取房间列表失败');
      } finally {
        this.loading = false;
      }
    },

    async fetchRoomById(id) {
      this.loading = true;
      this.error = null;
      try {
        const response = await roomApi.getById(id);
        this.currentRoom = response;
        return response;
      } catch (error) {
        this.error = error.message;
        throw new Error('获取房间失败');
      } finally {
        this.loading = false;
      }
    },

    async addRoom(roomData) {
      try {
        const response = await roomApi.add(roomData);
        this.rooms.push(response);
        return response;
      } catch (error) {
        throw new Error('添加房间失败');
      }
    },

    async updateRoom(roomData) {
      try {
        const response = await roomApi.update(roomData.id, roomData);
        const index = this.rooms.findIndex(r => r.id === roomData.id);
        if (index !== -1) {
          this.rooms[index] = response;
        }
        return response;
      } catch (error) {
        throw new Error('更新房间失败');
      }
    },

    async deleteRoom(id) {
      try {
        await roomApi.delete(id);
        this.rooms = this.rooms.filter(room => room.id !== id);
        return true;
      } catch (error) {
        throw new Error('删除房间失败');
      }
    },

    async updateRoomFacilities(roomId, facilityIds) {
      try {
        const response = await roomApi.update(roomId, { facilityIds });
        const index = this.rooms.findIndex(r => r.id === roomId);
        if (index !== -1) {
          this.rooms[index] = response;
        }
        return response;
      } catch (error) {
        throw new Error('更新房间设施失败');
      }
    },

    clearCurrentRoom() {
      this.currentRoom = null;
    }
  }
}); 