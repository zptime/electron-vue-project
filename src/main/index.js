'use strict'

import Uploader from './utils/uploader.js'
import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  Notification,
  clipboard,
  ipcMain,
  globalShortcut,
  dialog,
  systemPreferences
} from 'electron'
import db from '../datastore' // 引入db
import beforeOpen from './utils/beforeOpen'
import pasteTemplate from './utils/pasteTemplate'
// import updateChecker from './utils/updateChecker'
import { getPicBeds } from './utils/getPicBeds'
import pkg from '../../package.json'
import picgoCoreIPC from './utils/picgoCoreIPC'
import fixPath from 'fix-path'
import { getUploadFiles } from './utils/handleArgv'
import bus from './utils/eventBus'
import {
  updateShortKeyFromVersion212
} from './migrate/shortKeyUpdateHelper'
import {
  shortKeyUpdater,
  initShortKeyRegister
} from './utils/shortKeyRegister'
if (process.platform === 'darwin') {
  beforeOpen()
}
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
const winURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`
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
      toggleWindow(bounds) // 打开或关闭小窗口
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
      if (miniWindow) {
        miniWindow.hide()
      }
    }
  })

  // 拖拽事件
  tray.on('drag-enter', () => { // 当刚拖拽到icon上时
    if (systemPreferences.isDarkMode()) {
      tray.setImage(`${__static}/upload-dark.png`)
    } else {
      tray.setImage(`${__static}/upload.png`)
    }
  })

  tray.on('drag-end', () => { // 当拖拽事件结束时
    tray.setImage(`${__static}/menubar.png`)
  })
  tray.on('drop-files', async (event, files) => {
    const pasteStyle = db.read().get('settings.pasteStyle').value() || 'markdown'
    const imgs = await new Uploader(files, window.webContents).upload()
    if (imgs !== false) {
      for (let i in imgs) {
        clipboard.writeText(pasteTemplate(pasteStyle, imgs[i]))
        const notification = new Notification({
          title: '上传成功',
          body: imgs[i].imgUrl,
          icon: files[i]
        })
        setTimeout(() => {
          notification.show()
        }, i * 100)
        db.read().get('uploaded').insert(imgs[i]).write()
      }
      window.webContents.send('dragFiles', imgs)
    }
  })
  // toggleWindow()
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
const createSettingWindow = () => {
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

// 剪贴板图片上传 upload.vue
const uploadClipboardFiles = async () => {
  let win
  if (miniWindow.isVisible()) {
    win = miniWindow
  } else {
    win = settingWindow || window || createSettingWindow()
  }
  let img = await new Uploader(undefined, win.webContents).upload()
  if (img !== false) {
    if (img.length > 0) {
      const pasteStyle = db.read().get('settings.pasteStyle').value() || 'markdown'
      clipboard.writeText(pasteTemplate(pasteStyle, img[0]))
      const notification = new Notification({ // 上传成功弹框
        title: '上传成功',
        body: img[0].imgUrl,
        icon: img[0].imgUrl
      })
      notification.show()
      db.read().get('uploaded').insert(img[0]).write()
      window.webContents.send('clipboardFiles', [])
      window.webContents.send('uploadFiles', img)
      if (settingWindow) {
        settingWindow.webContents.send('updateGallery')
      }
    } else {
      const notification = new Notification({ // 上传失败弹框
        title: '上传不成功',
        body: '你剪贴板最新的一条记录不是图片哦'
      })
      notification.show()
    }
  }
}

// 图片上传（点击上传、拖拽上传）upload.vue
const uploadChoosedFiles = async (webContents, files) => {
  const input = files.map(item => item.path)
  const imgs = await new Uploader(input, webContents).upload()
  if (imgs !== false) {
    const pasteStyle = db.read().get('settings.pasteStyle').value() || 'markdown'
    let pasteText = ''
    for (let i in imgs) {
      pasteText += pasteTemplate(pasteStyle, imgs[i]) + '\r\n'
      const notification = new Notification({// 成功提示弹框
        title: '上传成功',
        body: imgs[i].imgUrl,
        icon: files[i].path
      })
      setTimeout(() => {
        notification.show()
      }, i * 100)
      db.read().get('uploaded').insert(imgs[i]).write()
    }
    clipboard.writeText(pasteText)
    window.webContents.send('uploadFiles', imgs)
    if (settingWindow) {
      settingWindow.webContents.send('updateGallery')
    }
  }
}

picgoCoreIPC(app, ipcMain)

// from macOS tray
ipcMain.on('uploadClipboardFiles', async (evt, file) => {
  const img = await new Uploader(undefined, window.webContents).upload()
  if (img !== false) {
    const pasteStyle = db.read().get('settings.pasteStyle').value() || 'markdown'
    clipboard.writeText(pasteTemplate(pasteStyle, img[0]))
    const notification = new Notification({
      title: '上传成功',
      body: img[0].imgUrl,
      // icon: file[0]
      icon: img[0].imgUrl
    })
    notification.show()
    db.read().get('uploaded').insert(img[0]).write()
    window.webContents.send('clipboardFiles', [])
    if (settingWindow) {
      settingWindow.webContents.send('updateGallery')
    }
  }
  window.webContents.send('uploadFiles')
})

// 剪贴板图片上传 upload.vue
ipcMain.on('uploadClipboardFilesFromUploadPage', () => {
  uploadClipboardFiles()
})

ipcMain.on('uploadChoosedFiles', async (evt, files) => {
  return uploadChoosedFiles(evt.sender, files)
})

ipcMain.on('updateShortKey', (evt, item) => {
  shortKeyUpdater(globalShortcut, item)
  const notification = new Notification({
    title: '操作成功',
    body: '你的快捷键已经修改成功'
  })
  notification.show()
})

ipcMain.on('updateCustomLink', (evt, oldLink) => {
  const notification = new Notification({
    title: '操作成功',
    body: '你的自定义链接格式已经修改成功'
  })
  notification.show()
})

ipcMain.on('autoStart', (evt, val) => {
  app.setLoginItemSettings({
    openAtLogin: val
  })
})

ipcMain.on('openSettingWindow', (evt) => {
  if (!settingWindow) {
    createSettingWindow()
  } else {
    settingWindow.show()
  }
  miniWindow.hide()
})

ipcMain.on('openMiniWindow', (evt) => {
  if (!miniWindow) {
    createMiniWidow()
  }
  miniWindow.show()
  miniWindow.focus()
  settingWindow.hide()
})

//  from mini window
ipcMain.on('syncPicBed', (evt) => {
  if (settingWindow) {
    settingWindow.webContents.send('syncPicBed')
  }
})

ipcMain.on('getPicBeds', (evt) => {
  const picBeds = getPicBeds(app)
  evt.sender.send('getPicBeds', picBeds)
  evt.returnValue = picBeds
})

ipcMain.on('updateShortKey', (evt, val) => {
  // console.log(val)
})

// const shortKeyHash = {
//   upload: uploadClipboardFiles
// }

// 在 macOS 上, 当用户尝试在 Finder 中打开您的应用程序的第二个实例时, 系统会通过发出 open-file 和 open-url 事件来自动强制执行单个实例,。 但是当用户在命令行中启动应用程序时, 系统的单实例机制将被绕过, 您必须手动调用此方法来确保单实例。
const gotTheLock = app.requestSingleInstanceLock()
// 上面方法报错：electron__WEBPACK_IMPORTED_MODULE_3__.app.requestSingleInstanceLock is not a function
// 参考一：requestSingleInstanceLock替换为makeSingleInstance  实践无效
// const gotTheLock = app.makeSingleInstance()
// electron2.0--app.makeSingleInstance来实现单实例；electron4.0--app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    let files = getUploadFiles(commandLine, workingDirectory)
    if (files === null || files.length > 0) { // 如果有文件列表作为参数，说明是命令行启动
      if (files === null) {
        uploadClipboardFiles()
      } else {
        let win
        if (miniWindow && miniWindow.isVisible()) {
          win = miniWindow
        } else {
          win = settingWindow || window || createSettingWindow()
        }
        uploadChoosedFiles(win.webContents, files)
      }
    } else {
      if (settingWindow) {
        if (settingWindow.isMinimized()) {
          settingWindow.restore()
        }
        settingWindow.focus()
      }
    }
  })
}

if (process.platform === 'win32') {
  app.setAppUserModelId(pkg.build.appId)
}

if (process.env.XDG_CURRENT_DESKTOP && process.env.XDG_CURRENT_DESKTOP.includes('Unity')) {
  process.env.XDG_CURRENT_DESKTOP = 'Unity'
}

app.on('ready', () => {
  createWindow()
  createSettingWindow()
  if (process.platform === 'darwin' || process.platform === 'win32') {
    createTray()
  }
  db.read().set('needReload', false).write()
  // updateChecker() // 提示版本更新的弹框
  initEventCenter()
  // 不需要阻塞
  process.nextTick(() => {
    updateShortKeyFromVersion212(db, db.read().get('settings.shortKey').value())
    initShortKeyRegister(globalShortcut, db.read().get('settings.shortKey').value())
  })

  if (process.env.NODE_ENV !== 'development') {
    let files = getUploadFiles()
    if (files === null || files.length > 0) { // 如果有文件列表作为参数，说明是命令行启动
      if (files === null) {
        uploadClipboardFiles()
      } else {
        let win
        if (miniWindow && miniWindow.isVisible()) {
          win = miniWindow
        } else {
          win = settingWindow || window || createSettingWindow()
        }
        uploadChoosedFiles(win.webContents, files)
      }
    }
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
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

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  bus.removeAllListeners()
})

app.setLoginItemSettings({
  openAtLogin: db.read().get('settings.autoStart').value() || false
})

function initEventCenter () {
  const eventList = {
    'picgo:upload': uploadClipboardFiles
  }
  for (let i in eventList) {
    bus.on(i, eventList[i])
  }
}
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
