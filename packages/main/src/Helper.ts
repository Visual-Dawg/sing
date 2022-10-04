import { checkPathAccessible } from "@sing-backend/Helper"
import { isError } from "@sing-types/Typeguards"
import { dialog } from "electron"
import * as E from "fp-ts/lib/Either"
import { copyFile } from "node:fs/promises"
import path from "node:path"
import log from "ololog"

import type { FilePath } from "@sing-types/Filesystem"

export function chooseFolders() {
  const paths = dialog.showOpenDialog({
    properties: ["openDirectory", "multiSelections"],
  })

  return paths
}

// Check if database exists. If not copy the empty master to make it available
export async function checkDatabase(databasePath: FilePath) {
  const checkAccessible = await checkPathAccessible(databasePath)
  if (E.isLeft(checkAccessible)) {
    const possibleError = checkAccessible.left.error

    if (
      isError(possibleError) &&
      !possibleError.message.includes("no such file or directory")
    ) {
      log.error.red(possibleError)
    }

    if (import.meta.env.DEV) {
      copyFile(
        path.join(__dirname, "../public/masterDB.db"),
        databasePath
      ).catch(log.error.red)
    } else {
      copyFile(path.join(__dirname, "masterDB.db"), databasePath).catch(
        log.error.red
      )
    }
  }
}
