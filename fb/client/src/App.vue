<template>
  <el-container class="layout-container">
    <el-aside :width="isCollapse ? '0' : '200px'" class="aside-container">
      <div class="toggle-button" @click="toggleSidebar">
        <el-icon><Fold v-if="!isCollapse" /><Expand v-else /></el-icon>
      </div>
      <el-menu
        router
        :default-active="$route.path"
        class="el-menu-vertical"
        :collapse="isCollapse"
        :collapse-transition="false"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
      >
        <el-menu-item index="/mobile">
          <el-icon><Calendar /></el-icon>
          <template #title>租户日程</template>
        </el-menu-item>
        <el-menu-item index="/tenants">
          <el-icon><User /></el-icon>
          <template #title>租户管理</template>
        </el-menu-item>
        <el-menu-item index="/properties">
          <el-icon><House /></el-icon>
          <template #title>房间管理</template>
        </el-menu-item>
        <el-menu-item index="/locations">
          <el-icon><Location /></el-icon>
          <template #title>位置管理</template>
        </el-menu-item>
        <el-menu-item index="/facilities">
          <el-icon><Tools /></el-icon>
          <template #title>设施管理</template>
        </el-menu-item>
        <el-menu-item index="/statistics">
          <el-icon><TrendCharts /></el-icon>
          <template #title>数据统计</template>
        </el-menu-item>
        <el-menu-item index="/database" v-if="isDev">
          <el-icon><DataLine /></el-icon>
          <template #title>数据库查看</template>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <div 
      v-show="!isCollapse" 
      class="menu-mask"
      @click="toggleSidebar"
    ></div>
    <el-container class="main-container">
      <el-header class="main-header">
        <div class="header-left">
          <h2>租户管理系统</h2>
        </div>
        <div class="header-right">
          <el-switch
            v-model="isDark"
            class="theme-switch"
            active-text="暗色"
            inactive-text="亮色"
            @change="toggleTheme"
          />
        </div>
      </el-header>
      <el-main>
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
    <div 
      v-show="isCollapse" 
      class="floating-menu-button"
      @click="toggleSidebar"
    >
      <el-icon><Menu /></el-icon>
    </div>
  </el-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { User, House, Tools, Calendar, DataLine, Location, TrendCharts, Fold, Expand, Menu } from '@element-plus/icons-vue'

const isCollapse = ref(false)
const isDark = ref(false)
const isDev = computed(() => process.env.NODE_ENV === 'development')

const toggleSidebar = () => {
  isCollapse.value = !isCollapse.value
}

const toggleTheme = (value) => {
  document.documentElement.classList.toggle('dark', value)
}
</script>

<style>
.layout-container {
  height: 100vh;
  display: flex;
}

.aside-container {
  background-color: #304156;
  transition: width 0.3s;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}

.toggle-button {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
  background-color: #263445;
}

.el-menu {
  border-right: none;
}

.el-menu-vertical:not(.el-menu--collapse) {
  width: 200px;
}

.el-header {
  background-color: #fff;
  border-bottom: 1px solid #dcdfe6;
  display: flex;
  align-items: center;
}

.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.el-main {
  background-color: #f0f2f5;
  padding: 20px;
  transition: all 0.3s;
  flex: 1;
  overflow: auto;
}

.main-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.theme-switch {
  margin-left: 16px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media screen and (max-width: 768px) {
  .aside-container {
    position: fixed;
    z-index: 1000;
    height: 100vh;
  }
  
  .main-container {
    margin-left: 0;
  }
  
  .el-menu-vertical:not(.el-menu--collapse) {
    width: 200px;
  }
  
  .floating-menu-button {
    width: 40px;
    height: 40px;
    left: 15px;
    bottom: 15px;
  }

  .floating-menu-button .el-icon {
    font-size: 20px;
  }

  .menu-mask {
    display: block;
  }
}

:root {
  --el-menu-bg-color: #304156;
  --el-menu-text-color: #bfcbd9;
  --el-menu-active-color: #409EFF;
}

.dark {
  --el-bg-color: #1a1a1a;
  --el-text-color-primary: #ffffff;
  --el-border-color: #333333;
}

/* 圆形悬浮按钮样式 */
.floating-menu-button {
  position: fixed;
  left: 20px;
  bottom: 20px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: #409eff;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  z-index: 1000;
  transition: all 0.3s ease;
}

.floating-menu-button:hover {
  transform: scale(1.1);
  background-color: #66b1ff;
}

.floating-menu-button .el-icon {
  font-size: 24px;
}

.menu-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: none;
}
</style> 