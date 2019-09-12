### electron-vue-project

![electron-vue](https://github.com/zptime/resources/blob/master/images/electron-vue.PNG)

#### 参考网址

* [实战demo地址](https://juejin.im/post/5c585ff7f265da2d8532b553)
* [vue官网](https://vuejs.org/v2/guide/)
* [vue-cli官网](https://cli.vuejs.org/)
* [Electron官网](https://electronjs.org/docs)
* [Electron中文文档](https://wizardforcel.gitbooks.io/electron-doc/content/index.html)
* [Electron-vue官网](https://simulatedgreg.gitbooks.io/electron-vue/cn/)
* [Vue-CLI3 Electron](https://nklayman.github.io/vue-cli-plugin-electron-builder/guide/#installation)
* [BootstrapVue](https://bootstrap-vue.js.org/docs)
* [electron-vue 音乐播放器](https://learnku.com/articles/14791/music-player-based-on-electron-vue-development)

#### V0.0.1 起步

>electron-vue 官方推荐 yarn 作为软件包管理器，因为它可以更好地处理依赖关系，并可以使用 yarn clean 帮助减少最后构建文件的大小

``` bash
# 安装 vue-cli 和 脚手架样板代码
npm install -g vue-cli
vue init simulatedgreg/electron-vue my-project

# 安装依赖并运行你的程序
cd my-project
yarn # 或者 npm install
yarn run dev # 或者 npm run dev

# build electron application for production
npm run build

# run unit & end-to-end tests
npm test

# lint all JS/Vue component files in `src/`
npm run lint

```

---

### v0.0.2 Tray，Menu配置

* stylus支持
* Tray图标组件：鼠标事件配置，包括左键、右键、拖拽等
* Menu菜单项配置

### v0.0.3 lowdb配置

* [Main进程和Renderer进程](https://molunerfinn.com/electron-vue-2/#%E5%89%8D%E8%A8%80)
* [lowdb数据库](https://molunerfinn.com/electron-vue-3/)
* [跨平台兼容](https://molunerfinn.com/electron-vue-4/)
* main进程相关配置及通信配置：main/index.js，main/utils
* 上传页面 @/pages/Upload
