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
    </el-aside>
    <el-container class="main-container">
      <el-header>
        <h2>租户管理系统</h2>
      </el-header>
      <el-main>
        <router-view></router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref } from 'vue'
import { User, House, Tools, Calendar, DataLine, Location, TrendCharts, Fold, Expand } from '@element-plus/icons-vue'

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
</style> 