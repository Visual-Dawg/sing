import { readable } from "svelte/store"
import { pipe } from "fp-ts/lib/function"
import * as E from "fp-ts/lib/Either"

import { notifiyError } from "@/Helper"

import type { IPlaylist } from "@sing-types/DatabaseTypes"

export const playlistsStore = readable<readonly IPlaylist[]>([], (set) => {
  window.api
    .getPlaylists()
    .then(
      E.getOrElse(() => {
        notifiyError("Could not retrieve updated playlists")
        return [] as readonly IPlaylist[]
      })
    )
    .then(set)

  // Return the unsubscribe function
  return window.api.on("playlistsUpdated", () => updatePlaylists(set))
})

async function updatePlaylists(
  setPlaylists: (playlists: readonly IPlaylist[]) => void
): Promise<void> {
  pipe(
    await window.api.getPlaylists(),

    E.foldW(
      notifiyError("Could not retrieved updated playlists"),

      setPlaylists
    )
  )
}
