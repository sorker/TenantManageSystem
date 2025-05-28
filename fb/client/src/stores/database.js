import { defineStore } from 'pinia';
import axios from 'axios';

export const useDatabaseStore = defineStore('database', {
  state: () => ({
    tables: [],
    currentTable: null,
    tableSchema: [],
    tableData: []
  }),

  actions: {
    async fetchTables() {
      try {
        const response = await axios.get('/api/database/tables');
        this.tables = response.data;
        return this.tables;
      } catch (error) {
        throw new Error('获取数据表列表失败');
      }
    },

    async fetchTableSchema(tableName) {
      try {
        const response = await axios.get(`/api/database/schema/${tableName}`);
        this.tableSchema = response.data;
        return this.tableSchema;
      } catch (error) {
        throw new Error('获取表结构失败');
      }
    },

    async fetchTableData(tableName) {
      try {
        const response = await axios.get(`/api/database/data/${tableName}`);
        this.tableData = response.data;
        return this.tableData;
      } catch (error) {
        throw new Error('获取表数据失败');
      }
    },

    async deleteAllData(tableName) {
      try {
        await axios.delete(`/api/database/data/${tableName}/all`);
        return true;
      } catch (error) {
        throw new Error('删除所有数据失败');
      }
    },

    async deleteRow(tableName, conditions) {
      try {
        await axios.delete(`/api/database/data/${tableName}`, { data: conditions });
        return true;
      } catch (error) {
        throw new Error('删除数据失败');
      }
    },

    async batchDeleteRows(tableName, conditions) {
      try {
        await axios.delete(`/api/database/data/${tableName}/batch`, { data: conditions });
        return true;
      } catch (error) {
        throw new Error('批量删除数据失败');
      }
    }
  }
}); 