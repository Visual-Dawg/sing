import { IpcMainInvokeEvent, ipcMain } from "electron"
import { app, dialog } from "electron"
import slash from "slash"
import type { ITrack } from "@sing-types/Types"
import { Tracks } from "../../main/src/lib/Crud"
import { syncDirs } from "../../main/src/lib/Sync"
import userSettingsStore, {
  IUserSettings,
  IUserSettingsKey,
} from "../../main/src/lib/UserSettings"
import channels from "./Channels"
import { OpenDialogReturnValue } from "electron/main"
import c from "ansicolor"
import { isLeft } from "fp-ts/lib/Either"

export default function ipcInit(): void {
  ipcMain.handle(channels.GET_TRACKS, async (_event): Promise<ITrack[]> => {
    return await Tracks.get({
      select: {
        id: true,
        album: true,
        artist: true,
        duration: true,
        filepath: true,
        title: true,
        coverPath: true,
      },
    })
  })

  ipcMain.handle(
    channels.SET_USER_SETTINGS,
    async <Key extends IUserSettingsKey>(
      _event: IpcMainInvokeEvent,
      setting: Key,
      value: IUserSettings[Key]
    ): Promise<boolean> => {
      userSettingsStore.set(setting, value)
      return true
    }
  )

  ipcMain.handle(channels.SYNC, async (event) => {
    await sync(event)
  })

  ipcMain.handle(
    channels.OPEN_DIR,
    async (_, options: Electron.OpenDialogOptions = {}) => {
      let { filePaths, canceled } = await dialog.showOpenDialog(options)

      filePaths = filePaths.map((filePath) => slash(filePath)) // Convert to UNIX path

      return { filePaths, canceled }
    }
  )

  ipcMain.handle(channels.GET_PATH, async (_event, name) => {
    return slash(app.getPath(name))
  })

  ipcMain.handle(
    channels.OPEN_MUSIC_FOLDER,
    async (_event): Promise<OpenDialogReturnValue> => {
      let { filePaths, canceled } = await dialog.showOpenDialog({
        title: "Pick folder",
        defaultPath: app.getPath("music"),
        properties: ["openDirectory", "dontAddToRecent", "multiSelections"],
      })

      filePaths = filePaths.map((filePath) => slash(filePath)) // Convert to UNIX path

      return { filePaths, canceled }
    }
  )

  ipcMain.handle(
    channels.GET_USER_SETTINGS,
    async (_event: IpcMainInvokeEvent, setting: IUserSettingsKey) =>
      userSettingsStore.get(setting)
  )

  ipcMain.handle(channels.RESET_MUSIC, async (event) => {
    userSettingsStore.reset("musicFolders")
    await sync(event)

    console.log(c.yellow("Music reset successfully"))

    return true
  })
}

async function sync(event: IpcMainInvokeEvent) {
  const directories = userSettingsStore.get("musicFolders")
  const response = await syncDirs(directories ?? [])

  if (isLeft(response)) {
    console.error(response.left.error?.message ?? "")
    console.error(response.left.error)
    return
  }

  const { addedDBTracks } = response.right

  // Emit library track update for the frontend
  event.sender.send(channels.ON_TRACKS_UPDATED, addedDBTracks)
}
