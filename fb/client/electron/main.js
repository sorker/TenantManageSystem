const { app, BrowserWindow, Menu, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const isDev = process.env.NODE_ENV === 'development'
const log = require('electron-log')

// 配置日志
log.transports.file.level = 'debug'
log.info('应用启动')
log.info('当前工作目录:', process.cwd())
log.info('__dirname:', __dirname)
log.info('NODE_ENV:', process.env.NODE_ENV)

// 根据环境确定配置文件路径
let configPath
if (isDev) {
  configPath = path.join(__dirname, '../src/config/config.cjs')
} else {
  // 在生产环境中，配置文件会被复制到 resources 目录
  const resourcesPath = process.platform === 'darwin'
    ? path.join(process.resourcesPath, 'config')
    : path.join(process.resourcesPath, 'config')
  configPath = path.join(resourcesPath, 'config.cjs')
}

log.info('尝试加载配置文件路径:', configPath)

// 检查配置文件是否存在
if (fs.existsSync(configPath)) {
  log.info('配置文件存在')
  try {
    const stats = fs.statSync(configPath)
    log.info('配置文件大小:', stats.size, '字节')
  } catch (err) {
    log.error('读取配置文件信息失败:', err)
  }
} else {
  log.error('配置文件不存在')
  // 列出目录内容以帮助调试
  try {
    const dirPath = path.dirname(configPath)
    if (fs.existsSync(dirPath)) {
      log.info('目录内容:', fs.readdirSync(dirPath))
    } else {
      log.error('目录不存在:', dirPath)
    }
  } catch (err) {
    log.error('读取目录失败:', err)
  }
}

// 动态导入配置
let API_CONFIG, APP_CONFIG
try {
  const config = require(configPath)
  log.info('配置文件内容:', config)
  API_CONFIG = config.API_CONFIG
  APP_CONFIG = config.APP_CONFIG
  log.info('成功加载配置文件')
} catch (error) {
  log.error('加载配置文件失败:', error)
  log.error('错误堆栈:', error.stack)
  dialog.showErrorBox('错误', '无法加载配置文件，应用将退出。')
  app.quit()
}

// 从环境变量获取API地址
const API_BASE_URL = process.env.API_BASE_URL || API_CONFIG.BASE_URL

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      allowRunningInsecureContent: false,
      sandbox: true
    }
  })

  // 加载应用
  if (isDev) {
    log.info('开发模式：等待 Vite 开发服务器启动...')
    mainWindow.loadURL('http://localhost:5173')
    // 仅在开发模式下打开开发者工具
    mainWindow.webContents.openDevTools()
  } else {
    // 检查文件是否存在
    const indexPath = path.join(__dirname, '../dist/index.html')
    log.info('尝试加载页面路径:', indexPath)
    
    // 检查 dist 目录是否存在
    const distPath = path.join(__dirname, '../dist')
    if (fs.existsSync(distPath)) {
      log.info('dist 目录存在')
      log.info('dist 目录内容:', fs.readdirSync(distPath))
    } else {
      log.error('dist 目录不存在')
    }
    
    if (fs.existsSync(indexPath)) {
      log.info('index.html 文件存在')
      mainWindow.loadFile(indexPath)
    } else {
      log.error('index.html 文件不存在')
      dialog.showErrorBox('错误', '找不到主页面文件')
    }
  }

  // 注入 API 基础 URL
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(`
      window.API_BASE_URL = "${API_BASE_URL}";
      window.APP_CONFIG = ${JSON.stringify(APP_CONFIG)};
    `)
  })

  // 添加页面加载事件监听
  mainWindow.webContents.on('did-start-loading', () => {
    log.info('开始加载页面')
  })

  mainWindow.webContents.on('did-finish-load', () => {
    log.info('页面加载完成')
  })

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    log.error('页面加载失败:', errorCode, errorDescription)
    dialog.showErrorBox('错误', `页面加载失败: ${errorDescription}`)
  })

  // 窗口准备好后再显示，避免白屏
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // 处理窗口关闭
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // 创建应用菜单
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '退出',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit()
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'forceReload', label: '强制重新加载' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '重置缩放' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: async () => {
            dialog.showMessageBox(mainWindow, {
              title: '关于',
              message: '租户管理系统',
              detail: `版本: ${app.getVersion()}`
            })
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// 错误处理
process.on('uncaughtException', (error) => {
  log.error('未捕获的异常:', error)
  dialog.showErrorBox('错误', '发生了一个未预期的错误，应用将退出。')
  app.quit()
})

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})