import { createRouter, createWebHistory } from 'vue-router';

import DefaultView from '@/views/DefaultView.vue';

const router = createRouter({
  'history': createWebHistory('/'),
  'routes':  [
    {
      path:      '/',
      name:      'default',
      component: DefaultView,
    }
  ],
});

export default router;
