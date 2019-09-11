'use strict'

import { app, BrowserWindow, Tray, Menu, dialog } from 'electron'

import db from '../datastore'
import pkg from '../../package.json'
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

let settingWindow
let tray
let menu
const winURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`

function createContextMenu () {
  const contextMenu = Menu.buildFromTemplate([
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
      }
    },
    {
      label: '选择默认图床',
      type: 'submenu',
      submenu: [
        {
          label: '微博图床',
          type: 'radio',
          checked: db.read().get('picBed.current').value() === 'weibo',
          click () {
            db.read().set('picBed.current', 'weibo')
              .write()
          }
        },
        {
          label: '七牛图床',
          type: 'radio',
          checked: db.read().get('picBed.current').value() === 'qiniu',
          click () {
            db.read().set('picBed.current', 'qiniu')
              .write()
          }
        },
        {
          label: '腾讯云COS',
          type: 'radio',
          checked: db.read().get('picBed.current').value() === 'tcyun',
          click () {
            db.read().set('picBed.current', 'tcyun')
              .write()
          }
        },
        {
          label: '又拍云图床',
          type: 'radio',
          checked: db.read().get('picBed.current').value() === 'upyun',
          click () {
            db.read().set('picBed.current', 'upyun')
              .write()
          }
        }
      ]
    },
    {
      label: '打开更新助手',
      type: 'checkbox',
      checked: db.get('picBed.showUpdateTip').value(),
      click () {
        const value = db.read().get('picBed.showUpdateTip').value()
        db.read().set('picBed.showUpdateTip', !value).write()
      }
    },
    {
      role: 'quit',
      label: '退出'
    }
  ])

  return contextMenu
}

function createTray () {
  // Tray 不同系统的任务栏里的图标组件。比如，Tray配合上图标之后，在macOS里是顶部栏里的应用图标；在windows右下角的应用图标
  const menubarPic = process.platform === 'darwin' ? `${__static}/menubar.png` : `${__static}/menubar-nodarwin.png`
  tray = new Tray(menubarPic) // 指定图片的路径

  // 鼠标左键、右键事件
  tray.on('right-click', () => { // 鼠标右键点击事件
    window.hide() // 隐藏小窗口
    // Tray另一个重要的作用就是开启菜单项
    tray.popUpContextMenu(createContextMenu()) // 打开菜单
  })
  tray.on('click', () => { // 鼠标左键点击事件
    if (process.platform === 'darwin') { // 如果是macOS
      // toggleWindow() // 打开或关闭小窗口
    } else { // 如果是windows
      window.hide() // 隐藏小窗口
      if (settingWindow === null) { // 如果主窗口不存在就创建一个
        createSettingWindow()
        settingWindow.show()
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

function createSettingWindow () {
  /**
   * Initial window options
   */
  const options = {
    height: 450,
    // useContentSize: true,
    width: 800,
    show: false, // 创建后是否显示
    frame: true, // 是否创建frameless窗口
    fullscreenable: false, // 是否允许全屏
    center: true, // 是否出现在屏幕居中的位置
    backgroundColor: '#3f3c37', // 背景色，用于transparent和frameless窗口
    title: 'PicGo',
    titleBarStyle: 'hidden', // 标题栏的样式，有hidden、hiddenInset、customButtonsOnHover等
    resizable: false, // 是否允许拉伸大小
    transparent: true, // 是否是透明窗口（仅macOS）
    vibrancy: 'ultra-dark', // 窗口模糊的样式（仅macOS）
    webPreferences: {
      backgroundThrottling: false, // 当页面被置于非激活窗口的时候是否停止动画和计时器
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      webSecurity: false
    }
  }
  if (process.platform !== 'darwin') { // 针对不是macOS(即windows 或者 linux)平台做出不同配置
    options.show = true // 创建即展示
    // options.frame = false // 创建一个frameless窗口，此时窗口没有自带顶部栏和菜单栏
    options.transparent = false
    options.icon = `${__static}/logo.png`
  }
  settingWindow = new BrowserWindow(options)

  // 加载窗口的URL -> 来自renderer进程的页面
  settingWindow.loadURL(winURL)

  settingWindow.on('closed', () => {
    settingWindow = null
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
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
