import { createRouter, createWebHistory } from 'vue-router';
import Statistics from '../views/Statistics.vue'
import TenantView from '../views/TenantView.vue';
import PrintPaymentHistory from '../views/PrintPaymentHistory.vue';

const routes = [
  {
    path: '/',
    redirect: '/mobile'
  },
  {
    path: '/tenants',
    name: 'tenants',
    component: TenantView
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
    path: '/mobile',
    name: 'mobile',
    component: () => import('../views/TenantMobileView.vue')
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
  },
  {
    path: '/print-payment-history/:id',
    name: 'PrintPaymentHistory',
    component: PrintPaymentHistory
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router; 