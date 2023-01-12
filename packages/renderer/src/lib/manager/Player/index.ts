import { dequal } from "dequal"
import * as E from "fp-ts/lib/Either"
import { derived, get, writable, type Readable } from "svelte/store"
import { match } from "ts-pattern"
import { pipe } from "fp-ts/lib/function"

import {
  moveElementFromToIndex,
  notifiyError,
  sortAlphabetically,
} from "@/Helper"

import { audioPlayer } from "./AudioPlayer"
import { loopStateStore } from "./stores/LoopStateStore"
import { indexStore } from "./stores/PlayIndex"
import { autoQueueStore } from "./stores/QueueStore"
import { manualQueueStore } from "./stores/ManualQueueStore"
import {
  getTracksFromSource,
  initialiseMediaKeysHandler,
  setMediaSessionMetaData,
} from "./Helper"

import type { IPlayLoop, IPlayState, IQueueItem } from "@/types/Types"
import type { IAlbum, IArtist, ITrack } from "@sing-types/DatabaseTypes"
import type { INewPlayback, IPlayback, ISyncResult } from "@sing-types/Types"
import type { IpcRendererEvent } from "electron"

export const removeIndexFromManualQueue = manualQueueStore.removeIndex
export const addTracksToManualQueueEnd = manualQueueStore.addTracksToEnd
export const addTracksToManualQueueBeginning =
  manualQueueStore.addTracksToBeginning

/**
 * Used to determine if the player is currently playing from the tracks added manually to the queue.
 */
const isPlayingFromManualQueue = writable(false)

// Create stores / state
const playStateStore = writable<IPlayState>("none")
const volumeStore = writable(1)
const currentTimeStore = writable(0)
const durationStore = writable(0)
const artistsStore = writable<readonly IArtist[]>([])
const albumsStore = writable<readonly IAlbum[]>([])
const tracksStore = writable<readonly ITrack[]>([])
const playbackStore = writable<IPlayback>({
  source: "allTracks",
  sortBy: ["title", "ascending"],
  isShuffleOn: false,
})

// Initialise stores with the music from the database
await initialiseStores()

// Now it makes sense to create and use the derived stores, as the base stores are initialised
export const currentTrack: Readable<ITrack | undefined> = derived(
  [autoQueueStore, indexStore, manualQueueStore, isPlayingFromManualQueue],
  ([$queue, $index, $manualQueue, $isPlayingFromManualQueue]) =>
    $isPlayingFromManualQueue ? $manualQueue[0] : $queue[$index]?.track
)

export const shuffleState = derived(
  playbackStore,
  ({ isShuffleOn }) => isShuffleOn
)

// Bind the values of the stores localy.
let $playState: IPlayState = "none"
let $autoQueue: readonly IQueueItem[] = []
let $currentIndex = -1
let $currentTrack: ITrack | undefined
let $playback: IPlayback
let seekbarProgressIntervalID: NodeJS.Timer
let $isShuffleOn: boolean
let $loopState: IPlayLoop
let $manualQueue: readonly ITrack[]
let $isPlayingFromManualQueue = false
let $volume: number

let volumeBeforeMute: number | undefined

autoQueueStore.subscribe(($newQueue) => {
  $autoQueue = $newQueue
})

volumeStore.subscribe(($newVolume) => {
  $volume = $newVolume

  audioPlayer.setVolume($newVolume)
})

indexStore.subscribe(($newIndex) => {
  $currentIndex = $newIndex
  resetCurrentTime()
})

playStateStore.subscribe(handlePlayStateUpdate)

currentTrack.subscribe(($newCurrentTrack) => {
  $currentTrack = $newCurrentTrack

  setMediaSessionMetaData($currentTrack)

  if ($currentTrack) {
    audioPlayer.setSource($currentTrack.filepath)
  }
})

playbackStore.subscribe(($newPlayback) => {
  $playback = $newPlayback
})

isPlayingFromManualQueue.subscribe(
  ($newState) => ($isPlayingFromManualQueue = $newState)
)

shuffleState.subscribe(($newShuffleState) => {
  $isShuffleOn = $newShuffleState
})

loopStateStore.subscribe(($newLoopState) => {
  $loopState = $newLoopState
})

manualQueueStore.subscribe(($newManuellQueue) => {
  $manualQueue = $newManuellQueue
})

// Events
window.api.on("syncedMusic", handleSyncUpdate)
audioPlayer.audio.addEventListener("ended", handleClickedNext)

initialiseMediaKeysHandler({
  handleNextTrack: handleClickedNext,
  handlePause: pausePlayback,
  handlePreviousTrack: handleClickedPrevious,
  handlePlay: resumePlayback,
})

// Functions

export function handleClickedNext() {
  // TODO Make this nicer, but how

  // If the current track is set to loop, loop it
  if ($loopState === "LOOP_TRACK") {
    durationStore.set(0)

    if ($playState === "playing") {
      startPlayingCurrentTrack()
    }

    return
  }

  // If the manuell queue played, remove the played song
  if ($isPlayingFromManualQueue) {
    manualQueueStore.removeFirst()
  }

  $manualQueue.length > 0
    ? isPlayingFromManualQueue.set(true)
    : isPlayingFromManualQueue.set(false)

  // If there are tracks in the manualQueueStore
  if ($isPlayingFromManualQueue) {
    const source = $manualQueue[0].filepath
    if ($playState === "playing") audioPlayer.play(source)

    return
  }

  // If the auto queue reached the end
  if (
    $isPlayingFromManualQueue === false &&
    $currentIndex === $autoQueue.length - 1
  ) {
    // Loop the playback if set

    if ($loopState === "LOOP_QUEUE") {
      indexStore.reset()

      if ($playState === "playing") {
        startPlayingCurrentTrack()
      }
      // Start a new playback state
    } else if ($playState === "playing") {
      playRandomTracksPlayback()
    } else {
      goToRandomTracksPlayback()
    }

    return
  }

  // If no manual queue is set, no looping etc. just play the next track in the auto queue.
  if ($playState === "playing") playNext()
  else goToNextTrack()
}

export function handleClickedPrevious() {
  playPrevious()
}

/**
 * Pauses the audio if it is playing without changing the UI state.
 */
export function handleSeekingStart() {
  if ($playState === "playing") {
    audioPlayer.pauseWithoutFadeOut()
  }
}

/**
 * Used with {@link handleSeekingStart}.
 */
export function handleSeekingEnd() {
  if ($playState === "playing") {
    audioPlayer.resume()
  }
}

/**
 * If the player is playing pause, otherwise resume playback.
 */
export function togglePause() {
  if ($playState === "playing") {
    pausePlayback()
  } else {
    resumePlayback()
  }
}

export async function toggleShuffle() {
  playbackStore.update(({ isShuffleOn, ...rest }) => ({
    ...rest,
    isShuffleOn: !isShuffleOn,
  }))

  // Set the new queue
  pipe(
    await getTracksFromSource({
      ...$playback,
      isShuffleOn: $isShuffleOn,
    }),
    E.foldW(
      notifiyError("Failed to set shuffle. Could not retrieve tracks."),

      async (tracks) => {
        const trackID = $currentTrack?.id

        const indexAndTracks: { index: number; tracks: readonly ITrack[] } =
          match($isShuffleOn)
            .with(true, () => {
              const indexToMove = trackID
                ? tracks.findIndex((track) => track.id === trackID)
                : 0

              return {
                index: 0,
                tracks: moveElementFromToIndex(
                  indexToMove,
                  0,
                  tracks
                ) as ITrack[],
              }
            })
            .with(false, () => ({
              index: tracks.findIndex(
                (track) => track.id === trackID
              ) as number,
              tracks,
            }))
            .exhaustive()

        setNewPlayback({
          ...indexAndTracks,
          playback: { ...$playback, isShuffleOn: $isShuffleOn },
        })
      }
    )
  )
}

export function setVolume(newVolume: number) {
  // For some reason the range input started returning a string onChange.
  volumeStore.set(Number(newVolume))
}

export function seekTo(percentage: number) {
  const newCurrentTime = ($currentTrack?.duration ?? 0) * percentage
  audioPlayer.audio.currentTime = newCurrentTime

  currentTimeStore.set(newCurrentTime)
}

export function resumePlayback() {
  playStateStore.set("playing")

  audioPlayer.resume()
}

function playPrevious() {
  // Manually added tracks get removed after play, so there are no previous ones
  if ($isPlayingFromManualQueue) {
    isPlayingFromManualQueue.set(false)
  } else {
    indexStore.update((index) => {
      if (index <= 0) return $autoQueue.length - 1
      return index - 1
    })
  }
  if ($currentTrack === undefined) {
    throw new Error("No current track is defined after playing previous")
  }

  audioPlayer.play($currentTrack.filepath)
}

export function pausePlayback() {
  playStateStore.set("paused")
  audioPlayer.pause()
}

/**
 * Play a track from the queue and update the index according to the track index in the queue.
 */
export function playFromAutoQueue(index: number): void {
  isPlayingFromManualQueue.set(false)
  indexStore.set(index)

  startPlayingCurrentTrack()
}

export function removeIndexFromQueue(index: number): void {
  autoQueueStore.removeIndex(index)

  // Ensure that the current track stays the same
  if (index < $currentIndex) {
    indexStore.decrement()
  }

  // If the current track was removed while it was being played, play the next (the new current) one
  if ($currentIndex === index && $playState === "playing") {
    startPlayingCurrentTrack()
  }
}

/**
 * Play a track and set the queue to all tracks shuffled.
 * @param trackToPlay The track to be played.
 */
export async function playTrackAsShuffledTracks(trackToPlay: ITrack) {
  // Immediately start playing the provided track without waiting for the rest of the tracks from the source
  indexStore.reset()
  autoQueueStore.setTracks([trackToPlay])

  startPlayingCurrentTrack()

  // Now fill the queue
  pipe(
    await getTracksFromSource({
      source: "allTracks",
      sortBy: ["title", "ascending"],
      isShuffleOn: true,
    }),
    E.foldW(
      notifiyError("Could not get tracks from the database"),

      (tracks) => {
        const tracksToAdd = [
          trackToPlay,
          ...tracks.filter((track) => track.id !== trackToPlay.id),
        ]

        setNewPlayback({
          index: 0,
          tracks: tracksToAdd,
          playback: {
            source: "allTracks",
            sortBy: ["title", "ascending"],
            isShuffleOn: true,
          },
        })
      }
    )
  )
}

export function toggleMute() {
  if ($volume === 0) {
    if (volumeBeforeMute) {
      volumeStore.set(volumeBeforeMute)
      volumeBeforeMute = undefined
    } else {
      volumeStore.set(1)
    }
  } else {
    volumeBeforeMute = $volume
    volumeStore.set(0)
  }
}

/**
 * Starts playback and initializes a new queue
 */
export async function playNewSource(newPlayback: INewPlayback, index = 0) {
  isPlayingFromManualQueue.set(false)

  // If the source stayed the same then just go to the specified index of the queue
  if (dequal($playback, newPlayback)) {
    playFromAutoQueue(index)
    return
  }

  const newPlaybackToSet = { ...newPlayback, isShuffleOn: $isShuffleOn }

  pipe(
    await getTracksFromSource(newPlaybackToSet),

    E.foldW(
      notifiyError("Error while trying to play selected music"),

      (tracks) => {
        if (tracks.length === 0) {
          notifiyError("No tracks to play back")("")

          return
        }

        setNewPlayback({
          tracks,
          index,
          playback: newPlaybackToSet,
        })

        startPlayingCurrentTrack()
      }
    )
  )
}

async function playRandomTracksPlayback() {
  await goToRandomTracksPlayback()

  startPlayingCurrentTrack()
}

/**
 * Sets a new playback with random tracks, but does not start playing.
 */
async function goToRandomTracksPlayback() {
  const playback: IPlayback = {
    source: "allTracks",
    sortBy: ["title", "ascending"],
    isShuffleOn: true,
  }

  pipe(
    await getTracksFromSource(playback),

    E.foldW(
      notifiyError("Error while trying to play selected music"),

      (tracks) => {
        setNewPlayback({
          tracks,
          index: 0,
          playback,
        })
      }
    )
  )
}

/**
 * Sets a new playback. Does not pause or play.
 * Just updates the stores.
 */
function setNewPlayback({
  index,
  tracks,
  playback,
}: {
  index: number
  tracks: readonly ITrack[]
  playback: IPlayback
}): void {
  autoQueueStore.setTracks(tracks)
  playbackStore.set(playback)
  indexStore.set(index)
}

function playNext() {
  // Update index
  indexStore.increment()

  startPlayingCurrentTrack()
}

function goToNextTrack() {
  indexStore.increment()

  if ($currentTrack === undefined) {
    throw new Error("Current track is undefined afer going to the next track")
  }
}

function handlePlayStateUpdate(newState: IPlayState) {
  $playState = newState

  navigator.mediaSession.playbackState = newState

  match($playState)
    .with("playing", () => {
      durationStore.set($currentTrack?.duration || 0)
      startProgressingSeekbar()
    })
    .with("none", () => {
      endProgressingSeekbar()
      audioPlayer.pause()
      currentTimeStore.set(0)
    })
    .with("paused", endProgressingSeekbar)
    .exhaustive()
}

// TODO make this use a much slower interval as currently it takes a lot of ressources
function startProgressingSeekbar() {
  progressSeekbar()

  seekbarProgressIntervalID = setInterval(progressSeekbar, 400)
}
async function progressSeekbar() {
  const newTime = audioPlayer.getCurrentTime()

  currentTimeStore.set(newTime)
}

function endProgressingSeekbar() {
  clearInterval(seekbarProgressIntervalID)
}

function startPlayingCurrentTrack() {
  if ($currentTrack === undefined) {
    throw new Error("Current track is undefined and cannot be played")
  }

  playStateStore.set("playing")
  audioPlayer.play($currentTrack.filepath)
}

async function initialiseStores() {
  indexStore.reset() // Just set it to 0

  pipe(
    await window.api.getTracks(),

    E.foldW(
      notifiyError("Failed to get tracks"),

      (newTracks) => {
        if (newTracks.length === 0) return

        tracksStore.set(newTracks)
        autoQueueStore.setTracks(newTracks)
      }
    )
  )

  pipe(
    await window.api.getAlbums(),

    E.foldW(
      notifiyError("Failed to get albums"),

      albumsStore.set
    )
  )

  pipe(
    await window.api.getArtists(),

    E.foldW(
      notifiyError("Failed to get artists"),

      artistsStore.set
    )
  )
}

async function handleSyncUpdate(
  _event: IpcRendererEvent,
  syncResult: ISyncResult
) {
  pipe(
    syncResult,
    E.foldW(
      notifiyError("Failed to update the library. Please restart the app"),

      ({ tracks, albums, artists }) => {
        const sortedTracks = [...tracks].sort(sortAlphabetically)

        if (tracks.length === 0) {
          console.warn("Received tracks at tracksStore -> data is not valid:", {
            tracks,
            albums,
            artists,
          })
        }

        // Update the stores
        tracksStore.set(sortedTracks)
        albumsStore.set(albums)
        artistsStore.set(artists)

        const newIndex = autoQueueStore.intersectCurrentWithNewTracks(
          sortedTracks,
          get(indexStore)
        )

        indexStore.set(newIndex)
      }
    )
  )
}

function resetCurrentTime() {
  currentTimeStore.set(0)
}

// Export some stores as read-only to prevent bugs
export const playIndex = { subscribe: indexStore.subscribe }
export const playState = { subscribe: playStateStore.subscribe }
export const volume = { subscribe: volumeStore.subscribe }
export const currentTime = { subscribe: currentTimeStore.subscribe }
export const tracks = { subscribe: tracksStore.subscribe }
export const albums = { subscribe: albumsStore.subscribe }
export const artists = { subscribe: artistsStore.subscribe }
export const queue = { subscribe: autoQueueStore.subscribe }
export const playedTracks = derived(
  [autoQueueStore, indexStore, isPlayingFromManualQueue],
  // Display only the last 20 played tracks or less if there are no more
  // And if a track from the manualQueue is playing, also display the track at the current index of the autoQueue, as it is not the current track, but the previous to the manualQueue track.
  ([$queue, $index, $newIsPlayingFromManualQueue]) =>
    $queue.slice(
      $index - 20 > 0 ? $index - 20 : 0,
      $newIsPlayingFromManualQueue ? $index + 1 : $index
    )
)
export const nextTracks = derived(
  [autoQueueStore, indexStore],
  ([$queue, $index]) => $queue.slice($index + 1)
)
/**
 * The manual queue for the UI to display.
 * Not to be used for anything else.
 */
export const manualQueue = derived(
  [manualQueueStore, isPlayingFromManualQueue],
  ([$newManualQueue, $newIsPlayingFromManualQueue]) =>
    // If the current track is from the manual queue, it woukd still show up in "manually added" section. So lets remove it from the queue for display purposes.
    $newIsPlayingFromManualQueue ? $newManualQueue.slice(1) : $newManualQueue
)

export {
  setNextLoopState,
  loopStateStore as loopState,
} from "./stores/LoopStateStore"
