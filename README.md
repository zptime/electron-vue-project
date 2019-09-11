### electron-vue-project

![electron-vue](https://github.com/zptime/resources/blob/master/images/electron-vue.PNG)

#### 参考网址

* [vue官网](https://vuejs.org/v2/guide/)
* [vue-cli官网](https://cli.vuejs.org/)
* [Electron官网](https://electronjs.org/docs)
* [Electron中文文档](https://wizardforcel.gitbooks.io/electron-doc/content/index.html)
* [Electron-vue官网](https://simulatedgreg.gitbooks.io/electron-vue/cn/)
* [Vue-CLI3 Electron](https://nklayman.github.io/vue-cli-plugin-electron-builder/guide/#installation)

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
