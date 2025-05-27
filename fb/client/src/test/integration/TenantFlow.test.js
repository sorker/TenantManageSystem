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

describe('TenantFlow 集成测试', () => {
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
        { id: 1, name: '张三', phone: '13800138000', status: 'active', location_id: 1, room_id: 1 },
        { id: 2, name: '李四', phone: '13900139000', status: 'inactive', location_id: 2, room_id: 2 }
      ],
      fetchTenants: vi.fn().mockResolvedValue([]),
      createTenant: vi.fn().mockResolvedValue({}),
      updateTenant: vi.fn().mockResolvedValue({}),
      deleteTenant: vi.fn().mockResolvedValue({})
    }

    roomStore = {
      rooms: [
        { id: 1, room_number: '101', status: 'available', location_id: 1 },
        { id: 2, room_number: '102', status: 'occupied', location_id: 1 },
        { id: 3, room_number: '201', status: 'available', location_id: 2 }
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

  it('应该能够处理数据加载状态', async () => {
    // 模拟加载状态
    tenantStore.fetchTenants.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    roomStore.fetchRooms.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    locationStore.fetchLocations.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    // 重新创建组件实例
    wrapper = createTestApp(TenantView)
    
    // 验证加载状态
    expect(elementExists(wrapper, '.el-loading-mask')).toBe(true)
    
    // 等待数据加载完成
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // 验证加载完成
    expect(elementExists(wrapper, '.el-loading-mask')).toBe(false)
    expect(elementExists(wrapper, '.el-table')).toBe(true)
  })

  it('应该能够完成完整的租户管理流程', async () => {
    // 1. 添加新租户
    await clickButton(wrapper, '.el-button--primary')
    await wrapper.vm.$nextTick()
    
    await typeInput(wrapper, 'input[name="name"]', '王五')
    await typeInput(wrapper, 'input[name="phone"]', '13700137000')
    await selectOption(wrapper, 'select[name="status"]', 'active')
    await selectOption(wrapper, 'select[name="location_id"]', '1')
    await selectOption(wrapper, 'select[name="room_id"]', '1')
    
    await clickButton(wrapper, '.el-dialog__footer .el-button--primary')
    await wrapper.vm.$nextTick()

    // 2. 验证租户列表更新
    expect(elementText(wrapper, '.el-table')).toContain('王五')
    
    // 3. 添加支付记录
    await clickButton(wrapper, '.el-button--warning')
    await wrapper.vm.$nextTick()
    
    await typeInput(wrapper, 'input[name="amount"]', '3000')
    await typeInput(wrapper, 'input[name="payment_date"]', '2024-03-20')
    
    await clickButton(wrapper, '.el-dialog__footer .el-button--primary')
    await wrapper.vm.$nextTick()

    // 4. 查看支付记录
    await clickButton(wrapper, '.el-button--success')
    await wrapper.vm.$nextTick()
    
    expect(elementText(wrapper, '.el-table')).toContain('3000')
    
    // 5. 更新租户状态
    await selectOption(wrapper, '.el-select', 'inactive')
    await wrapper.vm.$nextTick()
    
    expect(elementText(wrapper, '.el-table')).not.toContain('王五')
  })

  it('应该能够处理错误情况', async () => {
    // 模拟 API 错误
    tenantStore.fetchTenants.mockRejectedValue(new Error('API Error'))
    
    // 重新创建组件实例
    wrapper = createTestApp(TenantView)
    await wrapper.vm.$nextTick()
    
    // 验证错误提示
    expect(elementText(wrapper, '.el-message--error')).toContain('获取租户列表失败')
  })
}) 