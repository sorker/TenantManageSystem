const dateUtils = require('../../utils/date-utils');
const app = getApp();

Page({
  data: {
    loading: false,
    selectedFloor: '',
    selectedLocation: '',
    rooms: [],
    tenantsData: {},
    uniqueLocations: [],
    uniqueFloors: [],
    currentTenant: null,
    tenantDetailVisible: false,
    addPaymentVisible: false,
    activeTab: 'payment',
    currentPaymentHistory: [],
    paymentForm: {
      payment_date: new Date(),
      due_date: null,
      amount: 0,
      payment_type: 'rent',
      payment_method: 'cash',
      notes: ''
    }
  },

  onLoad() {
    this.loadTenantsData();
  },

  // 加载租客数据
  async loadTenantsData() {
    this.setData({ loading: true });
    try {
      const roomsResponse = await this.fetchRooms();
      console.log('获取到的房间数据:', roomsResponse);
      
      const rooms = roomsResponse.map(room => ({
        id: room.id,
        location_name: room.location.name,
        floor: room.floor,
        room_number: room.room_number,
        is_occupied: room.is_occupied
      }));
      console.log('处理后的房间数据:', rooms);

      const tenants = await this.fetchTenants();
      console.log('获取到的租客数据:', tenants);
      
      const tenantsData = {};
      const locations = new Set();
      const floors = new Set();

      // 收集所有地点和楼层
      rooms.forEach(room => {
        if (room.location_name) {
          locations.add(room.location_name);
        }
        if (room.floor) {
          floors.add(room.floor);
        }
      });

      const uniqueLocations = Array.from(locations).filter(Boolean).sort();
      const uniqueFloors = Array.from(floors).filter(Boolean).sort((a, b) => {
        const floorA = parseInt(a);
        const floorB = parseInt(b);
        return floorA - floorB;
      });

      console.log('唯一地点:', uniqueLocations);
      console.log('唯一楼层:', uniqueFloors);

      // 按地点和楼层组织租客数据
      for (const location of uniqueLocations) {
        for (const floor of uniqueFloors) {
          const key = `${location}-${floor}`;
          
          // 获取该楼层的租客
          const floorTenants = tenants.filter(t => {
            const room = rooms.find(r => r.id === t.room);
            return room && room.location_name === location && room.floor === floor;
          }).map(tenant => ({
            ...tenant,
            statusText: this.getPaymentStatusText(tenant),
            isOverdue: this.isTenantOverdue(tenant)
          })).sort((a, b) => {
            const roomA = rooms.find(r => r.id === a.room);
            const roomB = rooms.find(r => r.id === b.room);
            return roomA.room_number.localeCompare(roomB.room_number);
          });

          tenantsData[key] = floorTenants;
        }
      }

      console.log('处理后的租客数据:', tenantsData);

      this.setData({
        rooms,
        tenantsData,
        uniqueLocations,
        uniqueFloors
      });
    } catch (error) {
      console.error('加载数据失败:', error);
      wx.showToast({
        title: '加载数据失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 获取房间列表
  async fetchRooms() {
    try {
      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: `${app.globalData.baseUrl}/rooms/`,
          method: 'GET',
          success: (res) => resolve(res),
          fail: (err) => reject(err)
        });
      });
      return res.data;
    } catch (error) {
      console.error('获取房间列表失败:', error);
      throw error;
    }
  },

  // 获取租客列表
  async fetchTenants() {
    try {
      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: `${app.globalData.baseUrl}/tenants/`,
          method: 'GET',
          success: (res) => resolve(res),
          fail: (err) => reject(err)
        });
      });
      return res.data;
    } catch (error) {
      console.error('获取租客列表失败:', error);
      throw error;
    }
  },

  // 判断租客是否逾期
  isTenantOverdue(tenant) {
    if (!tenant.payment_frequency || !tenant.check_in_date) return false;

    if (!tenant.last_payment_date) {
      const checkInDate = new Date(tenant.check_in_date);
      const today = new Date();
      return today > checkInDate;
    }

    const lastRentPayment = tenant.payment_history
      .filter(p => p.payment_type === 'rent')
      .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))[0];

    if (!lastRentPayment) return false;

    const nextDueDate = dateUtils.calculateNextPaymentDate(
      new Date(lastRentPayment.due_date),
      tenant.payment_frequency
    );
    const today = new Date();
    return today > nextDueDate;
  },

  // 获取交租状态文本
  getPaymentStatusText(tenant) {
    if (!tenant.payment_frequency || !tenant.check_in_date) return '未设置交租周期';

    if (!tenant.last_payment_date) {
      const checkInDate = new Date(tenant.check_in_date);
      const today = new Date();
      const diffTime = today.getTime() - checkInDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? `逾期${diffDays}天` : `距离交租${-diffDays}天`;
    }

    const lastRentPayment = tenant.payment_history
      .filter(p => p.payment_type === 'rent')
      .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))[0];

    if (!lastRentPayment) return '未交租';

    const nextDueDate = dateUtils.calculateNextPaymentDate(
      new Date(lastRentPayment.due_date),
      tenant.payment_frequency
    );
    const today = new Date();
    const diffTime = nextDueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `逾期${-diffDays}天`;
    } else if (diffDays <= 7) {
      return `距离交租还有${diffDays}天`;
    }

    return '已交租';
  },

  // 处理楼层选择
  onFloorChange(e) {
    this.setData({
      selectedFloor: e.detail.value
    });
  },

  // 处理地点标签点击
  handleLocationTabClick(e) {
    const location = e.currentTarget.dataset.location;
    this.setData({
      selectedLocation: this.data.selectedLocation === location ? '' : location
    });
    console.log('选择的地点:', this.data.selectedLocation);
  },

  // 显示租客详情
  showTenantDetail(e) {
    const { tenant } = e.detail;
    this.setData({
      currentTenant: tenant,
      currentPaymentHistory: tenant.payment_history,
      tenantDetailVisible: true
    });
  },

  // 关闭租客详情
  handleDialogClose() {
    this.setData({
      tenantDetailVisible: false,
      currentTenant: null,
      currentPaymentHistory: []
    });
  },

  // 显示新增缴费对话框
  showAddPaymentDialog() {
    if (!this.data.currentTenant) return;

    let dueDate;
    if (this.data.currentTenant.last_payment_date) {
      const matchingPayments = this.data.currentPaymentHistory
        .filter(p => new Date(p.payment_date).getTime() === new Date(this.data.currentTenant.last_payment_date).getTime())
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
      
      const lastPayment = matchingPayments[matchingPayments.length - 1];
      
      if (lastPayment) {
        dueDate = dateUtils.calculateNextPaymentDate(
          new Date(lastPayment.due_date),
          this.data.currentTenant.payment_frequency
        );
      } else {
        dueDate = new Date(this.data.currentTenant.check_in_date);
      }
    } else {
      dueDate = new Date(this.data.currentTenant.check_in_date);
    }

    const amount = this.calculateRentAmount(
      this.data.currentTenant.rent_amount,
      this.data.currentTenant.payment_frequency
    );

    this.setData({
      addPaymentVisible: true,
      paymentForm: {
        payment_date: new Date(),
        due_date: dueDate,
        amount: amount,
        payment_method: 'cash',
        payment_type: 'rent',
        notes: ''
      }
    });
  },

  // 根据交租方式计算金额
  calculateRentAmount(baseAmount, frequency) {
    switch (frequency) {
      case 'monthly':
        return baseAmount;
      case 'quarterly':
        return baseAmount * 3;
      case 'semi_annual':
        return baseAmount * 6;
      case 'yearly':
        return baseAmount * 12;
      default:
        return baseAmount;
    }
  },

  // 处理缴费类型变更
  handlePaymentTypeChange(e) {
    const value = e.detail.value;
    if (!this.data.currentTenant) return;

    if (value === 'rent') {
      let dueDate;
      if (this.data.currentTenant.last_payment_date) {
        const matchingPayments = this.data.currentPaymentHistory
          .filter(p => 
            p.payment_type === 'rent' && 
            new Date(p.payment_date).getTime() === new Date(this.data.currentTenant.last_payment_date).getTime()
          )
          .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
        
        const lastPayment = matchingPayments[matchingPayments.length - 1];
        
        if (lastPayment) {
          dueDate = dateUtils.calculateNextPaymentDate(
            new Date(lastPayment.due_date),
            this.data.currentTenant.payment_frequency
          );
        } else {
          dueDate = new Date(this.data.currentTenant.check_in_date);
        }
      } else {
        dueDate = new Date(this.data.currentTenant.check_in_date);
      }

      this.setData({
        'paymentForm.due_date': dueDate,
        'paymentForm.amount': this.calculateRentAmount(
          this.data.currentTenant.rent_amount,
          this.data.currentTenant.payment_frequency
        )
      });
    } else {
      this.setData({
        'paymentForm.due_date': null,
        'paymentForm.amount': 0
      });
    }
  },

  // 提交缴费
  async submitPayment() {
    if (!this.data.currentTenant) return;
    
    try {
      const paymentData = {
        ...this.data.paymentForm,
        amount: Number(this.data.paymentForm.amount),
        tenant_id: this.data.currentTenant.id,
        payment_date: this.data.paymentForm.payment_date ? 
          dateUtils.formatDate(this.data.paymentForm.payment_date) : null,
        due_date: this.data.paymentForm.due_date ? 
          dateUtils.formatDate(this.data.paymentForm.due_date) : null
      };
      
      await wx.request({
        url: `${app.globalData.baseUrl}/payments/`,
        method: 'POST',
        data: paymentData
      });
      
      if (paymentData.payment_type === 'rent') {
        await wx.request({
          url: `${app.globalData.baseUrl}/tenants/${this.data.currentTenant.id}/`,
          method: 'PUT',
          data: {
            ...this.data.currentTenant,
            last_payment_date: paymentData.payment_date
          }
        });
      }
      
      wx.showToast({
        title: '缴费成功',
        icon: 'success'
      });
      
      this.setData({
        addPaymentVisible: false
      });
      
      await this.loadTenantsData();
      
      const updatedTenant = await this.fetchTenants();
      this.setData({
        currentTenant: updatedTenant.find(t => t.id === this.data.currentTenant.id),
        currentPaymentHistory: this.data.currentTenant.payment_history
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '缴费失败',
        icon: 'none'
      });
    }
  },

  // 删除缴费记录
  async deletePaymentRecord(e) {
    const { paymentId } = e.currentTarget.dataset;
    if (!this.data.currentTenant) return;
    
    try {
      const sameTypePayments = this.data.currentTenant.payment_history
        .filter(p => p.payment_type === this.data.currentTenant.payment_history.find(p => p.id === paymentId)?.payment_type)
        .sort((a, b) => {
          const dateA = new Date(a.payment_date);
          const dateB = new Date(b.payment_date);
          if (dateB.getTime() === dateA.getTime()) {
            return b.id - a.id;
          }
          return dateB.getTime() - dateA.getTime();
        });

      const latestPayment = sameTypePayments[0];

      if (latestPayment.id !== paymentId) {
        wx.showToast({
          title: '只能删除最近一次缴费记录',
          icon: 'none'
        });
        return;
      }

      const res = await wx.showModal({
        title: '警告',
        content: '确定要删除这条缴费记录吗？',
        confirmText: '确定',
        cancelText: '取消'
      });

      if (res.confirm) {
        await wx.request({
          url: `${app.globalData.baseUrl}/payments/${paymentId}/`,
          method: 'DELETE'
        });

        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });
        
        await this.loadTenantsData();
        
        const updatedTenant = await this.fetchTenants();
        this.setData({
          currentTenant: updatedTenant.find(t => t.id === this.data.currentTenant.id),
          currentPaymentHistory: this.data.currentTenant.payment_history
        });
      }
    } catch (error) {
      wx.showToast({
        title: error.message || '删除失败',
        icon: 'none'
      });
    }
  },

  // 获取指定地点的所有楼层
  getFloorsForLocation(location) {
    console.log('获取地点楼层:', location);
    // 获取该地点的所有房间
    const locationRooms = this.data.rooms.filter(r => r.location_name === location);
    console.log('该地点的房间:', locationRooms);
    
    // 获取所有楼层
    let floors = locationRooms.map(r => r.floor);
    console.log('所有楼层:', floors);
    
    // 去重并排序
    floors = Array.from(new Set(floors)).filter(Boolean).sort((a, b) => {
      // 将楼层转换为数字进行比较
      const floorA = parseInt(a);
      const floorB = parseInt(b);
      return floorA - floorB;
    });
    
    console.log('处理后的楼层:', floors);
    
    // 如果选择了楼层，只返回选中的楼层
    if (this.data.selectedFloor) {
      floors = floors.filter(floor => floor === this.data.selectedFloor);
    }
    
    return floors;
  },

  // 获取指定地点和楼层的所有租客
  getTenantsForLocationAndFloor(location, floor) {
    const key = `${location}-${floor}`;
    const tenants = this.data.tenantsData[key] || [];
    
    const floorRooms = this.data.rooms.filter(r => 
      r.location_name === location && 
      r.floor === floor
    );

    const allRooms = floorRooms.map(room => {
      const tenant = tenants.find(t => t.room === room.id);
      
      if (tenant) {
        return {
          ...tenant,
          room_number: room.room_number,
          statusText: this.getPaymentStatusText(tenant),
          isOverdue: this.isTenantOverdue(tenant)
        };
      } else {
        return {
          id: `empty-${room.id}`,
          room_number: room.room_number,
          name: '空置',
          phone: '',
          is_empty: true,
          statusText: '空置',
          isOverdue: false
        };
      }
    });

    return allRooms.sort((a, b) => {
      return a.room_number.localeCompare(b.room_number);
    });
  },

  // 切换标签页
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      activeTab: tab
    });
  },

  // 格式化日期
  formatDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  // 处理交租日期变更
  onPaymentDateChange(e) {
    this.setData({
      'paymentForm.payment_date': e.detail.value
    });
  },

  // 处理约定交租日期变更
  onDueDateChange(e) {
    this.setData({
      'paymentForm.due_date': e.detail.value
    });
  },

  // 处理金额变更
  onAmountChange(e) {
    this.setData({
      'paymentForm.amount': e.detail.value
    });
  },

  // 处理支付方式变更
  onPaymentMethodChange(e) {
    const methods = ['cash', 'wechat', 'alipay', 'bank'];
    this.setData({
      'paymentForm.payment_method': methods[e.detail.value]
    });
  },

  // 处理备注变更
  onNotesChange(e) {
    this.setData({
      'paymentForm.notes': e.detail.value
    });
  },

  // 获取交租周期标签
  getPaymentFrequencyLabel(frequency) {
    const labels = {
      'monthly': '月',
      'semi_annual': '半年',
      'quarterly': '季',
      'yearly': '年'
    };
    return labels[frequency] || frequency;
  },

  // 获取缴费方式标签
  getPaymentMethodLabel(method) {
    const labels = {
      'cash': '现金',
      'wechat': '微信',
      'alipay': '支付宝',
      'bank': '银行转账'
    };
    return labels[method] || method;
  },

  // 获取缴费类型标签
  getPaymentTypeLabel(type) {
    const labels = {
      'rent': '租金',
      'water': '水费',
      'electricity': '电费',
      'maintenance': '维修费'
    };
    return labels[type] || type;
  },
}); 