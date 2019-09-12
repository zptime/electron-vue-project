import Datastore from 'lowdb'
import LodashId from 'lodash-id'
import FileSync from 'lowdb/adapters/FileSync'
import path from 'path'
import fs from 'fs-extra'
import { remote, app } from 'electron' // 引入remote模块

if (process.env.NODE_ENV !== 'development') {
  global.__static = path.join(__dirname, '/static').replace(/\\/g, '\\\\')
}
if (process.env.DEBUG_ENV === 'debug') {
  global.__static = path.join(__dirname, '../../static').replace(/\\/g, '\\\\')
}

// app模块是main进程里特有的，renderer进程应该使用remote.app模块
const APP = process.type === 'renderer' ? remote.app : app // 根据process.type来分辨在哪种模式使用哪种模块
const STORE_PATH = APP.getPath('userData') // 获取electron应用的用户目录  C:\Users\pzhang\AppData\Roaming\Electron

// 生产模式下，第一次打开应用的过程中，APP.getPath('userData')获取的路径并未创建，而datastore.js却已经被加载。此时初始化路径并不存在
if (process.type !== 'renderer') {
  // fs是来自fs-extra模块
  if (!fs.pathExistsSync(STORE_PATH)) { // 如果不存在路径
    fs.mkdirpSync(STORE_PATH) // 就创建
  }
}

// lowdb是用JSON为基本存储结构基于lodash开发的，有lodash的加持。优势在于它在持续的维护，有不少好用的插件；关键的是同步操作，采用链式调用的写法，写起来有种jQuery的感觉；再者，用JSON存储的数据，不管是调用还是备份都很方便。
// electron 给 main 进程和 renderer 进程都置入了 Node 的 fs 模块，可以很方便的在两端都使用跟fs相关的操作。而lowdb本质上就是通过fs来读写JSON文件实现的。
const adapter = new FileSync(path.join(STORE_PATH, '/data.json')) // 初始化lowdb读写的json文件名以及存储路径

const db = Datastore(adapter) // lowdb接管该文件
// lowdb无法很方便地创建一个自增的id字段，但是通过lodash-id这个插件可以很方便地为每个新增的数据自动加上一个唯一标识的id字段
db._.mixin(LodashId) // 通过._mixin()引入

// 需要预先指定数据库的基本结构，比如是个数组，初始化为[]。如果是个Object，有具体值，就指定为具体值。而初始化数据结构，应该在数据库一开始创建的时候就初始化。
if (!db.has('uploaded').value()) { // 先判断该值存不存在
  db.set('uploaded', []).write() // 不存在就创建
}

if (!db.has('picBed').value()) {
  db.set('picBed', {
    current: 'weibo'
  }).write()
}

if (!db.has('settings.shortKey').value()) {
  db.set('settings.shortKey', {
    upload: 'CommandOrControl+Shift+P'
  }).write()
}

// init generate clipboard image files
let clipboardFiles = getClipboardFiles()
if (!fs.pathExistsSync(path.join(STORE_PATH, 'windows10.ps1'))) {
  clipboardFiles.forEach(item => {
    fs.copyFileSync(item.origin, item.dest)
  })
} else {
  clipboardFiles.forEach(item => {
    diffFilesAndUpdate(item.origin, item.dest)
  })
}

function diffFilesAndUpdate (filePath1, filePath2) {
  let file1 = fs.readFileSync(filePath1)
  let file2 = fs.readFileSync(filePath2)

  if (!file1.equals(file2)) {
    fs.copyFileSync(filePath1, filePath2)
  }
}

function getClipboardFiles () {
  let files = [
    '/linux.sh',
    '/mac.applescript',
    '/windows.ps1',
    '/windows10.ps1'
  ]

  return files.map(item => {
    return {
      origin: path.join(__static, item),
      dest: path.join(STORE_PATH, item)
    }
  })
}

export default db // 暴露出去
