'use strict'

import { app, BrowserWindow, Tray, Menu, dialog, clipboard } from 'electron'

import db from '../datastore' // 引入db
import { getPicBeds } from './utils/getPicBeds'
import pkg from '../../package.json'
import fixPath from 'fix-path'
/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}
if (process.env.DEBUG_ENV === 'debug') {
  global.__static = require('path').join(__dirname, '../../static').replace(/\\/g, '\\\\')
}

let window
let settingWindow
let miniWindow
let tray
let menu
let contextMenu
// const winURL = process.env.NODE_ENV === 'development'
//   ? `http://localhost:9080`
//   : `file://${__dirname}/index.html`
// 在electron下，vue-router请不要使用history模式，而使用默认的hash模式(带#号)。
const settingWinURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080/#setting/upload`
  : `file://${__dirname}/index.html#setting/upload`
const miniWinURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080/#mini-page`
  : `file://${__dirname}/index.html#mini-page`

// fix the $PATH in macOS
fixPath()

function createContextMenu () {
  const picBeds = getPicBeds(app)
  const submenu = picBeds.map(item => {
    return {
      label: item.name,
      type: 'radio',
      checked: db.read().get('picBed.current').value() === item.type,
      click () {
        db.read().set('picBed.current', item.type).write()
        if (settingWindow) {
          settingWindow.webContents.send('syncPicBed')
        }
      }
    }
  })
  contextMenu = Menu.buildFromTemplate([
    {
      label: '关于',
      click () {
        dialog.showMessageBox({
          title: 'PicGo',
          message: 'PicGo',
          detail: `Version: ${pkg.version}\nAuthor: Molunerfinn\nGithub: https://github.com/Molunerfinn/PicGo`
        })
      }
    },
    {
      label: '打开详细窗口',
      click () {
        if (settingWindow === null) {
          createSettingWindow()
          settingWindow.show()
        } else {
          settingWindow.show()
          settingWindow.focus()
        }
        if (miniWindow) {
          miniWindow.hide()
        }
      }
    },
    {
      label: '选择默认图床',
      type: 'submenu',
      submenu
    },
    {
      label: '打开更新助手',
      type: 'checkbox',
      checked: db.get('settings.showUpdateTip').value(),
      click () {
        const value = db.read().get('settings.showUpdateTip').value()
        db.read().set('settings.showUpdateTip', !value).write()
      }
    },
    {
      label: '重启应用',
      click () {
        app.relaunch()
        app.exit(0)
      }
    },
    {
      role: 'quit',
      label: '退出'
    }
  ])
}

function createTray () {
  // Tray 不同系统的任务栏里的图标组件。比如，Tray配合上图标之后，在macOS里是顶部栏里的应用图标；在windows右下角的应用图标
  const menubarPic = process.platform === 'darwin' ? `${__static}/menubar.png` : `${__static}/menubar-nodarwin.png`
  tray = new Tray(menubarPic) // 指定图片的路径

  // 鼠标左键、右键事件
  tray.on('right-click', () => { // 鼠标右键点击事件
    if (window) {
      window.hide() // 隐藏小窗口
    }
    // Tray另一个重要的作用就是开启菜单项
    createContextMenu()
    tray.popUpContextMenu(contextMenu) // 打开菜单
  })
  // 兼容性处理：macOS的顶部栏图标可以接受拖拽事件，所以就针对macOS的顶部栏制作了顶部栏图标对应的小窗口。让大部分操作不经过主窗口也能实现。而对于windows而言，没有顶部栏，取而代之的是位于底部栏的右侧的任务栏，通常点击任务栏里的图标就会把应用的主窗口调出来
  tray.on('click', (event, bounds) => { // 鼠标左键点击事件
    if (process.platform === 'darwin') { // 如果是macOS平台
      let img = clipboard.readImage()
      let obj = []
      if (!img.isEmpty()) {
        // 从剪贴板来的图片默认转为png
        const imgUrl = 'data:image/png;base64,' + Buffer.from(img.toPNG(), 'binary').toString('base64')
        obj.push({
          width: img.getSize().width,
          height: img.getSize().height,
          imgUrl
        })
      }
      // toggleWindow(bounds) // 打开或关闭小窗口
      setTimeout(() => {
        // webContents其实是BrowserWindow实例的一个属性。也就是如果我们需要在main进程里给某个窗口某个页面发送消息，则必须通过win.webContents.send()方法来发送。
        // In renderer process --> TrayPage.vue
        // ipcRenderer.on('clipboardFiles', (event, files) => {
        //   console.log(files)
        // })
        window.webContents.send('clipboardFiles', obj)
      }, 0)
    } else { // 如果是windows
      if (window) {
        window.hide() // 隐藏小窗口
      }
      if (settingWindow === null) { // 如果主窗口不存在就创建一个
        createSettingWindow() // 创建
        settingWindow.show() // 并打开
      } else { // 如果主窗口在，就显示并激活
        settingWindow.show()
        settingWindow.focus()
      }
    }
  })

  // 拖拽事件
  tray.on('drag-enter', () => { // 当刚拖拽到icon上时
    tray.setImage(`${__static}/upload.png`)
  })

  tray.on('drag-end', () => { // 当拖拽事件结束时
    tray.setImage(`${__static}/menubar.png`)
  })
}

// 小窗口
const createWindow = () => {
  if (process.platform !== 'darwin' && process.platform !== 'win32') {
    return
  }
  window = new BrowserWindow({
    height: 350,
    width: 196, // 196
    show: false,
    frame: false,
    fullscreenable: false,
    resizable: false,
    transparent: true,
    vibrancy: 'ultra-dark',
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      backgroundThrottling: false
    }
  })

  window.loadURL(winURL)

  window.on('closed', () => {
    window = null
  })

  window.on('blur', () => {
    window.hide()
  })
  return window
}

// 迷你窗口
const createMiniWidow = () => {
  if (miniWindow) {
    return false
  }
  let obj = {
    height: 64,
    width: 64,
    show: process.platform === 'linux',
    frame: false,
    fullscreenable: false,
    skipTaskbar: true,
    resizable: false,
    transparent: process.platform !== 'linux',
    icon: `${__static}/logo.png`,
    webPreferences: {
      backgroundThrottling: false,
      nodeIntegration: true,
      nodeIntegrationInWorker: true
    }
  }

  if (db.read().get('settings.miniWindowOntop').value()) {
    obj.alwaysOnTop = true
  }

  miniWindow = new BrowserWindow(obj)

  miniWindow.loadURL(miniWinURL)

  miniWindow.on('closed', () => {
    miniWindow = null
  })
  return miniWindow
}

// 主窗口
function createSettingWindow () {
  /**
   * Initial window options
   */
  const options = {
    height: 450,
    // useContentSize: true,
    width: 800,
    show: false, // 创建后是否显示
    frame: true, // 是否创建frameless窗口,详情：https://electronjs.org/docs/api/frameless-window
    fullscreenable: false, // 是否允许全屏
    center: true, // 是否出现在屏幕居中的位置
    backgroundColor: '#3f3c37', // 背景色，用于transparent和frameless窗口
    title: 'PicGo',
    // 隐藏系统默认的titleBar，隐藏顶部栏的横条，把操作按钮嵌入窗口。自定义实现
    titleBarStyle: 'hidden', // 标题栏的样式，有hidden、hiddenInset、customButtonsOnHover等
    // resizable: false, // 是否允许拉伸大小
    transparent: true, // 是否是透明窗口（仅macOS）
    vibrancy: 'ultra-dark', // 窗口模糊的样式（仅macOS）
    webPreferences: {
      backgroundThrottling: false, // 当页面被置于非激活窗口的时候是否停止动画和计时器
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      webSecurity: false
    }
  }

  // process.platform判断不同平台：'aix' 'darwin'(macOS) 'freebsd' 'linux'(Linue) 'openbsd' 'sunos' 'win32'(windows)
  if (process.platform !== 'darwin') { // 针对不是macOS(即windows 或者 linux)平台做出不同配置
    options.show = true // 创建即展示
    // options.frame = false // 创建一个frameless窗口，此时窗口没有自带顶部栏和菜单栏
    options.transparent = false
    options.icon = `${__static}/logo.png`
  }
  settingWindow = new BrowserWindow(options)

  // 加载窗口的URL -> 来自renderer进程的页面
  settingWindow.loadURL(settingWinURL)

  settingWindow.on('closed', () => {
    settingWindow = null
    if (process.platform === 'linux') {
      app.quit()
    }
  })
  createMenu()
  createMiniWidow()
  return settingWindow
}

// Menu组件，既能够生成系统菜单项，也能实现绑定应用常用快捷键的功能。
const createMenu = () => {
  if (process.env.NODE_ENV !== 'development') {
    const template = [{
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:' },
        { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:' },
        { label: 'Select All', accelerator: 'CmdOrCtrl+A', selector: 'selectAll:' },
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click () {
            app.quit()
          }
        }
      ]
    }]
    menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
  }
}

const toggleWindow = (bounds) => {
  if (window.isVisible()) {
    window.hide()
  } else {
    showWindow(bounds)
  }
}

const showWindow = (bounds) => {
  window.setPosition(bounds.x - 98 + 11, bounds.y, false)
  window.webContents.send('updateFiles')
  window.show()
  window.focus()
}
app.on('ready', () => {
  createWindow()
  createSettingWindow()
  if (process.platform === 'darwin' || process.platform === 'win32') {
    createTray()
  }
})

// 在windows平台上，通常我们把应用的窗口都关了之后也就默认把这个应用给退出了。而如果在macOS系统上却不是这样。我们把应用的窗口关闭了，但是并非完全退出这个应用。
app.on('window-all-closed', () => { // 当窗口都被关闭了
  if (process.platform !== 'darwin') { // 如果不是macOS
    app.quit() // 应用退出
  }
})

app.on('activate', () => {
  if (window === null) {
    createWindow()
  }
  if (settingWindow === null) {
    createSettingWindow()
  }
})

/**
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */

/*
import { autoUpdater } from 'electron-updater'

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})

app.on('ready', () => {
  if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
})
 */
