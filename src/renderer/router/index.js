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
        },
        {
          path: 'weibo',
          component: require('@/pages/picbeds/Weibo').default, // 微博
          name: 'weibo'
        },
        {
          path: 'qiniu',
          component: require('@/pages/picbeds/Qiniu').default, // 七牛
          name: 'qiniu'
        },
        {
          path: 'tcyun',
          component: require('@/pages/picbeds/TcYun').default, // 腾讯云
          name: 'tcyun'
        },
        {
          path: 'upyun',
          component: require('@/pages/picbeds/UpYun').default, // 又拍云
          name: 'upyun'
        },
        {
          path: 'github',
          component: require('@/pages/picbeds/GitHub').default, // github
          name: 'github'
        },
        {
          path: 'smms',
          component: require('@/pages/picbeds/SMMS').default, // SM.MS
          name: 'smms'
        },
        {
          path: 'aliyun',
          component: require('@/pages/picbeds/AliYun').default, // 阿里云
          name: 'aliyun'
        },
        {
          path: 'imgur',
          component: require('@/pages/picbeds/Imgur').default, // imgur
          name: 'imgur'
        },
        {
          path: 'others/:type',
          component: require('@/pages/picbeds/Others').default, // 其他云
          name: 'others'
        },
        // {
        //   path: 'gallery',
        //   component: require('@/pages/Gallery').default,
        //   name: 'gallery',
        //   meta: {
        //     keepAlive: true
        //   }
        // }
        {
          path: 'setting',
          component: require('@/pages/PicGoSetting').default, // PicGo设置·
          name: 'setting'
        },
        {
          path: 'plugin',
          component: require('@/pages/Plugin').default, // 插件设置
          name: 'plugin'
        },
        {
          path: 'shortcut-page',
          component: require('@/pages/ShortCutPage').default, // 修改快捷键
          name: 'shortcut-page'
        }
      ]
    },
    {
      path: '*',
      redirect: '/'
    }
  ]
})
