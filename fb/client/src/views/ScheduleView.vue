<template>
  <div class="schedule-container">
    <!-- 筛选区域 -->
    <div class="filter-section">
      <el-select
        v-model="selectedFloor"
        placeholder="选择楼层"
        clearable
        class="filter-select"
      >
        <el-option
          v-for="floor in uniqueFloors"
          :key="floor"
          :label="floor"
          :value="floor"
        />
      </el-select>
    </div>

    <!-- 日程展示区域 -->
    <div v-loading="loading" class="schedule-content">
      <template v-if="!loading && filteredLocations.length > 0">
        <template v-for="location in filteredLocations" :key="location">
          <div class="location-block">
            <h2 class="location-title">{{ location }}</h2>
            <div class="floors-container">
              <template v-for="floor in getFloorsForLocation(location)" :key="floor">
                <div class="floor-block">
                  <h3 class="floor-title">{{ floor }}层</h3>
                  <div class="rooms-grid">
                    <div
                      v-for="tenant in getTenantsForLocationAndFloor(location, floor)"
                      :key="tenant.id"
                      class="tenant-block"
                      :class="{ 'overdue': tenant.isOverdue, 'paid': !tenant.isOverdue }"
                      @click="showPaymentHistory(tenant)"
                    >
                      <div class="payment-status" :class="{ 'overdue': tenant.isOverdue, 'paid': !tenant.isOverdue }">
                        {{ tenant.statusText }}
                      </div>
                      <div class="tenant-info">
                        <div class="tenant-name">{{ tenant.name }}</div>
                        <div class="tenant-room">{{ tenant.room_number }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </template>
      </template>
      <el-empty v-else-if="!loading" description="暂无数据" />
    </div>

    <!-- 底部地点选择栏 -->
    <div class="location-tabs">
      <div 
        v-for="location in uniqueLocations" 
        :key="location"
        class="location-tab"
        :class="{ active: selectedLocation === location }"
        @click="handleLocationTabClick(location)"
      >
        {{ location }}
      </div>
    </div>

    <!-- 缴费历史对话框 -->
    <el-dialog
      v-model="paymentHistoryVisible"
      :title="`${currentTenant?.name || ''} 的缴费历史`"
      width="70%"
      class="payment-history-dialog"
      :before-close="handleDialogClose"
      destroy-on-close
    >
      <div class="payment-history-content">
        <div class="payment-history-header">
          <div class="tenant-info">
            <p>房间号：{{ currentTenant?.room_number }}</p>
            <p>租金：{{ currentTenant?.rent_amount }}元/{{ getPaymentFrequencyLabel(currentTenant?.payment_frequency) }}</p>
          </div>
          <el-button type="primary" @click="showAddPaymentDialog">
            新增缴费
          </el-button>
        </div>
        
        <el-table :data="currentPaymentHistory" style="width: 100%">
          <el-table-column prop="payment_date" label="缴费日期" width="120">
            <template #default="{ row }">
              {{ new Date(row.payment_date).toLocaleDateString() }}
            </template>
          </el-table-column>
          <el-table-column prop="due_date" label="约定日期" width="120">
            <template #default="{ row }">
              {{ row.due_date ? new Date(row.due_date).toLocaleDateString() : '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="amount" label="金额" width="100">
            <template #default="{ row }">
              {{ row.amount }}元
            </template>
          </el-table-column>
          <el-table-column prop="payment_type" label="类型" width="100">
            <template #default="{ row }">
              {{ getPaymentTypeLabel(row.payment_type) }}
            </template>
          </el-table-column>
          <el-table-column prop="payment_method" label="方式" width="100">
            <template #default="{ row }">
              {{ getPaymentMethodLabel(row.payment_method) }}
            </template>
          </el-table-column>
          <el-table-column prop="notes" label="备注" min-width="120" />
          <el-table-column label="操作" width="80" fixed="right">
            <template #default="{ row }">
              <el-button 
                v-if="isLatestPaymentOfType(row)"
                type="danger" 
                size="small"
                @click="deletePaymentRecord(row.id)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>

    <!-- 新增缴费对话框 -->
    <el-dialog
      v-model="addPaymentVisible"
      title="新增交租记录"
      width="90%"
      :before-close="handleAddPaymentDialogClose"
      destroy-on-close
    >
      <el-form
        ref="paymentFormRef"
        :model="paymentForm"
        :rules="paymentRules"
        label-width="100px"
      >
        <el-form-item label="交租日期" prop="payment_date">
          <el-date-picker
            v-model="paymentForm.payment_date"
            type="date"
            placeholder="选择日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="费用类别" prop="payment_type">
          <el-select v-model="paymentForm.payment_type" @change="handlePaymentTypeChange" style="width: 100%">
            <el-option label="租金" value="rent" />
            <el-option label="水费" value="water" />
            <el-option label="电费" value="electricity" />
            <el-option label="维修费" value="maintenance" />
          </el-select>
        </el-form-item>
        <el-form-item 
          label="约定交租日期" 
          prop="due_date"
          v-if="paymentForm.payment_type === 'rent'"
        >
          <el-date-picker
            v-model="paymentForm.due_date"
            type="date"
            placeholder="选择日期"
            :disabled="paymentForm.payment_type === 'rent'"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="金额" prop="amount">
          <div class="amount-input-group">
            <el-input-number 
              v-model="paymentForm.amount" 
              :min="0" 
              :precision="2"
              style="width: 100%"
            />
            <span v-if="paymentForm.payment_type === 'rent'" class="monthly-rent-hint">
              (月租:¥{{ currentTenant?.rent_amount || 0 }})
            </span>
          </div>
        </el-form-item>
        <el-form-item label="支付方式" prop="payment_method">
          <el-select v-model="paymentForm.payment_method" style="width: 100%">
            <el-option label="现金" value="cash" />
            <el-option label="微信" value="wechat" />
            <el-option label="支付宝" value="alipay" />
            <el-option label="银行转账" value="bank" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="notes">
          <el-input 
            v-model="paymentForm.notes"
            type="textarea"
            :rows="2"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="addPaymentVisible = false">取消</el-button>
          <el-button type="primary" @click="submitPayment">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue';
import { useTenantStore } from '../stores/tenant';
import { ElMessage, ElMessageBox } from 'element-plus';

const store = useTenantStore();
const selectedLocation = ref('');
const selectedFloor = ref('');
const rooms = ref([]);
const loading = ref(false);
const tenantsData = ref({});

// 获取所有唯一的地点
const uniqueLocations = computed(() => {
  const locations = new Set(rooms.value.map(r => r.location_name));
  return Array.from(locations).filter(Boolean).sort();
});

// 获取所有唯一的楼层
const uniqueFloors = computed(() => {
  const floors = new Set(rooms.value.map(r => r.floor));
  return Array.from(floors).filter(Boolean).sort();
});

// 根据筛选条件过滤地点
const filteredLocations = computed(() => {
  if (!selectedLocation.value) {
    return uniqueLocations.value;
  }
  return [selectedLocation.value];
});

// 获取指定地点的所有楼层
const getFloorsForLocation = (location) => {
  let floors = rooms.value
    .filter(r => r.location_name === location)
    .map(r => r.floor);
  return [...new Set(floors)].sort();
};

// 获取指定地点和楼层的租户
const getTenantsForLocationAndFloor = (location, floor) => {
  const roomNumbers = rooms.value
    .filter(r => r.location_name === location && r.floor === floor)
    .map(r => r.room_number);
  
  return Object.values(tenantsData.value)
    .filter(tenant => roomNumbers.includes(tenant.room_number))
    .sort((a, b) => a.room_number.localeCompare(b.room_number));
};

// 处理地点标签点击
const handleLocationTabClick = (location) => {
  selectedLocation.value = location;
};

// 监听筛选条件变化
watch([selectedLocation, selectedFloor], () => {
  fetchData();
});

// 获取数据
const fetchData = async () => {
  loading.value = true;
  try {
    const [roomsData, tenantsData] = await Promise.all([
      store.fetchRooms(),
      store.fetchTenants()
    ]);
    rooms.value = roomsData;
    tenantsData.value = tenantsData;
  } catch (error) {
    ElMessage.error('获取数据失败');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.schedule-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.filter-section {
  padding: 16px;
  background-color: #fff;
  border-bottom: 1px solid #dcdfe6;
}

.filter-select {
  width: 200px;
}

.schedule-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.location-block {
  margin-bottom: 24px;
}

.location-title {
  font-size: 18px;
  margin-bottom: 16px;
  color: #303133;
}

.floor-block {
  background-color: #fff;
  border-radius: 4px;
  padding: 16px;
  margin-bottom: 16px;
}

.floor-title {
  font-size: 16px;
  margin-bottom: 12px;
  color: #606266;
}

.rooms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.tenant-block {
  background-color: #f5f7fa;
  border-radius: 4px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.tenant-block:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.tenant-block.overdue {
  background-color: #fef0f0;
}

.tenant-block.paid {
  background-color: #f0f9eb;
}

.payment-status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 2px;
  display: inline-block;
  margin-bottom: 8px;
}

.payment-status.overdue {
  background-color: #f56c6c;
  color: #fff;
}

.payment-status.paid {
  background-color: #67c23a;
  color: #fff;
}

.tenant-info {
  font-size: 14px;
}

.tenant-name {
  font-weight: bold;
  margin-bottom: 4px;
}

.tenant-room {
  color: #909399;
}

.location-tabs {
  display: flex;
  padding: 12px 16px;
  background-color: #fff;
  border-top: 1px solid #dcdfe6;
  overflow-x: auto;
}

.location-tab {
  padding: 8px 16px;
  margin-right: 8px;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.3s;
}

.location-tab:hover {
  background-color: #f5f7fa;
}

.location-tab.active {
  background-color: #409eff;
  color: #fff;
}

.payment-history-dialog {
  .payment-history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .tenant-info {
    p {
      margin: 4px 0;
      color: #606266;
    }
  }
}

.amount-input-group {
  display: flex;
  align-items: center;
  gap: 8px;

  .monthly-rent-hint {
    color: #909399;
    font-size: 12px;
  }
}
</style> 