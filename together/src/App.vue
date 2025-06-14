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
      >
        <el-menu-item index="/schedule">
          <el-icon><Calendar /></el-icon>
          <template #title>日程管理</template>
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
        <el-menu-item index="/database">
          <el-icon><DataLine /></el-icon>
          <template #title>数据库查看</template>
        </el-menu-item>
      </el-menu>
      <div class="menu-bottom" @click.stop="toggleSidebar"></div>
    </el-aside>
    <el-container class="main-container">
      <el-header>
        <h2>租户管理系统</h2>
      </el-header>
      <el-main>
        <router-view></router-view>
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
import { ref } from 'vue'
import { User, House, Tools, Calendar, DataLine, Location, TrendCharts, Fold, Expand, Menu } from '@element-plus/icons-vue'

const isCollapse = ref(false)
const toggleSidebar = () => {
  isCollapse.value = !isCollapse.value
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

/* 响应式布局 */
@media screen and (max-width: 768px) {
  .el-aside {
    position: fixed;
    z-index: 1000;
    height: 100%;
  }
  
  .el-main {
    width: 100%;
    padding: 15px;
  }
  
  .el-header {
    padding: 0 15px;
  }
  
  h2 {
    font-size: 18px;
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
}

/* 当侧边栏展开时的样式 */
.el-container:has(.el-aside[style*="width: 200px"]) .el-main {
  width: 100%;
}

/* 当侧边栏折叠时的样式 */
.el-container:has(.el-aside[style*="width: 0"]) .el-main {
  width: 100%;
}

.menu-bottom {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(100% - 240px);
  cursor: pointer;
  z-index: 1;
}

.el-menu-vertical {
  position: relative;
  z-index: 2;
}
</style> 