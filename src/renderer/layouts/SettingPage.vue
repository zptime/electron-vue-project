<template>
  <div id="setting-page">
    <!-- 模拟一个顶部的titlebar -->
    <div class="fake-title-bar" :class="{ 'darwin': os === 'darwin' }">
      <div class="fake-title-bar__title">
        PicGo - {{ version }}
      </div>
      <div class="handle-bar" v-if="os !== 'darwin'">
        <i class="el-icon-minus" @click="minimizeWindow"></i>
        <i class="el-icon-circle-plus-outline" @click="openMiniWindow"></i>
        <i class="el-icon-close" @click="closeWindow"></i>
      </div>
    </div>
  </div>
</template>
<script>
import pkg from 'root/package.json'
import mixin from '@/utils/mixin'
export default {
  name: 'setting-page',
  mixins: [mixin],
  data () {
    return {
      version: process.env.NODE_ENV === 'production' ? pkg.version : 'Dev',
      os: ''
    }
  },
  created () {
    this.os = process.platform
  },
  methods: {
    minimizeWindow () {
      const window = BrowserWindow.getFocusedWindow()
      window.minimize()
    },
    closeWindow () {
      const window = BrowserWindow.getFocusedWindow()
      window.close()
    },
    openMiniWindow () {
      this.$electron.ipcRenderer.send('openMiniWindow')
    }
  },
  beforeRouteEnter: (to, from, next) => {
    next(vm => {
      vm.defaultActive = to.name
    })
  }
}
</script>
<style lang='stylus'>
$darwinBg = transparentify(#172426, #000, 0.7)
.picgo-fade
  &-enter,
  &-leave,
  &-leave-active
    opacity 0
  &-enter-active,
  &-leave-active
    transition all 100ms linear
.view-title
  color #eee
  font-size 20px
  text-align center
  margin 10px auto
#setting-page
  .fake-title-bar
    -webkit-app-region drag  // 鼠标按住titlebar的时候是可以拖动窗口
    height h = 22px
    width 100%
    text-align center
    color #eee
    font-size 12px
    line-height h
    position fixed
    z-index 100
    &.darwin
      background transparent
      background-image linear-gradient(
        to right,
        transparent 0%,
        transparent 167px,
        $darwinBg 167px,
        $darwinBg 100%
      )
      .fake-title-bar__title
        padding-left 167px
    .handle-bar
      position absolute
      top 2px
      right 4px
      width 60px
      z-index 10000
      -webkit-app-region no-drag // 在windows下，操作区的按钮（缩小、放大、关闭）长按应该是不能拖拽的
      i
        cursor pointer
        font-size 16px
      .el-icon-minus
        &:hover
          color #409EFF
      .el-icon-close
        &:hover
          color #F15140
      .el-icon-circle-plus-outline
        &:hover
          color #69C282
  .main-wrapper
    &.darwin
      background $darwinBg
  .side-bar-menu
    position fixed
    height calc(100vh - 22px)
    overflow-x hidden
    overflow-y auto
    width 170px
    .el-icon-info.setting-window
      position fixed 
      bottom 4px
      left 4px
      cursor poiter
      color #878d99
      transition .2s all ease-in-out
      &:hover
        color #409EFF
  .el-menu
    border-right none
    background transparent
    width 170px
    &-item
      color #eee
      position relative
      &:focus,
      &:hover
        color #fff
        background transparent
      &.is-active
        color active-color = #409EFF
        &:before
          content ''
          position absolute
          width 3px 
          height 20px
          right 0
          top 18px
          background active-color
  .el-submenu__title
    span
      color #eee
    &:hover
      background transparent
      span
        color #fff
  .el-submenu
    .el-menu-item
      min-width 166px
      &.is-active
        &:before
          top 16px
  .main-content
    padding-top 22px
    position relative
    z-index 10
  .el-dialog__body 
    padding 20px
  .support
    text-align center
    &-title
      text-align center
      color #878d99
  .align-center
    input
      text-align center
  *::-webkit-scrollbar
    width 8px
    height 8px
  *::-webkit-scrollbar-thumb
    border-radius 4px
    background #6f6f6f
  *::-webkit-scrollbar-track
    background-color transparent
</style>