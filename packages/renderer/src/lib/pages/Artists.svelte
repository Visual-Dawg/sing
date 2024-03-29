<script lang="ts">
  import { useNavigate } from "svelte-navigator"
  import { isPresent } from "ts-is-present"
  import { pipe } from "fp-ts/lib/function"
  import * as O from "fp-ts/lib/Option"

  import { moveItemTo, removeDuplicates } from "@sing-shared/Pures"
  import { UNKNOWN_ARTIST } from "@sing-shared/Consts"

  import { createArtistURI } from "@/Routes"
  import { backgroundImages } from "@/lib/stores/BackgroundImages"
  import { createAddToPlaylistAndQueueMenuItems } from "@/MenuItemsHelper"
  import { artists } from "@/lib/manager/Player"
  import { TEST_ATTRIBUTES } from "@/TestConsts"
  import { PAGE_TITLES } from "@/Constants"

  import { playlistsStore } from "../stores/PlaylistsStore"
  import { playbackActions } from "../manager/Player/playbackSlice"
  import { dispatchToRedux } from "../stores/mainStore"

  import CardList from "@/lib/organisms/CardList.svelte"
  import HeroHeading from "@/lib/organisms/HeroHeading.svelte"
  import NothingHereYet from "@/lib/organisms/NothingHereYet.svelte"

  import type { ICardProperties } from "@/types/Types"

  const navigate = useNavigate()

  $: {
    backgroundImages.set(
      $artists
        .map((artist) => artist.image)
        .filter(isPresent)
        .filter(removeDuplicates)
    )
  }

  // TODO Background images include artists images
  // TODO display one artist with non-artist tagged tracks as the "Unknown artist"

  let items: ICardProperties[]
  $: {
    const allItems: ICardProperties[] = $artists.map((artist) => ({
      title: artist.name,
      image: artist.albums.find((album) => album.cover !== undefined)?.cover,
      secondaryText: "Artist",
      onClickPrimary: () => navigate(createArtistURI(artist.name)),
      onPlay: () =>
        dispatchToRedux(
          playbackActions.playNewPlayback({
            source: {
              sourceID: artist.name,
              origin: "artist",
            },
            isShuffleOn: false,
            index: 0,
          })
        ),
      contextMenuItems: createAddToPlaylistAndQueueMenuItems($playlistsStore)({
        type: "artist",
        name: artist.name,
      }),
      testAttributes: TEST_ATTRIBUTES.artistCard,
    }))

    //  If there is "Unknown artist", move it to the top.
    items = pipe(
      allItems,
      (array) => moveItemTo(array, ({ title }) => title === UNKNOWN_ARTIST, 0),
      O.getOrElse(() => allItems)
    )
  }
</script>

<HeroHeading
  title={PAGE_TITLES.artists}
  metadata={[
    {
      label: `${$artists.length} artist${$artists.length > 1 ? "s" : ""}`,
    },
  ]}
/>
{#if $artists.length === 0}
  <NothingHereYet />
{:else}
  <CardList
    {items}
    isImageCircle={true}
    testID="artistCardsGrid"
    cardTestAttributes="artistCard"
  />
{/if}
