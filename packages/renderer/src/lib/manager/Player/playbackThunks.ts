import { createAsyncThunk } from "@reduxjs/toolkit"
import * as E from "fp-ts/lib/Either"
import { pipe } from "fp-ts/lib/function"

import { convertToQueueItem, getTracksFromSource } from "./Helper"

import type {
  IError,
  ISetPlaybackArgument,
  ISetPlaybackArgumentWithItems,
  IQueueItem,
} from "@sing-types/Types"
import type { IPlaybackState } from "./playbackSlice"
import type { IRootState } from "@/lib/stores/mainStore"

export const playNewPlayback = createAsyncThunk(
  "playNewPlayback",
  async (
    newPlayback: ISetPlaybackArgument,
    thunkApi
  ): Promise<ISetPlaybackArgumentWithItems> => {
    const currentState = (thunkApi.getState() as IRootState).playback

    return fetchNewState(newPlayback, currentState).then(
      E.foldW(
        (error) => {
          throw error
        },

        (items) => ({
          ...newPlayback,
          items,
        })
      )
    )
  }
)

export const setRandomPlayback = createAsyncThunk(
  "setRandomPlayback",
  async (): Promise<ISetPlaybackArgumentWithItems> => {
    const newPlayback: ISetPlaybackArgument = {
      source: { origin: "allTracks" },
      index: 0,
    }

    return fetchNewState(newPlayback, { isShuffleOn: false }).then(
      E.foldW(
        (error) => {
          throw error
        },

        (items) => ({
          ...newPlayback,
          items,
        })
      )
    )
  }
)

export const toggleShuffle = createAsyncThunk(
  "toggleShuffle",
  async (_ = undefined, thunkApi) => {
    const currentState = (thunkApi.getState() as IRootState).playback

    if (currentState.source.origin === "NONE") {
      throw new Error("Cannot toggle shuffle with `origin: NONE` ")
    }

    const newPlayback: ISetPlaybackArgument = {
      source: currentState.source,
      isShuffleOn: !currentState.isShuffleOn,
      index: currentState.index,
    }

    return fetchNewState(newPlayback, {
      isShuffleOn: !currentState.isShuffleOn,
    }).then(
      E.getOrElseW((error) => {
        throw error
      })
    )
  }
)

export const goToRandomTracksPlayback = createAsyncThunk(
  "goToRandomTracksPlayback",
  async (_ = undefined, thunkApi) => {
    const currentState = (thunkApi.getState() as IRootState).playback

    const newPlayback: ISetPlaybackArgument = {
      source: { origin: "allTracks" },
      index: 0,
    }

    return fetchNewState(newPlayback, {
      isShuffleOn: !currentState.isShuffleOn,
    }).then(
      E.foldW(
        (error) => {
          throw error
        },

        (items) => items
      )
    )
  }
)

async function fetchNewState(
  newPlayback: ISetPlaybackArgument,
  currentState: Pick<IPlaybackState, "isShuffleOn">
): Promise<E.Either<IError, readonly IQueueItem[]>> {
  const isShuffleOn = newPlayback.isShuffleOn ?? currentState.isShuffleOn

  return pipe(
    await getTracksFromSource({ ...newPlayback, isShuffleOn }),

    E.chain((tracks) => {
      if (tracks.length === 0) {
        return E.left({
          message: "No tracks to play back",
          type: "Array is empty",
          error: new Error("Received no tracks"),
        })
      }

      const { firstTrack } = newPlayback

      const tracksToAdd =
        isShuffleOn && firstTrack
          ? [
              firstTrack,
              ...tracks.filter((track) => track.id !== firstTrack.id),
            ]
          : tracks

      return E.right(tracksToAdd.map(convertToQueueItem))
    })
  )
}
