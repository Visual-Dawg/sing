import { NOTIFICATION_LABEL } from "@sing-renderer/Consts"
import {
  getLeftsRights,
  getLeftValues,
  getRightValues,
  getSupportedMusicFiles,
  getUnsupportedMusicFiles,
  hasCover,
  isDefined,
  removeDuplicates,
} from "@sing-shared/Pures"
import { isLeft, left, right } from "fp-ts/lib/Either"
import log from "ololog"
import slash from "slash"

import { deleteFromDirectoryInverted, getFilesFromDirectory } from "../Helper"
import {
  addTrackToDB,
  deleteAlbumsInverted,
  deleteArtistsInverted,
  deleteCoversInverted,
  deleteTracksInverted,
} from "./Crud"
import createPrismaClient from "./CustomPrismaClient"
import { convertMetadata, getCover, getRawMetaDataFromFilepath, saveCover } from "./Metadata"

import type {
  IErrorArrayIsEmpty,
  IErrorInvalidArguments,
} from "@sing-types/Types"

import type { IHandlerEmitter } from "@/types/Types"
import type { DirectoryPath } from "@sing-types/Filesystem"

const prisma = createPrismaClient()

// TODO sync should update cover of albums if they changed (it works for tracks)

//? The error rendering functionality is not implemented yet, so there is no need to return the errors (and make the typing more complicated)

// Optimize sync speed - Low priority, now its fast enough
// Get all track filepaths with the file MD5 checksum and filter the new ones to add out if they have the same MD5 checksum
// Then upsert only the ones which already exist, for the rest use one big `createMany` statement
export async function syncMusic(
  handlerEmitter: IHandlerEmitter,
  {
    coversDirectory,
    directories,
  }: {
    coversDirectory: DirectoryPath
    directories: DirectoryPath[]
  }
): Promise<void> {
  if (!Array.isArray(directories)) {
    const error: IErrorInvalidArguments = {
      type: "Invalid arguments",
      message: `Directories to sync must be of type array. Received ${directories}`,
      error: new Error(
        `Directories to sync must be of type array. Received ${directories}`
      ),
    }

    log.red(error)

    handlerEmitter.emit("sendToMain", {
      event: "syncedMusic",
      data: left(error),
      emitToRenderer: true,
    })
    return
  }
  if (directories.length === 0) {
    const error: IErrorArrayIsEmpty = {
      type: "Array is empty",
      error: new Error("No directories to sync provided"),
      message: "No directories to sync provided.",
    }

    log.red("No directories to sync provided", error)

    handlerEmitter.emit("sendToMain", {
      event: "syncedMusic",
      data: left(error),
      emitToRenderer: true,
    })
    return
  }

  handlerEmitter.emit("sendToMain", {
    event: "createNotification",
    data: {
      label: NOTIFICATION_LABEL.syncStarted,
    },
    emitToRenderer: true,
  })

  log("Reading out dirs")

  const directoriesContents = await Promise.all(
    directories
      .map(slash)
      .map((directory) => getFilesFromDirectory(directory as DirectoryPath))
  )

  const folderReadErrors = getLeftValues(directoriesContents)

  if (folderReadErrors.length > 0) log("folderReadErrors:", folderReadErrors)

  const allFiles = getRightValues(directoriesContents).flat()

  const supportedFiles = getSupportedMusicFiles(allFiles)
  const unsupportedFiles = getUnsupportedMusicFiles(allFiles)

  if (unsupportedFiles.length > 0) log("unsupportedFiles:", unsupportedFiles)

  const { left: fileReadErrors, right: rawMetaData } = getLeftsRights(
    await Promise.all(supportedFiles.map(getRawMetaDataFromFilepath))
  )

  if (fileReadErrors.length > 0) log("fileReadErrors:", fileReadErrors)

  log("Getting metadata")

  const metaData = await Promise.all(
    rawMetaData.map(convertMetadata(coversDirectory))
  )

  // Save the covers to the cover folder
  // const { left: coverWriteErrors, right: savedCoverPaths } =
  const { left: coverWriteErrors, right: savedCoverPaths } = getLeftsRights(
    await Promise.all(
      rawMetaData
        .filter(hasCover)
        .map((data) => data.common.picture)
        .map(getCover(coversDirectory))
        .map(async (coverData) => saveCover(await coverData))
    )
  )

  if (coverWriteErrors.length > 0) log("coverWriteErrors:", coverWriteErrors)

  log("Updating database")

  // Add tracks to the database
  // Use a sync loop for Prisma as it might otherwise throw a timeOutException if it is done in async
  // https://github.com/prisma/prisma/issues/10306
  const addedDBTracks = []
  const failedDBTracks = []
  for (const track of metaData) {
    // It should await each operation to make it non-async
    // eslint-disable-next-line no-await-in-loop
    const result = await addTrackToDB(track)
    if (isLeft(result)) failedDBTracks.push(result.left)
    else {
      addedDBTracks.push(result.right)
    }
  }

  const addedFilepaths = addedDBTracks.map(({ filepath }) => filepath)
  const addedAlbums = addedDBTracks
    .map(({ albumName }) => albumName)
    .filter(isDefined)
  const addedArtists = addedDBTracks
    .map(({ artistName }) => artistName)
    .filter(isDefined)
  const addedCovers = addedDBTracks
    .map(({ coverPath }) => coverPath)
    .filter(isDefined)

  //* Clean up
  // Remove unused tracks in the database
  const deleteTracksResult = await deleteTracksInverted(addedFilepaths)
  const deleteArtistsResult = await deleteArtistsInverted(addedArtists)
  const deleteAlbumsResult = await deleteAlbumsInverted(addedAlbums)
  const deleteCoversResult = await deleteCoversInverted(addedCovers)

  if (isLeft(deleteTracksResult))
    log("deleteTracksResult:", deleteTracksResult.left)
  if (isLeft(deleteArtistsResult))
    log("deleteArtistsResult:", deleteArtistsResult.left)
  if (isLeft(deleteAlbumsResult))
    log("deleteAlbumsResult:", deleteAlbumsResult.left)
  if (isLeft(deleteCoversResult))
    log("deleteCoversResult:", deleteCoversResult.left)

  // Remove unused covers
  const deleteCoversFilesystemResult = await deleteFromDirectoryInverted(
    coversDirectory,
    savedCoverPaths.filter(removeDuplicates)
  )

  if (isLeft(deleteCoversFilesystemResult))
    log(deleteCoversFilesystemResult.left)
  else if (deleteCoversFilesystemResult.right.deletionErrors.length > 0)
    log(deleteCoversFilesystemResult.right.deletionErrors)

  const deleteCoverErrors =
    isLeft(deleteCoversResult) && deleteCoversResult.left

  if (deleteCoverErrors) log("deleteCoverError:", deleteCoverErrors)

  // Emit added tracks and errors as right values
  handlerEmitter.emit("sendToMain", {
    emitToRenderer: true,
    event: "syncedMusic",
    data: right({
      tracks: addedDBTracks,
      artists: await prisma.artist.findMany(),
      albums: await prisma.album.findMany(),
    }),
  })

  log("Finished syncing music")
}
