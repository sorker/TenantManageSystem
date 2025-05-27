import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTestApp, typeInput, clickButton, selectOption, elementExists, elementText } from '../utils'
import TenantView from '@/views/TenantView.vue'
import { useTenantStore } from '@/stores/tenantStore'
import { useRoomStore } from '@/stores/roomStore'
import { useLocationStore } from '@/stores/locationStore'
import { usePaymentStore } from '@/stores/paymentStore'

// 模拟 store
vi.mock('@/stores/tenantStore', () => ({
  useTenantStore: vi.fn()
}))

vi.mock('@/stores/roomStore', () => ({
  useRoomStore: vi.fn()
}))

vi.mock('@/stores/locationStore', () => ({
  useLocationStore: vi.fn()
}))

vi.mock('@/stores/paymentStore', () => ({
  usePaymentStore: vi.fn()
}))

describe('TenantView.vue', () => {
  let wrapper
  let tenantStore
  let roomStore
  let locationStore
  let paymentStore

  beforeEach(() => {
    // 重置模拟
    vi.clearAllMocks()

    // 设置 store 模拟
    tenantStore = {
      tenants: [
        { id: 1, name: '张三', phone: '13800138000', status: 'active' },
        { id: 2, name: '李四', phone: '13900139000', status: 'inactive' }
      ],
      fetchTenants: vi.fn().mockResolvedValue([]),
      createTenant: vi.fn().mockResolvedValue({}),
      updateTenant: vi.fn().mockResolvedValue({}),
      deleteTenant: vi.fn().mockResolvedValue({})
    }

    roomStore = {
      rooms: [
        { id: 1, room_number: '101', status: 'available', location_id: 1 },
        { id: 2, room_number: '102', status: 'occupied', location_id: 1 }
      ],
      fetchRooms: vi.fn().mockResolvedValue([]),
      roomsByLocation: vi.fn().mockImplementation((locationId) => {
        return roomStore.rooms.filter(room => room.location_id === locationId)
      })
    }

    locationStore = {
      locations: [
        { id: 1, name: 'A栋' },
        { id: 2, name: 'B栋' }
      ],
      fetchLocations: vi.fn().mockResolvedValue([])
    }

    paymentStore = {
      payments: [
        { id: 1, tenant_id: 1, amount: 1000, payment_date: '2024-03-01' },
        { id: 2, tenant_id: 1, amount: 2000, payment_date: '2024-03-15' }
      ],
      fetchPayments: vi.fn().mockResolvedValue([]),
      createPayment: vi.fn().mockResolvedValue({}),
      updatePayment: vi.fn().mockResolvedValue({}),
      deletePayment: vi.fn().mockResolvedValue({}),
      paymentsByTenant: vi.fn().mockImplementation((tenantId) => {
        return paymentStore.payments.filter(payment => payment.tenant_id === tenantId)
      })
    }

    useTenantStore.mockReturnValue(tenantStore)
    useRoomStore.mockReturnValue(roomStore)
    useLocationStore.mockReturnValue(locationStore)
    usePaymentStore.mockReturnValue(paymentStore)

    // 创建组件实例
    wrapper = createTestApp(TenantView)
  })

  it('应该正确渲染租户列表', async () => {
    await wrapper.vm.$nextTick()
    expect(elementExists(wrapper, '.el-table')).toBe(true)
    expect(elementText(wrapper, '.el-table')).toContain('张三')
    expect(elementText(wrapper, '.el-table')).toContain('李四')
  })

  it('应该能够搜索租户', async () => {
    await typeInput(wrapper, '.el-input__inner', '张三')
    await wrapper.vm.$nextTick()
    expect(elementText(wrapper, '.el-table')).toContain('张三')
    expect(elementText(wrapper, '.el-table')).not.toContain('李四')
  })

  it('应该能够筛选租户状态', async () => {
    await selectOption(wrapper, '.el-select', 'active')
    await wrapper.vm.$nextTick()
    expect(elementText(wrapper, '.el-table')).toContain('张三')
    expect(elementText(wrapper, '.el-table')).not.toContain('李四')
  })

  it('应该能够打开新增租户对话框', async () => {
    await clickButton(wrapper, '.el-button--primary')
    await wrapper.vm.$nextTick()
    expect(elementExists(wrapper, '.el-dialog')).toBe(true)
    expect(elementText(wrapper, '.el-dialog__title')).toBe('新增租户')
  })

  it('应该能够提交新增租户表单', async () => {
    await clickButton(wrapper, '.el-button--primary')
    await wrapper.vm.$nextTick()
    
    await typeInput(wrapper, 'input[name="name"]', '王五')
    await typeInput(wrapper, 'input[name="phone"]', '13700137000')
    await selectOption(wrapper, 'select[name="status"]', 'active')
    await selectOption(wrapper, 'select[name="location_id"]', '1')
    await selectOption(wrapper, 'select[name="room_id"]', '1')
    
    await clickButton(wrapper, '.el-dialog__footer .el-button--primary')
    await wrapper.vm.$nextTick()

    expect(tenantStore.createTenant).toHaveBeenCalledWith({
      name: '王五',
      phone: '13700137000',
      status: 'active',
      location_id: 1,
      room_id: 1
    })
  })

  it('应该能够删除租户', async () => {
    await clickButton(wrapper, '.el-button--danger')
    await clickButton(wrapper, '.el-message-box__btns .el-button--primary')
    await wrapper.vm.$nextTick()

    expect(tenantStore.deleteTenant).toHaveBeenCalled()
  })

  it('应该能够查看租户支付记录', async () => {
    await clickButton(wrapper, '.el-button--success')
    await wrapper.vm.$nextTick()
    
    expect(elementExists(wrapper, '.el-dialog')).toBe(true)
    expect(elementText(wrapper, '.el-dialog__title')).toContain('支付记录')
    
    // 验证支付记录列表
    const payments = wrapper.findAll('.el-table__row')
    expect(payments.length).toBe(2)
    expect(elementText(wrapper, '.el-table')).toContain('1000')
    expect(elementText(wrapper, '.el-table')).toContain('2000')
  })

  it('应该能够添加租户支付记录', async () => {
    await clickButton(wrapper, '.el-button--warning')
    await wrapper.vm.$nextTick()
    
    expect(elementExists(wrapper, '.el-dialog')).toBe(true)
    expect(elementText(wrapper, '.el-dialog__title')).toContain('添加支付记录')
    
    await typeInput(wrapper, 'input[name="amount"]', '3000')
    await typeInput(wrapper, 'input[name="payment_date"]', '2024-03-20')
    
    await clickButton(wrapper, '.el-dialog__footer .el-button--primary')
    await wrapper.vm.$nextTick()

    expect(paymentStore.createPayment).toHaveBeenCalledWith({
      tenant_id: expect.any(Number),
      amount: 3000,
      payment_date: '2024-03-20'
    })
  })

  it('应该在组件挂载时获取数据', async () => {
    await wrapper.vm.$nextTick()
    expect(tenantStore.fetchTenants).toHaveBeenCalled()
    expect(roomStore.fetchRooms).toHaveBeenCalled()
    expect(locationStore.fetchLocations).toHaveBeenCalled()
  })
}) 