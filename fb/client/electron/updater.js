const { autoUpdater } = require('electron-updater')
const log = require('electron-log')
const { dialog } = require('electron')

// 配置日志
autoUpdater.logger = log
autoUpdater.logger.transports.file.level = 'info'

// 检查更新
function checkForUpdates() {
  // 检查更新
  autoUpdater.checkForUpdates()

  // 更新下载完成
  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      type: 'info',
      title: '应用更新',
      message: '更新已下载，应用将重启并安装更新...',
      buttons: ['确定']
    }).then(() => {
      // 安装更新
      autoUpdater.quitAndInstall()
    })
  })

  // 更新错误
  autoUpdater.on('error', (err) => {
    log.error('更新错误:', err)
    dialog.showErrorBox('更新错误', '检查更新时发生错误，请稍后重试。')
  })

  // 检查更新错误
  autoUpdater.on('checking-for-update', () => {
    log.info('正在检查更新...')
  })

  // 发现新版本
  autoUpdater.on('update-available', (info) => {
    log.info('发现新版本:', info)
  })

  // 当前已是最新版本
  autoUpdater.on('update-not-available', (info) => {
    log.info('当前已是最新版本:', info)
  })

  // 更新下载进度
  autoUpdater.on('download-progress', (progressObj) => {
    log.info('下载进度:', progressObj)
  })
}

module.exports = {
  checkForUpdates
} 