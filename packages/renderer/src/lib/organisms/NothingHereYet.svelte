<script lang="ts">
  import { Link } from "svelte-navigator"

  // TODO make this nicer and add drag and drop support to add folders / music
  import { ROUTES } from "@/Routes"
  import { TEST_IDS } from "@/TestConsts"
</script>

<Link to={`/${ROUTES.settingsLibrary}`}>
  <div
    data-testid={TEST_IDS.nothingHere}
    class="mt-8 block max-w-fit  items-center rounded-lg bg-grey-600 px-4 py-2 align-middle"
  >
    Nothing here yet. Go to the settings to add your music.
  </div>
</Link>
