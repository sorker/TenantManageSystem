import { createRouter, createWebHashHistory } from 'vue-router';
import Statistics from '../views/Statistics.vue'

const routes = [
  {
    path: '/',
    redirect: '/tenants'
  },
  {
    path: '/tenants',
    name: 'tenants',
    component: () => import('../views/TenantView.vue')
  },
  {
    path: '/properties',
    name: 'properties',
    component: () => import('../views/PropertyView.vue')
  },
  {
    path: '/locations',
    name: 'locations',
    component: () => import('../views/LocationView.vue')
  },
  {
    path: '/facilities',
    name: 'facilities',
    component: () => import('../views/FacilityView.vue')
  },
  {
    path: '/schedule',
    name: 'schedule',
    component: () => import('../views/ScheduleView.vue')
  },
  {
    path: '/database',
    name: 'database',
    component: () => import('../views/DatabaseView.vue')
  },
  {
    path: '/statistics',
    name: 'Statistics',
    component: Statistics
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

export default router; 