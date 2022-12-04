import path from "node:path"

import { app } from "electron"
import slash from "slash"

import type { IElectronPaths } from "@sing-types/Types"
import type { DirectoryPath, FilePath } from "@sing-types/Filesystem"

export const developmentDBPath = slash(
  path.join(app.getPath("userData"), "devDB.db")
) as FilePath

export const productionDBPath = slash(
  path.join(app.getPath("userData"), "productionDB.db")
) as FilePath

export const databasePath = import.meta.env.DEV
  ? developmentDBPath
  : productionDBPath
export const databaseURL = `file:${databasePath}`

export const coversDirectory = `${slash(
  app.getPath("userData")
)}/covers/` as DirectoryPath

export const electronPaths = [
  "home",
  "appData",
  "userData",
  "sessionData",
  "temp",
  "exe",
  "module",
  "desktop",
  "documents",
  "downloads",
  "music",
  "pictures",
  "videos",
  "recent",
  "logs",
  "crashDumps",
] satisfies readonly IElectronPaths[]
