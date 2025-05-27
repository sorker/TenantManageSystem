import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

// 创建测试用的 Vue 应用
export function createTestApp(component, options = {}) {
  const pinia = createPinia()
  setActivePinia(pinia)

  return mount(component, {
    global: {
      plugins: [pinia, ElementPlus],
      components: ElementPlusIconsVue,
      ...options.global
    },
    ...options
  })
}

// 模拟 API 响应
export function mockApiResponse(data, delay = 0) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        data,
        status: 200,
        statusText: 'OK'
      })
    }, delay)
  })
}

// 模拟 API 错误
export function mockApiError(error, delay = 0) {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(error)
    }, delay)
  })
}

// 等待下一个 tick
export function nextTick() {
  return new Promise(resolve => setTimeout(resolve, 0))
}

// 模拟用户输入
export async function typeInput(wrapper, selector, value) {
  const input = wrapper.find(selector)
  await input.setValue(value)
  await input.trigger('input')
  await nextTick()
}

// 模拟点击事件
export async function clickButton(wrapper, selector) {
  const button = wrapper.find(selector)
  await button.trigger('click')
  await nextTick()
}

// 模拟选择事件
export async function selectOption(wrapper, selector, value) {
  const select = wrapper.find(selector)
  await select.setValue(value)
  await select.trigger('change')
  await nextTick()
}

// 检查元素是否存在
export function elementExists(wrapper, selector) {
  return wrapper.find(selector).exists()
}

// 检查元素文本内容
export function elementText(wrapper, selector) {
  return wrapper.find(selector).text()
}

// 检查元素属性
export function elementAttribute(wrapper, selector, attribute) {
  return wrapper.find(selector).attributes(attribute)
}

// 检查元素类名
export function elementClass(wrapper, selector) {
  return wrapper.find(selector).classes()
}

// 检查元素是否可见
export function elementVisible(wrapper, selector) {
  return wrapper.find(selector).isVisible()
}

// 检查元素是否禁用
export function elementDisabled(wrapper, selector) {
  return wrapper.find(selector).attributes('disabled') !== undefined
}

// 检查元素是否选中
export function elementChecked(wrapper, selector) {
  return wrapper.find(selector).element.checked
}

// 检查元素值
export function elementValue(wrapper, selector) {
  return wrapper.find(selector).element.value
}

// 检查元素是否包含类名
export function hasClass(wrapper, selector, className) {
  return wrapper.find(selector).classes().includes(className)
}

// 检查元素是否包含文本
export function hasText(wrapper, selector, text) {
  return wrapper.find(selector).text().includes(text)
}

// 检查元素是否包含属性
export function hasAttribute(wrapper, selector, attribute) {
  return wrapper.find(selector).attributes(attribute) !== undefined
}

// 检查元素是否包含子元素
export function hasChild(wrapper, selector, childSelector) {
  return wrapper.find(selector).find(childSelector).exists()
}

// 检查元素是否包含子元素文本
export function hasChildText(wrapper, selector, childSelector, text) {
  return wrapper.find(selector).find(childSelector).text().includes(text)
}

// 检查元素是否包含子元素类名
export function hasChildClass(wrapper, selector, childSelector, className) {
  return wrapper.find(selector).find(childSelector).classes().includes(className)
}

// 检查元素是否包含子元素属性
export function hasChildAttribute(wrapper, selector, childSelector, attribute) {
  return wrapper.find(selector).find(childSelector).attributes(attribute) !== undefined
}

// 检查元素是否包含子元素是否可见
export function hasChildVisible(wrapper, selector, childSelector) {
  return wrapper.find(selector).find(childSelector).isVisible()
}

// 检查元素是否包含子元素是否禁用
export function hasChildDisabled(wrapper, selector, childSelector) {
  return wrapper.find(selector).find(childSelector).attributes('disabled') !== undefined
}

// 检查元素是否包含子元素是否选中
export function hasChildChecked(wrapper, selector, childSelector) {
  return wrapper.find(selector).find(childSelector).element.checked
}

// 检查元素是否包含子元素值
export function hasChildValue(wrapper, selector, childSelector) {
  return wrapper.find(selector).find(childSelector).element.value
} 