import { doOrNotifyEither, sortAlphabetically } from "@/Helper"
import audioPlayer from "@/lib/manager/player/AudioPlayer"
import { dequal } from "dequal"
import { map as mapEither } from "fp-ts/lib/Either"
import { derived, get, writable } from "svelte/store"
import { match } from "ts-pattern"

import indexStore from "./stores/PlayIndex"
import queueStore from "./stores/QueueStore"

import type { Either } from "fp-ts/lib/Either"
import type { IPlayLoop, IPlayState, IQueueItem } from "@/types/Types"
import type {
  ITrack,
  ISyncResult,
  IAlbum,
  IArtist,
  IError,
  IPlayblackToSend,
  IPlayback,
  INewPlayback,
  ISortOptions,
} from "@sing-types/Types"
import type { IpcRendererEvent } from "electron"
// TODO Add genre to the db, too

// Create stores / state
const playStateStore = writable<IPlayState>("STOPPED")
const volumeStore = writable(1)
const currentTimeStore = writable(0)
const durationStore = writable(0)
const tracksStore = writable<readonly ITrack[]>([])
const albumsStore = writable<readonly IAlbum[]>([])
const artistsStore = writable<readonly IArtist[]>([])
const playbackStore = writable<IPlayback>({
  source: "tracks",
  sortBy: ["title", "ascending"],
})
const isShuffleOnStore = writable(false)
const playLoopStore = writable<IPlayLoop>("NONE")

// Initialise stores with the music from the database
await initialiseStores()

// Now it makes sense to create and use the derived stores, as the base stores are initialised
export const currentTrack = derived(
  [queueStore, indexStore],
  ([$queue, $index]) => $queue[$index]
)
export const playedTracks = derived(
  [queueStore, indexStore],
  ([$queue, $index]) => $queue.slice($index - 20 > 0 ? $index - 20 : 0, $index) // Display only the last 20 played tracks or less if there are no more
)
export const nextTracks = derived(
  [queueStore, indexStore],
  ([$queue, $index]) => $queue.slice($index + 1)
)

// Bind the values of the stores localy.
let $playState: IPlayState = "STOPPED"
let $queue: IQueueItem[] = []
let $currentIndex = -1
let $currentTrack: IQueueItem
let seekAnimationID: number
let $isShuffleOn: boolean
let $playLoop: IPlayLoop

// How to do "set shuffle" and then "unset shuffle" ?

/**
 * Stores the state before the user hit `shuffle`, so that when the user disables shuffling again, it can revert back to normal.
 */
// let beforeShuffle: { sort: ISortOptions["tracks"]; index: number } | undefined

queueStore.subscribe(($newQueue) => {
  $queue = $newQueue
})

indexStore.subscribe(($newIndex) => {
  $currentIndex = $newIndex
  resetCurrentTime()
})

playStateStore.subscribe(handlePlayStateUpdate)

currentTrack.subscribe(($newCurrentTrack) => {
  $currentTrack = $newCurrentTrack
})

isShuffleOnStore.subscribe(($newPlayMode) => {
  $isShuffleOn = $newPlayMode
})

playLoopStore.subscribe(($newPlayLoop) => {
  $playLoop = $newPlayLoop
})

// Events
window.api.listen("syncedMusic", handleSyncUpdate)
audioPlayer.audio.addEventListener("ended", handlePlayNext)
audioPlayer.audio.addEventListener("volumechange", onVolumeChange)

export function handlePlayNext() {
  // I want to find a way to make this nicer

  // If the current track is set to loop, loop it
  if ($playLoop === "LOOP_TRACK") {
    durationStore.set(0)

    if ($playState === "PLAYING") {
      startPlayingTrack($currentTrack.track)
    }

    return
  }

  // If the queue reached its end
  if ($currentIndex === $queue.length - 1) {
    if ($playLoop === "LOOP_QUEUE") {
      indexStore.set(0)

      if ($playState === "PLAYING") {
        startPlayingTrack($currentTrack.track)
      }
    } else if ($playState === "PLAYING") {
      console.log("Play random")

      playRandomTracksPlayback()
    } else {
      goToRandomTracksPlayback()
    }
  } else {
    // If it did not reach its end and it is not looping. simply go to the next track
    console.log("Playing next")

    playNext()
  }
}

export function handleClickedPrevious() {
  playPrevious()
}

async function playRandomTracksPlayback() {
  await goToRandomTracksPlayback()

  startPlayingTrack($currentTrack.track)
}

// Maybe better as only a new Playbacksource, which would set a new queue and index anyway
async function goToRandomTracksPlayback() {
  const playback = {
    source: "tracks",
    sortBy: ["title", "ascending"],
    isShuffleOn: true,
  } as const

  const tracksEither = await getTracksFromSource(playback)

  doOrNotifyEither(
    "Error while trying to play selected music",
    (tracks) => {
      setNewPlayback({
        tracks,
        index: 0,
        playback,
      })
    },
    tracksEither
  )
}

export function setVolume(newVolume: number) {
  audioPlayer.setVolume(newVolume)
}

export function seekTo(percentage: number) {
  const newCurrentTime = ($currentTrack.track.duration || 0) * percentage
  audioPlayer.audio.currentTime = newCurrentTime

  currentTimeStore.set(newCurrentTime)
}

export function resumePlayback() {
  playStateStore.set("PLAYING")

  audioPlayer.resume()
}

function playPrevious() {
  indexStore.update((index) => {
    if (index <= 0) return $queue.length - 1
    return index - 1
  })

  if ($playState === "STOPPED" || $playState === "PAUSED")
    audioPlayer.setSource($currentTrack.track.filepath)
  else {
    audioPlayer.play($currentTrack.track.filepath)
  }
}

export function pausePlayback() {
  playStateStore.set("PAUSED")
  audioPlayer.pause()
}

export function setMuted(muted: boolean) {
  audioPlayer.setMuted(muted)
}

export function isMuted() {
  return audioPlayer.isMuted()
}

/**
 * Play a track from the queue and update the index according to the track index in the queue.
 */
export function playFromQueue(index: number): void {
  indexStore.set(index)

  startPlayingTrack($currentTrack.track)
}

export function removeIndexFromQueue(index: number): void {
  queueStore.removeIndex(index)

  if (index < $currentIndex) {
    indexStore.decrement() // So that the current track stays the same
  }

  if ($currentIndex === index && $playState === "PLAYING") {
    startPlayingTrack($currentTrack.track)
  }
}

/**
 * Starts playback and initializes a new queue
 */
export async function playNewSource(playback: INewPlayback, index = 0) {
  console.log("sourceStore:", get(playbackStore))
  console.log("new source:", playback)
  console.log(dequal(get(playbackStore), playback))

  // If the source stayed the same then just go to the specified index of the queue
  if (dequal(get(playbackStore), playback)) {
    indexStore.set(index)

    startPlayingTrack($currentTrack.track)
    return
  }

  // If the source has changed
  // For example: User played an album and then started playing an artist
  const defaultSort: ISortOptions["tracks"] = ["title", "ascending"]

  const tracksEither = await getTracksFromSource({
    sortBy: defaultSort,
    ...playback,
    isShuffleOn: $isShuffleOn,
  })

  doOrNotifyEither(
    "Error while trying to play selected music",
    (tracks) => {
      setNewPlayback({
        tracks,
        index,
        playback: { sortBy: defaultSort, ...playback },
      })

      startPlayingTrack($currentTrack.track)
    },
    tracksEither
  )
}

/**
 * Starts and sets a new playback.
 * If not sortBy is set then use the default sorting
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
  indexStore.set(index)
  queueStore.setTracks(tracks, $currentIndex)
  playbackStore.set(playback)
}

function playNext() {
  // Update index
  indexStore.increment()

  startPlayingTrack($currentTrack.track)
}

function goToNextTrack() {
  indexStore.increment()
}

function handlePlayStateUpdate(newState: IPlayState) {
  $playState = newState

  if (newState === "PLAYING") {
    durationStore.set($currentTrack.track?.duration || 0)
    startIntervalUpdateTime()
  } else {
    cancelIntervalUpdateTime()
  }
}

function onVolumeChange() {
  volumeStore.set(audioPlayer.getVolume())
}

function startIntervalUpdateTime() {
  const newTime = audioPlayer.getCurrentTime()

  currentTimeStore.set(newTime)

  seekAnimationID = requestAnimationFrame(startIntervalUpdateTime)
}

function cancelIntervalUpdateTime() {
  cancelAnimationFrame(seekAnimationID)
}

function startPlayingTrack(track: ITrack) {
  playStateStore.set("PLAYING")
  audioPlayer.play(track.filepath)
}

async function initialiseStores() {
  doOrNotifyEither(
    "Failed to get tracks",
    (newTracks) => {
      if (newTracks.length === 0) return

      tracksStore.set(newTracks)
      queueStore.setTracks(newTracks, 0)
      audioPlayer.setSource(newTracks[0].filepath)
    },
    await window.api.getTracks()
  )

  doOrNotifyEither(
    "Failed to get albums",
    albumsStore.set,
    await window.api.getAlbums()
  )

  doOrNotifyEither(
    "Failed to get artists",
    artistsStore.set,
    await window.api.getArtists()
  )

  indexStore.set(0)
}

function handleSyncUpdate(_event: IpcRendererEvent, syncResult: ISyncResult) {
  console.log("Sync update received")

  doOrNotifyEither(
    "Failed to update the library. Please restart the app",
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

      const newIndex = queueStore.removeItemsFromNewTracks(
        sortedTracks,
        get(indexStore)
      )

      indexStore.set(newIndex)
    },
    syncResult
  )
}

async function getTracksFromSource(
  playback: IPlayblackToSend
): Promise<Either<IError, readonly ITrack[]>> {
  return match(playback)
    .with({ source: "artists" }, async ({ sourceID, sortBy, isShuffleOn }) =>
      extractTracks(
        await window.api.getAlbum({
          where: { name: sourceID },
          sortBy,
          isShuffleOn,
        })
      )
    )
    .with({ source: "albums" }, async ({ sourceID, sortBy, isShuffleOn }) =>
      extractTracks(
        await window.api.getAlbum({
          where: { name: sourceID },
          sortBy,
          isShuffleOn,
        })
      )
    )
    .with({ source: "tracks" }, ({ isShuffleOn, sortBy }) =>
      window.api.getTracks({ isShuffleOn, sortBy })
    )
    .with({ source: "playlists" }, () => {
      throw new Error(
        "Error at getTracksFromSource: Playlists are not implemented yet"
      )
    })
    .exhaustive()

  function extractTracks(
    item: Either<IError, { tracks: readonly ITrack[] }>,
    fromIndex = 0
  ): Either<IError, readonly ITrack[]> {
    return mapEither(({ tracks }: { tracks: readonly ITrack[] }) =>
      tracks.slice(fromIndex)
    )(item)
  }
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
export const queue = { subscribe: queueStore.subscribe }
