import { restoreOrCreateWindow } from "@/mainWindow"
import { app } from "electron"
import log from "ololog"

import ipc from "../../preload/src/ipcMain"
import { databasePath } from "./Consts"
import { checkDatabase } from "./Helper"

log.noLocate.inverse("  Main script started  ")
log.noLocate(import.meta.env.DEV ? "Dev mode" : "production mode")

checkDatabase(databasePath)

/**
 * Prevent multiple instances
 */
const isSingleInstance = app.requestSingleInstanceLock()
if (!isSingleInstance) {
  app.quit()
  process.exit(0)
}
app.on("second-instance", restoreOrCreateWindow)

/**
 * Disable Hardware Acceleration for linux platforms
 */
// if (process.platform === "linux") app.disableHardwareAcceleration()

/**
 * Shout down background process if all windows was closed
 */
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

/**
 * @see https://www.electronjs.org/docs/v14-x-y/api/app#event-activate-macos Event: 'activate'
 */
app.on("activate", restoreOrCreateWindow)

/**
 * Create app window when background process will be ready
 */
app
  .whenReady()
  .then(restoreOrCreateWindow)
  .catch((e) => console.error("Failed create window:", e))

// Load IPC handlers
try {
  ipc()
} catch (e) {
  log.red(e)
}

/**
 * Check new app version in production mode only
 */
// if (import.meta.env.PROD) {
//   app
//     .whenReady()
//     .then(() => import("electron-updater"))
//     .then(({ autoUpdater }) => autoUpdater.checkForUpdatesAndNotify())
//     .catch((e) => console.error("Failed check updates:", e))
// }
