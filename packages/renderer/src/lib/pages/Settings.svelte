<script lang="ts">
  import { onMount } from "svelte"

  import { TEST_IDS } from "@/TestConsts"
  import { backgroundImages } from "@/lib/stores/BackgroundImages"

  import Button from "@/lib/atoms/Button.svelte"
  import FoldersPicker from "@/lib/organisms/FoldersPicker.svelte"

  import type { DirectoryPath } from "@sing-types/Filesystem"

  let paths: DirectoryPath[]

  $: isButtonDisabled = paths !== undefined && paths.length === 0

  onMount(
    async () =>
      (paths = (await window.api.getUserSetting("musicFolders")) || [])
  )

  // Remove background images from the previous page
  backgroundImages.set(undefined)
</script>

<main class="h-max w-full p-6 pb-24">
  <div
    class="mx-auto mt-20 flex h-full max-w-[640px] flex-col items-center justify-center"
  >
    <div class="min-h-[18rem] w-full max-w-xl">
      <h1 class="mb-2 text-2xl">Add folders</h1>
      <p class="mb-6 text-grey-100">
        Choose which folders you want to sync with your library
      </p>

      <FoldersPicker bind:paths />

      <Button
        label="Save and sync"
        testid={TEST_IDS.settingsFoldersSaveButton}
        classes="w-full mt-8"
        on:click={async () => {
          if (paths === undefined || paths.length === 0) {
            console.error("No paths to sync specified, they are", paths)
            return
          }
          await window.api.setUserSettings({
            setting: "musicFolders",
            value: paths,
          })

          await window.api.sync()
        }}
        disabled={isButtonDisabled}
      />
    </div>
  </div>
</main>
