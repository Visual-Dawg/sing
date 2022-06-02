<script lang="ts">
  import { TEST_IDS as test } from "@/Consts"
  import { secondsToDuration } from "@/Helper"
  import { createEventDispatcher } from "svelte"

  export let currentTime: number | undefined | null
  export let duration: number | undefined | null
  $: progress = ((currentTime ?? 0) / (duration ?? 0)) * 100

  const dispatcher = createEventDispatcher()

  let seekbar: HTMLElement

  function handleSeekClick(event: MouseEvent) {
    const percentage = getSeekPercentage(event)

    dispatcher("seek", percentage)
  }

  function getSeekPercentage({ clientX }: MouseEvent) {
    const { left, width } = seekbar.getBoundingClientRect()
    const normClientX = clientX - left
    const percentage = normClientX / width

    return percentage
  }
</script>

<main
  class="
  contain_ group -mt-1.5 cursor-pointer py-3"
  on:click={handleSeekClick}
  bind:this={seekbar}
>
  <div
    data-testid={test.seekbar}
    class="contain_ relative -mt-2 h-[2px] rounded-full bg-orange-800"
  >
    <div
      data-testid={test.seekbarProgressbar}
      style="width: {progress}%"
      class="
        pointer-events-none relative h-full rounded-full bg-amber-500
        transition-[width] duration-[102ms] ease-linear
        "
    >
      <div
        data-testid={test.seekbarProgressbarKnob}
        class="
          shadow_small blurred
          pointer-events-auto absolute -top-[6px] -right-2 h-3 w-3 rounded-full bg-amber-500  opacity-0 backdrop-blur-3xl delay-100 duration-[150ms]  group-hover:opacity-100
        "
      >
        <div
          data-testid={test.seekbarCurrentTime}
          class="
             pointer-events-none absolute right-0 -bottom-1   -translate-x-6 rounded-md bg-grey-700/50
            px-2 text-sm text-grey-100 backdrop-blur-sm 
          "
        >
          {secondsToDuration(currentTime)}
        </div>
      </div>
    </div>
    <div
      data-testid={test.seekbarTotalDuration}
      class="
       blurred  pointer-events-none absolute -bottom-2 right-0 translate-x-[calc(100%+12px)]  rounded-md bg-grey-700/50 px-2 text-sm text-grey-100 opacity-0 backdrop-blur-3xl delay-150 duration-[120ms] group-hover:opacity-100
      "
    >
      {secondsToDuration(duration)}
    </div>
  </div>
</main>

<style>
  .blurred {
    -webkit-backdrop-filter: blur(25px);
    backdrop-filter: blur(25px);
  }

  .shadow_small {
    box-shadow: 0px 0px 12px black;
  }

  .contain_ {
    contain: layout size style;
  }
</style>