<script lang="ts">
  import * as E from "fp-ts/Either"
  import { useParams } from "svelte-navigator"
  import { onDestroy, onMount } from "svelte"
  import { isDefined } from "ts-is-present"

  import { displayTypeWithCount, removeDuplicates } from "@sing-shared/Pures"

  import { createDefaultTitleButtons, notifiyError } from "@/Helper"
  import { createAddToPlaylistAndQueueMenuItems } from "@/MenuItemsHelper"

  import { backgroundImages } from "../stores/BackgroundImages"
  import { playlistsStore } from "../stores/PlaylistsStore"
  import EditPlaylistModal from "../organisms/EditPlaylistModal.svelte"
  import CoverPicker from "../molecules/CoverPicker.svelte"

  import HeroHeading from "@/lib/organisms/HeroHeading.svelte"
  import TrackList from "@/lib/organisms/TrackList.svelte"

  import type {
    ICreateMenuOutOfTrack,
    IHeroButton,
    IHeroMetaDataItem,
  } from "@/types/Types"
  import type { TypedIpcRenderer } from "@sing-main/types/Types"
  import type { IPlaylistID } from "@sing-types/Opaque"
  import type {
    IPlaylistTrack,
    IPlaylistWithTracks,
  } from "@sing-types/DatabaseTypes"
  import type { IPlaySource } from "@sing-types/Types"

  export let playlistID: string

  const parameters = useParams<{ playlistID: string }>()

  let playlist: IPlaylistWithTracks | undefined
  $: {
    getPlaylist(Number(playlistID)).then(
      (newPlaylist) => (playlist = newPlaylist)
    )
  }
  let isShowingEditModal = false

  $: covers = playlist?.thumbnailCovers?.map(({ filepath }) => filepath)

  let source: IPlaySource
  $: source = { origin: "playlist", sourceID: Number(playlistID) }

  // Update the playlist when the it is changed on navigation
  onMount(
    parameters.subscribe(
      // TODO Why is it calling this twice all the time
      ({ playlistID: newPlaylistID }) => {
        if (newPlaylistID === playlistID) return

        getPlaylist(Number(newPlaylistID))
      }
    )
  )

  // Update the playlist when its content changes
  let unsubscribeFromPlaylistUpdate: () => TypedIpcRenderer
  $: {
    // When the playlist changes
    if (playlist) {
      unsubscribeFromPlaylistUpdate && unsubscribeFromPlaylistUpdate()

      unsubscribeFromPlaylistUpdate = window.api.on(
        "playlistUpdated",
        async (_, id) => {
          if (id !== playlist?.id) return

          playlist = await getPlaylist(id)
        }
      )
    }
  }

  onDestroy(
    () => unsubscribeFromPlaylistUpdate && unsubscribeFromPlaylistUpdate()
  )

  let tracks: readonly IPlaylistTrack[] | undefined = []
  $: tracks = playlist?.tracks

  $: backgroundImages.set(
    tracks
      ?.map(({ cover }) => cover)
      .filter(isDefined)
      .filter(removeDuplicates)
  )

  let metadata: IHeroMetaDataItem[]
  $: metadata = [
    {
      label: displayTypeWithCount("track", tracks?.length ?? 0),
    },
  ]

  let heroButtons: readonly IHeroButton[]
  $: heroButtons = createDefaultTitleButtons(source)

  let createContextMenuItems: ICreateMenuOutOfTrack
  $: createContextMenuItems = (item) => [
    ...createAddToPlaylistAndQueueMenuItems($playlistsStore)(item),
    { type: "spacer" },
    {
      type: "item",
      label: "Remove from playlist",
      onClick: () => {
        window.api.removeTracksFromPlaylist({
          id: playlist?.id as IPlaylistID,
          trackIDs: Array.isArray(item.id) ? item.id : [item.id],
        })
      },
    },
  ]

  let pickImage: () => Promise<void>

  function getPlaylist(id: number) {
    return window.api.getPlaylist({ where: { id } }).then(
      E.fold(
        (error) => {
          notifiyError("Failed to get playlist")(error)
          return undefined
        },
        (newPlaylist) => newPlaylist
      )
    )
  }

  async function toggleModal() {
    isShowingEditModal = !isShowingEditModal
  }
</script>

<!---------->
<!-- HTML -->
<!---------->

{#if playlist}
  <HeroHeading
    title={playlist.name}
    {metadata}
    image={covers}
    type="Playlist"
    buttons={heroButtons}
    description={playlist.description}
    handleClickTitle={toggleModal}
    handleClickDescription={toggleModal}
    ><CoverPicker
      slot="cover"
      image={covers}
      handleOnClick={async () => {
        await toggleModal()
        await pickImage()
      }}
    />
  </HeroHeading>

  {#if tracks && tracks?.length > 0}
    <TrackList {tracks} {source} {createContextMenuItems} />
  {:else}
    No tracks
  {/if}
{/if}

{#if playlist}
  <div class:hidden={!isShowingEditModal}>
    <EditPlaylistModal {playlist} on:hide={toggleModal} bind:pickImage />
  </div>
{/if}
