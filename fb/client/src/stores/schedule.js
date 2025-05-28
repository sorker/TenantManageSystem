import { defineStore } from 'pinia';
import { scheduleApi } from '../api';

export const useScheduleStore = defineStore('schedule', {
  state: () => ({
    schedules: [],
    currentSchedule: null,
    loading: false,
    error: null
  }),

  getters: {
    getScheduleById: (state) => (id) => {
      return state.schedules.find(schedule => schedule.id === id);
    },
    getSchedulesByDate: (state) => (date) => {
      return state.schedules.filter(schedule => 
        new Date(schedule.date).toDateString() === new Date(date).toDateString()
      );
    },
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
    async fetchSchedules() {
      this.loading = true;
      this.error = null;
      try {
        const response = await scheduleApi.getList();
        this.schedules = response;
        return this.schedules;
      } catch (error) {
        this.error = error.message;
        throw new Error('获取日程列表失败');
      } finally {
        this.loading = false;
      }
    },

    async addSchedule(scheduleData) {
      try {
        const response = await scheduleApi.add(scheduleData);
        this.schedules.push(response);
        return response;
      } catch (error) {
        throw new Error('添加日程失败');
      }
    },

    async updateSchedule(scheduleData) {
      try {
        const response = await scheduleApi.update(scheduleData);
        const index = this.schedules.findIndex(s => s.id === scheduleData.id);
        if (index !== -1) {
          this.schedules[index] = response;
        }
        return response;
      } catch (error) {
        throw new Error('更新日程失败');
      }
    },

    async deleteSchedule(id) {
      try {
        await scheduleApi.delete(id);
        this.schedules = this.schedules.filter(schedule => schedule.id !== id);
        return true;
      } catch (error) {
        throw new Error('删除日程失败');
      }
    },

    async getSchedulesByDateRange(startDate, endDate) {
      try {
        const response = await scheduleApi.getList({ startDate, endDate });
        return response;
      } catch (error) {
        throw new Error('获取日期范围内的日程失败');
      }
    },

    async getSchedulesByTenant(tenantId) {
      try {
        const response = await scheduleApi.getList({ tenantId });
        return response;
      } catch (error) {
        throw new Error('获取租客的日程失败');
      }
    },

    clearCurrentSchedule() {
      this.currentSchedule = null;
    }
  }
}); 