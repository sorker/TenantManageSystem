const app = getApp()

Page({
  data: {
    selectedLocation: '',
    selectedFloor: '',
    rooms: [],
    loading: false,
    tenantsData: {},
    uniqueLocations: [],
    uniqueFloors: [],
    currentTenant: null,
    tenantDetailVisible: false,
    addPaymentVisible: false,
    currentPaymentHistory: [],
    activeTab: 'payment',
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
    // 确保baseUrl格式正确，末尾有斜杠
    if (app.globalData.baseUrl) {
      app.globalData.baseUrl = app.globalData.baseUrl.replace(/\/+$/, '') + '/'
    }
    
    // 检查网络状态
    wx.getNetworkType({
      success: (res) => {
        console.log('当前网络类型:', res.networkType)
        if (res.networkType === 'none') {
          wx.showToast({
            title: '请检查网络连接',
            icon: 'none',
            duration: 3000
          })
          return
        }
        this.loadTenantsData()
      },
      fail: (err) => {
        console.error('获取网络状态失败:', err)
        wx.showToast({
          title: '网络状态异常',
          icon: 'none',
          duration: 3000
        })
      }
    })
  },

  // 加载租客数据
  async loadTenantsData() {
    if (this.data.loading) return // 防止重复加载
    
    this.setData({ loading: true })
    try {
      console.log('开始加载租客数据')
      console.log('当前baseUrl:', app.globalData.baseUrl)
      
      // 使用测试数据
      const mockRooms = [
        {
          id: 1,
          location: { id: 1, name: "沉木桥", address: "10022号" },
          room_number: "101",
          floor: 1,
          is_occupied: true,
          facilities: [
            { id: 1, name: "热水器", description: "海尔" },
            { id: 2, name: "洗衣机", description: "美的" }
          ],
          current_tenant: {
            id: 1,
            name: "张三",
            phone: "13800138000",
            id_number: "331544422647789541",
            wechat_id: "zhangsan",
            check_in_date: "2024-01-01",
            rent_amount: "1200.00",
            payment_frequency: "monthly",
            is_active: true,
            is_deleted: false,
            last_payment_date: "2024-03-01",
            last_payment_amount: null,
            room: 1,
            room_number: "101",
            contract_images: [],
            payment_history: [
              {
                id: 1,
                payment_date: "2024-03-01",
                due_date: "2024-03-01",
                amount: "1200.00",
                payment_method: "wechat",
                payment_type: "rent",
                notes: ""
              }
            ]
          }
        },
        {
          id: 2,
          location: { id: 1, name: "沉木桥", address: "10022号" },
          room_number: "102",
          floor: 1,
          is_occupied: false,
          facilities: [],
          current_tenant: null
        },
        {
          id: 3,
          location: { id: 1, name: "沉木桥", address: "10022号" },
          room_number: "201",
          floor: 2,
          is_occupied: true,
          facilities: [],
          current_tenant: {
            id: 2,
            name: "李四",
            phone: "13900139000",
            id_number: "331544422647789542",
            wechat_id: "lisi",
            check_in_date: "2024-02-01",
            rent_amount: "1500.00",
            payment_frequency: "quarterly",
            is_active: true,
            is_deleted: false,
            last_payment_date: "2024-03-01",
            last_payment_amount: null,
            room: 3,
            room_number: "201",
            contract_images: [],
            payment_history: [
              {
                id: 2,
                payment_date: "2024-03-01",
                due_date: "2024-03-01",
                amount: "4500.00",
                payment_method: "alipay",
                payment_type: "rent",
                notes: ""
              }
            ]
          }
        }
      ];

      // 转换房间数据格式
      const rooms = mockRooms.map(room => ({
        id: room.id,
        location_name: room.location.name,
        floor: room.floor,
        room_number: room.room_number,
        is_occupied: room.is_occupied,
        current_tenant: room.current_tenant
      }));

      // 获取所有唯一的地点
      const uniqueLocations = Array.from(new Set(rooms.map(r => r.location_name))).filter(Boolean).sort();
      
      // 获取所有唯一的楼层
      const uniqueFloors = Array.from(new Set(rooms.map(r => r.floor))).filter(Boolean).sort();

      console.log('处理后的房间数据:', rooms);
      console.log('唯一地点:', uniqueLocations);
      console.log('唯一楼层:', uniqueFloors);

      // 处理数据
      const tenantsData = {};
      for (const location of uniqueLocations) {
        for (const floor of this.getFloorsForLocation(location, rooms)) {
          const key = `${location}-${floor}`;
          console.log('处理地点和楼层:', location, floor, 'key:', key);
          
          // 获取该楼层的租客
          const floorTenants = rooms.filter(r => 
            r.location_name === location && 
            r.floor === floor
          ).map(room => {
            const tenant = room.current_tenant;
            return {
              ...tenant,
              room_number: room.room_number, // 添加房间号
              statusText: this.getPaymentStatusText(tenant),
              isOverdue: this.isTenantOverdue(tenant)
            };
          }).sort((a, b) => a.room_number.localeCompare(b.room_number));

          console.log('该楼层的租客:', floorTenants);

          // 获取该楼层的所有房间
          const floorRooms = rooms.filter(r => 
            r.location_name === location && 
            r.floor === floor
          );

          console.log('该楼层的房间:', floorRooms);

          // 创建包含所有房间的数组
          const allRooms = floorRooms.map(room => {
            const tenant = floorTenants.find(t => t.id === room.id);
            if (tenant) {
              return {
                ...tenant,
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

          tenantsData[key] = allRooms.sort((a, b) => 
            a.room_number.localeCompare(b.room_number)
          );

          console.log('最终处理的数据:', key, tenantsData[key]);
        }
      }

      console.log('所有处理后的数据:', tenantsData);

      // 确保数据更新前进行验证
      if (!rooms || !uniqueLocations || !uniqueFloors || !tenantsData) {
        throw new Error('数据处理结果不完整')
      }

      this.setData({
        rooms,
        uniqueLocations,
        uniqueFloors,
        tenantsData,
        loading: false
      }, () => {
        console.log('数据更新完成，当前数据:', this.data);
      });
    } catch (error) {
      console.error('加载数据失败，详细错误:', error);
      wx.showToast({
        title: error.message || '加载数据失败',
        icon: 'none',
        duration: 3000
      });
      this.setData({ loading: false });
    }
  },

  // 获取房间数据
  async fetchRooms() {
    try {
      console.log('开始获取房间数据，URL:', `${app.globalData.baseUrl}api/rooms/`)
      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: `${app.globalData.baseUrl}api/rooms/`,
          method: 'GET',
          header: {
            'content-type': 'application/json',
            'Accept': 'application/json'
          },
          success: (res) => {
            console.log('请求成功，响应数据:', res)
            if (res && res.data) {
              resolve(res.data)
            } else {
              reject(new Error('响应数据格式错误'))
            }
          },
          fail: (err) => {
            console.error('请求失败:', err)
            reject(err)
          },
          complete: () => {
            console.log('请求完成')
          }
        })
      })

      if (!Array.isArray(res)) {
        throw new Error('房间数据格式错误')
      }

      return res
    } catch (error) {
      console.error('获取房间数据失败，详细错误:', error)
      throw error
    }
  },

  // 获取租客数据
  async fetchTenants() {
    try {
      console.log('开始获取租客数据，URL:', `${app.globalData.baseUrl}api/tenants/`)
      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: `${app.globalData.baseUrl}api/tenants/`,
          method: 'GET',
          header: {
            'content-type': 'application/json',
            'Accept': 'application/json'
          },
          success: (res) => {
            console.log('请求成功，响应数据:', res)
            if (res && res.data) {
              resolve(res.data)
            } else {
              reject(new Error('响应数据格式错误'))
            }
          },
          fail: (err) => {
            console.error('请求失败:', err)
            reject(err)
          },
          complete: () => {
            console.log('请求完成')
          }
        })
      })

      if (!Array.isArray(res)) {
        throw new Error('租客数据格式错误')
      }

      return res
    } catch (error) {
      console.error('获取租客数据失败，详细错误:', error)
      throw error
    }
  },

  // 获取指定地点的所有楼层
  getFloorsForLocation(location, rooms = this.data.rooms) {
    let floors = rooms
      .filter(r => r.location_name === location)
      .map(r => r.floor);

    // 如果选择了楼层，只返回选中的楼层
    if (this.data.selectedFloor) {
      floors = floors.filter(floor => floor === this.data.selectedFloor);
    }

    return Array.from(new Set(floors)).filter(Boolean).sort();
  },

  // 获取指定地点和楼层的所有租客
  getTenantsForLocationAndFloor(location, floor) {
    const key = `${location}-${floor}`
    const tenants = this.data.tenantsData[key] || []
    
    // 获取该楼层的所有房间
    const floorRooms = this.data.rooms.filter(r => 
      r.location_name === location && 
      r.floor === floor
    )

    // 创建包含所有房间的数组
    const allRooms = floorRooms.map(room => {
      if (room.current_tenant) {
        // 如果有租客，返回租客信息
        return {
          ...room.current_tenant,
          statusText: this.getPaymentStatusText(room.current_tenant),
          isOverdue: this.isTenantOverdue(room.current_tenant)
        }
      } else {
        // 如果没有租客，返回空房间信息
        return {
          id: `empty-${room.id}`,
          room_number: room.room_number,
          name: '空置',
          phone: '',
          is_empty: true,
          statusText: '空置',
          isOverdue: false
        }
      }
    })

    return allRooms.sort((a, b) => {
      // 按房间号排序
      return a.room_number.localeCompare(b.room_number)
    })
  },

  // 判断租客是否逾期
  isTenantOverdue(tenant) {
    // 如果是空房间，直接返回false
    if (!tenant || tenant.is_empty) {
      return false
    }

    if (!tenant.payment_frequency || !tenant.check_in_date) return false

    // 如果是第一次交租
    if (!tenant.last_payment_date) {
      const checkInDate = new Date(tenant.check_in_date)
      const today = new Date()
      return today > checkInDate
    }

    // 获取最近一次租金缴费记录
    const lastRentPayment = tenant.payment_history
      .filter(p => p.payment_type === 'rent')
      .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))[0]

    if (!lastRentPayment) return false

    // 计算下一次交租日期
    const nextDueDate = this.calculateNextPaymentDate(new Date(lastRentPayment.due_date), tenant.payment_frequency)
    const today = new Date()
    return today > nextDueDate
  },

  // 获取交租状态文本
  getPaymentStatusText(tenant) {
    // 如果是空房间，直接返回空置状态
    if (!tenant || tenant.is_empty) {
      return '空置'
    }

    if (!tenant.payment_frequency || !tenant.check_in_date) return '未设置交租周期'

    // 如果是第一次交租
    if (!tenant.last_payment_date) {
      const checkInDate = new Date(tenant.check_in_date)
      const today = new Date()
      const diffTime = today.getTime() - checkInDate.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays > 0 ? `逾期${diffDays}天` : `距离交租${-diffDays}天`
    }

    // 获取最近一次租金缴费记录
    const lastRentPayment = tenant.payment_history
      .filter(p => p.payment_type === 'rent')
      .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))[0]

    if (!lastRentPayment) return '未交租'

    // 计算下一次交租日期
    const nextDueDate = this.calculateNextPaymentDate(new Date(lastRentPayment.due_date), tenant.payment_frequency)
    const today = new Date()
    const diffTime = nextDueDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return `逾期${-diffDays}天`
    } else if (diffDays <= 7) {
      return `距离交租还有${diffDays}天`
    }

    return '已交租'
  },

  // 计算下一次交租日期
  calculateNextPaymentDate(lastPaymentDate, frequency) {
    const nextDate = new Date(lastPaymentDate)
    
    switch (frequency) {
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1)
        break
      case 'semi_annual':
        nextDate.setMonth(nextDate.getMonth() + 6)
        break
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3)
        break
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1)
        break
      default:
        nextDate.setMonth(nextDate.getMonth() + 1)
    }
    
    return nextDate
  },

  // 处理楼层选择
  handleFloorChange(e) {
    const index = e.detail.value
    this.setData({
      selectedFloor: this.data.uniqueFloors[index] || ''
    })
  },

  // 处理地点标签点击
  handleLocationTabClick(e) {
    const location = e.currentTarget.dataset.location
    if (this.data.selectedLocation === location) {
      // 如果点击的是当前选中的tab，则取消筛选
      this.setData({ selectedLocation: '' })
    } else {
      // 否则选中新的tab
      this.setData({ selectedLocation: location })
    }
  },

  // 显示租客详情
  showTenantDetail(e) {
    const tenant = e.currentTarget.dataset.tenant
    if (tenant.is_empty) return

    this.setData({
      currentTenant: tenant,
      currentPaymentHistory: tenant.payment_history,
      tenantDetailVisible: true
    })
  },

  // 关闭租客详情
  handleDialogClose() {
    this.setData({
      tenantDetailVisible: false,
      currentTenant: null,
      currentPaymentHistory: []
    })
  },

  // 获取交租周期标签
  getPaymentFrequencyLabel(frequency) {
    const labels = {
      'monthly': '月',
      'semi_annual': '半年',
      'quarterly': '季',
      'yearly': '年'
    }
    return labels[frequency] || frequency
  },

  // 获取缴费方式标签
  getPaymentMethodLabel(method) {
    const labels = {
      'cash': '现金',
      'wechat': '微信',
      'alipay': '支付宝',
      'bank': '银行转账'
    }
    return labels[method] || method
  },

  // 获取缴费类型标签
  getPaymentTypeLabel(type) {
    const labels = {
      'rent': '租金',
      'water': '水费',
      'electricity': '电费',
      'maintenance': '维修费'
    }
    return labels[type] || type
  },

  // 切换标签页
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
  },

  // 显示新增缴费对话框
  showAddPaymentDialog() {
    if (!this.data.currentTenant) return

    // 计算约定交租日期
    let dueDate
    if (this.data.currentTenant.last_payment_date) {
      // 如果有上次交租记录，获取上次约定交租日期
      const matchingPayments = this.data.currentPaymentHistory
        .filter(p => new Date(p.payment_date).getTime() === new Date(this.data.currentTenant.last_payment_date).getTime())
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
      
      const lastPayment = matchingPayments[matchingPayments.length - 1]
      
      if (lastPayment) {
        // 基于上次约定交租日期计算下一次约定交租日期
        dueDate = this.calculateNextPaymentDate(new Date(lastPayment.due_date), this.data.currentTenant.payment_frequency)
      } else {
        // 如果找不到上次约定交租日期，使用入住日期
        dueDate = new Date(this.data.currentTenant.check_in_date)
      }
    } else {
      // 如果没有交租记录，使用入住日期
      dueDate = new Date(this.data.currentTenant.check_in_date)
    }

    // 根据交租方式计算金额
    const amount = this.calculateRentAmount(this.data.currentTenant.rent_amount, this.data.currentTenant.payment_frequency)

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
    })
  },

  // 根据交租方式计算金额
  calculateRentAmount(baseAmount, frequency) {
    switch (frequency) {
      case 'monthly':
        return baseAmount
      case 'quarterly':
        return baseAmount * 3
      case 'semi_annual':
        return baseAmount * 6
      case 'yearly':
        return baseAmount * 12
      default:
        return baseAmount
    }
  },

  // 处理缴费类型变更
  handlePaymentTypeChange(e) {
    const type = e.detail.value
    if (!this.data.currentTenant) return

    if (type === 'rent') {
      // 如果切换到租金类型，重新计算约定交租日期和金额
      if (this.data.currentTenant.last_payment_date) {
        const matchingPayments = this.data.currentPaymentHistory
          .filter(p => 
            p.payment_type === 'rent' && 
            new Date(p.payment_date).getTime() === new Date(this.data.currentTenant.last_payment_date).getTime()
          )
          .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
        
        const lastPayment = matchingPayments[matchingPayments.length - 1]
        
        if (lastPayment) {
          this.setData({
            'paymentForm.due_date': this.calculateNextPaymentDate(new Date(lastPayment.due_date), this.data.currentTenant.payment_frequency)
          })
        } else {
          this.setData({
            'paymentForm.due_date': new Date(this.data.currentTenant.check_in_date)
          })
        }
      } else {
        this.setData({
          'paymentForm.due_date': new Date(this.data.currentTenant.check_in_date)
        })
      }
      // 设置租金金额
      this.setData({
        'paymentForm.amount': this.calculateRentAmount(this.data.currentTenant.rent_amount, this.data.currentTenant.payment_frequency)
      })
    } else {
      // 如果是其他费用类型，清空约定日期并设置金额为0
      this.setData({
        'paymentForm.due_date': null,
        'paymentForm.amount': 0
      })
    }
  },

  // 提交缴费
  async submitPayment() {
    if (!this.data.currentTenant) return
    
    try {
      const paymentData = {
        ...this.data.paymentForm,
        amount: Number(this.data.paymentForm.amount),
        tenant_id: this.data.currentTenant.id,
        payment_date: this.data.paymentForm.payment_date ? 
          new Date(this.data.paymentForm.payment_date).toISOString().split('T')[0] : null,
        due_date: this.data.paymentForm.due_date ? 
          new Date(this.data.paymentForm.due_date).toISOString().split('T')[0] : null
      }
      
      // 使用正确的 API 路径添加缴费记录
      await wx.request({
        url: `${app.globalData.baseUrl}/api/payments`,
        method: 'POST',
        data: paymentData
      })
      
      // 如果是租金类型，更新租客的最后交租日期
      if (this.data.paymentForm.payment_type === 'rent') {
        await wx.request({
          url: `${app.globalData.baseUrl}/api/tenants/${this.data.currentTenant.id}`,
          method: 'PUT',
          data: {
            ...this.data.currentTenant,
            last_payment_date: paymentData.payment_date
          }
        })
      }
      
      wx.showToast({
        title: '缴费成功',
        icon: 'success'
      })
      
      this.setData({ addPaymentVisible: false })
      
      // 重新加载租客数据以更新显示
      await this.loadTenantsData()
      
      // 重新获取当前租客的最新数据
      const res = await wx.request({
        url: `${app.globalData.baseUrl}/api/tenants/${this.data.currentTenant.id}`,
        method: 'GET'
      })
      
      this.setData({
        currentTenant: res.data,
        currentPaymentHistory: res.data.payment_history
      })
    } catch (error) {
      console.error('缴费失败:', error)
      wx.showToast({
        title: error.message || '缴费失败',
        icon: 'none'
      })
    }
  },

  // 删除缴费记录
  async deletePaymentRecord(e) {
    const paymentId = e.currentTarget.dataset.id
    if (!this.data.currentTenant) return
    
    try {
      // 获取同类型的所有记录并按缴费日期和ID排序
      const sameTypePayments = this.data.currentTenant.payment_history
        .filter(p => p.payment_type === this.data.currentTenant.payment_history.find(p => p.id === paymentId)?.payment_type)
        .sort((a, b) => {
          const dateA = new Date(a.payment_date)
          const dateB = new Date(b.payment_date)
          if (dateB.getTime() === dateA.getTime()) {
            return b.id - a.id
          }
          return dateB.getTime() - dateA.getTime()
        })

      // 获取最近一次缴费的记录
      const latestPayment = sameTypePayments[0]

      // 检查是否是最新记录
      if (latestPayment.id !== paymentId) {
        wx.showToast({
          title: '只能删除最近一次缴费记录',
          icon: 'none'
        })
        return
      }

      const res = await wx.showModal({
        title: '警告',
        content: '确定要删除这条缴费记录吗？',
        confirmText: '确定',
        cancelText: '取消'
      })
      
      if (!res.confirm) return
      
      // 使用正确的 API 路径删除缴费记录
      await wx.request({
        url: `${app.globalData.baseUrl}/api/payments/${paymentId}`,
        method: 'DELETE'
      })
      
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      })
      
      // 重新加载租客数据以更新显示
      await this.loadTenantsData()
      
      // 重新获取当前租客的最新数据
      const tenantRes = await wx.request({
        url: `${app.globalData.baseUrl}/api/tenants/${this.data.currentTenant.id}`,
        method: 'GET'
      })
      
      this.setData({
        currentTenant: tenantRes.data,
        currentPaymentHistory: tenantRes.data.payment_history
      })
    } catch (error) {
      console.error('删除失败:', error)
      wx.showToast({
        title: error.message || '删除失败',
        icon: 'none'
      })
    }
  },

  // 处理交租日期变更
  handlePaymentDateChange(e) {
    this.setData({
      'paymentForm.payment_date': e.detail.value
    })
  },

  // 处理约定交租日期变更
  handleDueDateChange(e) {
    this.setData({
      'paymentForm.due_date': e.detail.value
    })
  },

  // 处理金额输入
  handleAmountChange(e) {
    const value = e.detail.value
    // 确保输入的是有效的数字
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      this.setData({
        'paymentForm.amount': value
      })
    }
  },

  // 处理备注输入
  handleNotesChange(e) {
    this.setData({
      'paymentForm.notes': e.detail.value
    })
  },

  // 处理支付方式变更
  handlePaymentMethodChange(e) {
    const methods = ['cash', 'wechat', 'alipay', 'bank']
    this.setData({
      'paymentForm.payment_method': methods[e.detail.value]
    })
  },

  // 处理新增缴费对话框关闭
  handleAddPaymentDialogClose() {
    this.setData({
      addPaymentVisible: false,
      paymentForm: {
        payment_date: new Date(),
        due_date: null,
        amount: 0,
        payment_type: 'rent',
        payment_method: 'cash',
        notes: ''
      }
    })
  },

  // 判断是否是某个类型的最新缴费记录
  isLatestPaymentOfType(payment) {
    if (!this.data.currentPaymentHistory.length) return false
    
    // 获取同类型的所有缴费记录
    const sameTypePayments = this.data.currentPaymentHistory
      .filter(p => p.payment_type === payment.payment_type)
      .sort((a, b) => {
        const dateA = new Date(a.payment_date)
        const dateB = new Date(b.payment_date)
        if (dateB.getTime() === dateA.getTime()) {
          return b.id - a.id
        }
        return dateB.getTime() - dateA.getTime()
      })
    
    // 如果当前记录是第一条记录，则是最新的
    return sameTypePayments.length > 0 && 
           sameTypePayments[0].id === payment.id
  }
}) 