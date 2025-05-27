import { defineStore } from 'pinia';
import { scheduleApi } from '@/api';

export const useScheduleStore = defineStore('schedule', {
  state: () => ({
    schedules: [],
    currentSchedule: null,
    loading: false,
    error: null
  }),

  getters: {
    getScheduleById: (state) => (id) => 
      state.schedules.find(schedule => schedule.id === id),
    schedulesByDate: (state) => (startDate, endDate) => 
      state.schedules.filter(schedule => 
        schedule.date >= startDate && schedule.date <= endDate
      ),
    schedulesByType: (state) => (type) => 
      state.schedules.filter(schedule => schedule.type === type),
    schedulesByRoom: (state) => (roomId) => 
      state.schedules.filter(schedule => schedule.room_id === roomId),
    getUpcomingSchedules: (state) => {
      const today = new Date();
      return state.schedules
        .filter(schedule => new Date(schedule.date) >= today)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    },
    schedulesByLocation: (state) => (locationId) => 
      state.schedules.filter(schedule => 
        schedule.location_id === locationId
      ),
    getTodaySchedules: (state) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      return state.schedules.filter(schedule => {
        const scheduleDate = new Date(schedule.date);
        return scheduleDate >= today && scheduleDate < tomorrow;
      });
    },
    getWeekSchedules: (state) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      
      return state.schedules.filter(schedule => {
        const scheduleDate = new Date(schedule.date);
        return scheduleDate >= weekStart && scheduleDate < weekEnd;
      });
    },
    scheduleCountByType: (state) => {
      return state.schedules.reduce((acc, schedule) => {
        const type = schedule.type;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});
    }
  },

  actions: {
    async fetchSchedules(params = {}) {
      this.loading = true;
      this.error = null;
      try {
        const response = await scheduleApi.getList(params);
        this.schedules = response.data;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchScheduleById(id) {
      this.loading = true;
      this.error = null;
      try {
        const response = await scheduleApi.getById(id);
        this.currentSchedule = response.data;
        return response.data;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createSchedule(scheduleData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await scheduleApi.create(scheduleData);
        this.schedules.push(response.data);
        return response.data;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateSchedule(id, scheduleData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await scheduleApi.update(id, scheduleData);
        const index = this.schedules.findIndex(s => s.id === id);
        if (index !== -1) {
          this.schedules[index] = response.data;
        }
        return response.data;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deleteSchedule(id) {
      this.loading = true;
      this.error = null;
      try {
        await scheduleApi.delete(id);
        this.schedules = this.schedules.filter(s => s.id !== id);
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    clearCurrentSchedule() {
      this.currentSchedule = null;
    }
  }
}); 