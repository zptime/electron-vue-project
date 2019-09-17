import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'tray-page',
      component: require('@/pages/TrayPage').default
    },
    {
      path: '/rename-page',
      name: 'rename-page',
      component: require('@/pages/RenamePage').default
    },
    {
      path: '/mini-page',
      name: 'mini-page',
      component: require('@/pages/MiniPage').default
    },
    {
      path: '/loading-page',
      name: 'landing-page',
      component: require('@/components/LandingPage').default
    },
    {
      path: '/setting',
      name: 'setting-page',
      component: require('@/layouts/SettingPage').default, // 框架页
      children: [
        {
          path: 'upload',
          component: require('@/pages/Upload').default, // 首页 图片上传
          name: 'upload'
        }
        // {
        //   path: 'gallery',
        //   component: require('@/pages/Gallery').default,
        //   name: 'gallery',
        //   meta: {
        //     keepAlive: true
        //   }
        // }
      ]
    },
    {
      path: '*',
      redirect: '/'
    }
  ]
})
