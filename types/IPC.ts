/* eslint-disable @typescript-eslint/no-explicit-any */
import type { IPlaylistID } from "./Opaque"
import type { IError, INotification } from "./Types"
import type { ITrack, IAlbum, IArtist } from "./DatabaseTypes"
import type { DropFirst, ParametersWithoutFirst } from "./Utilities"
import type { queryHandlers } from "../packages/backend/src/lib/QueryHandlers"
import type { backendEventHandlers } from "../packages/backend/src/lib/EventHandlers"
import type { IpcRendererEvent } from "electron"
import type { Either } from "fp-ts/lib/Either"

export type ISyncResult = Either<
  IError,
  {
    readonly tracks: readonly ITrack[]
    readonly artists: readonly IArtist[]
    readonly albums: readonly IAlbum[]
  }
>

/**
 * Those are the event the renderer can react to from the main and backend process.
 * Also, as it is using IPC, the first argument is always the `IpcRendererEvent`.
 *
 * To make typing and usage easier, each function should only accept one argument, with the event argument left aside.
 */
export interface IFrontendEventsConsume {
  readonly syncedMusic: (event: IpcRendererEvent, newMusic: ISyncResult) => void

  readonly createNotification: (
    event: IpcRendererEvent,
    notification: INotification
  ) => void

  /**
   * If a playlist got deleted, created or renamed. Not if the tracks of a playlist changed.
   * Responsible for updating the playlists store, which does not hold information about all the playlists contents.
   */
  readonly playlistsUpdated: (event: IpcRendererEvent) => void

  /**
   * If the tracks of a playlist changed. Not if it was deleted or renamed.
   * This is so that a opened playlist can rerender with refreshed data.
   */
  readonly playlistUpdated: (
    event: IpcRendererEvent,
    playlist: IPlaylistID
  ) => void
}

export type IFrontendEventsSend = {
  [Key in keyof IFrontendEventsConsume]: DropFirst<
    Parameters<IFrontendEventsConsume[Key]>
  >[0]
}

/**
 * The available event handlers from the backend.
 */
export type IBackendEventHandlers = typeof backendEventHandlers

export type IQueryHandlers = typeof queryHandlers
export type IQueryChannels = keyof IQueryHandlers

export type IBackendQueryResponse = {
  readonly queryID: string
  readonly data: ReturnType<IQueryHandlers[IQueryChannels]>
  readonly shouldForwardToRenderer: false
}

/**
 * The structure of a query to the backend, for example to get a list of tracks fromn the database.
 *
 * The `queryID` is used to identify the response from the backend.
 *
 * It gets added internally by the function `queryBackend` and is nessecary to identify the corresponding response from the backend, as the communication is asynchronous.
 *
 * ! Important: All functions should only take the "emitter" and *one* argument, as I dont know how to type it otherwise.
 */
export type IBackendQuery<T extends IQueryChannels = IQueryChannels> = {
  readonly query: T
  readonly arguments_: Parameters<IQueryHandlers[T]>[1]
  readonly queryID: string
}

export type IBackendEmitChannels = keyof IBackendEventHandlers

// The handlers as the keys and their arguments as the values.
export type IBackendEmitHandlers = {
  readonly [key in IBackendEmitChannels]: ParametersWithoutFirst<
    IBackendEventHandlers[key]
  >
}

export type IBackendEmitToFrontend = {
  [key in keyof IFrontendEventsSend]: {
    event: key
    data: IFrontendEventsSend[key]
    shouldForwardToRenderer: true
  }
}[keyof IFrontendEventsSend]

export type IBackendEvent<
  T extends IBackendEmitChannels = IBackendEmitChannels
> = {
  readonly event: T
  readonly arguments_: IBackendEmitHandlers[T]
}

export type IBackendRequest = IBackendQuery | IBackendEvent
