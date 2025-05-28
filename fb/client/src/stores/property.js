import { defineStore } from 'pinia';
import { roomApi, locationApi, facilityApi } from '../api';

export const usePropertyStore = defineStore('property', {
  state: () => ({
    properties: [],
    locations: [],
    facilities: [],
    loading: false,
    error: null
  }),

  getters: {
    getPropertyById: (state) => (id) => {
      return state.properties.find(property => property.id === id);
    },
    propertiesByLocation: (state) => (locationId) => {
      return state.properties.filter(property => property.location_id === locationId);
    }
  },

  actions: {
    async fetchProperties() {
      this.loading = true;
      this.error = null;
      try {
        const response = await roomApi.getList();
        this.properties = response;
        return this.properties;
      } catch (error) {
        console.error('获取房屋列表失败:', error);
        this.error = error.response?.data?.message || '获取房屋列表失败';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchLocations() {
      try {
        const response = await locationApi.getList();
        this.locations = response;
        return this.locations;
      } catch (error) {
        console.error('获取位置列表失败:', error);
        throw error;
      }
    },

    async fetchFacilities() {
      try {
        const response = await facilityApi.getList();
        this.facilities = response;
        return this.facilities;
      } catch (error) {
        console.error('获取设施列表失败:', error);
        throw error;
      }
    },

    async addProperty(propertyData) {
      try {
        // 确保数据格式正确
        const formattedData = {
          ...propertyData,
          location_id: Number(propertyData.location_id),
          facilities: Array.isArray(propertyData.facilities) 
            ? propertyData.facilities.map(id => Number(id))
            : []
        };
        
        console.log('发送到服务器的数据:', formattedData);
        const response = await roomApi.create(formattedData);
        console.log('服务器响应:', response);
        
        // 确保返回的数据包含完整的位置和设施信息
        if (response) {
          const location = this.locations.find(l => l.id === response.location_id);
          const facilities = this.facilities.filter(f => 
            response.facilities?.includes(f.id)
          );
          
          const completeResponse = {
            ...response,
            location_name: location?.name,
            location_address: location?.address,
            facilities: facilities
          };
          
          this.properties.push(completeResponse);
          return completeResponse;
        }
        
        return response;
      } catch (error) {
        console.error('添加房屋失败:', error);
        this.error = error.response?.data?.message || '添加房屋失败';
        throw error;
      }
    },

    async updateProperty(propertyData) {
      try {
        // 确保数据格式正确
        const formattedData = {
          ...propertyData,
          location_id: Number(propertyData.location_id),
          facilities: Array.isArray(propertyData.facilities) 
            ? propertyData.facilities.map(id => Number(id))
            : []
        };
        
        console.log('发送到服务器的更新数据:', formattedData);
        const response = await roomApi.update(propertyData.id, formattedData);
        console.log('服务器更新响应:', response);
        
        // 确保返回的数据包含完整的位置和设施信息
        if (response) {
          const location = this.locations.find(l => l.id === response.location_id);
          const facilities = this.facilities.filter(f => 
            response.facilities?.includes(f.id)
          );
          
          const completeResponse = {
            ...response,
            location_name: location?.name,
            location_address: location?.address,
            facilities: facilities
          };
          
          const index = this.properties.findIndex(p => p.id === propertyData.id);
          if (index !== -1) {
            this.properties[index] = completeResponse;
          }
          return completeResponse;
        }
        
        return response;
      } catch (error) {
        console.error('更新房屋失败:', error);
        this.error = error.response?.data?.message || '更新房屋失败';
        throw error;
      }
    },

    async deleteProperty(id) {
      try {
        await roomApi.delete(id);
        this.properties = this.properties.filter(property => property.id !== id);
        return true;
      } catch (error) {
        console.error('删除房屋失败:', error);
        this.error = error.response?.data?.message || '删除房屋失败';
        throw error;
      }
    }
  }
}); 