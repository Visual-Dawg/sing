<script lang="ts">
  import IconVolume from "virtual:icons/heroicons/speaker-wave"
  import IconVolumeMuted from "virtual:icons/heroicons/speaker-x-mark"
  import { spring } from "svelte/motion"
  import { fade } from "svelte/transition"

  import { TEST_IDS as testID } from "@/TestConsts"

  export let disabled = false
  export let volume = 1
  export let toggleMute: () => void

  // FIXME Volume displays muted if paused. Fix this

  const animatedValue = spring(volume, {
    damping: 0.15,
    stiffness: 0.12,
    precision: 0.005,
  })
  $: {
    animatedValue.set(volume)
  }

  let showSlider = false

  $: isMuted = volume === 0

  // eslint-disable-next-line no-undef
  let timeout: NodeJS.Timeout

  function handleMouseLeave() {
    clearTimeout(timeout)

    timeout = setTimeout(() => (showSlider = false), 500)
  }
  function handleMouseEnter() {
    clearTimeout(timeout)

    timeout = setTimeout(() => (showSlider = true), 50)
  }
</script>

<main
  class="group relative h-6"
  on:mouseenter={handleMouseEnter}
  on:mouseleave={handleMouseLeave}
>
  <button
    data-testid={testID.playbarVolumeIcon}
    {disabled}
    on:click={toggleMute}
    class="transition-transform hover:text-grey-200 active:scale-95"
  >
    {#if !isMuted}
      <IconVolume class="h-6 w-6" />
    {:else}
      <IconVolumeMuted class="h-6 w-6" />
    {/if}
  </button>

  {#if showSlider}
    <div
      class=" pointer-events-none  absolute bottom-0 -translate-x-[44px] -translate-y-[60px] -rotate-90"
      out:fade={{ duration: 220 }}
    >
      <div
        class="
          shadow_ pointer-events-auto relative z-30 flex h-6 w-28 origin-center translate-x-5
         overflow-hidden rounded-2xl border align-middle outline-grey-300
        "
      >
        <!---- Input ---->
        <input
          data-testid={testID.volumeSlider}
          type="range"
          name="volume slider"
          id="volume_slider"
          min="0"
          max="1"
          step="0.01"
          bind:value={volume}
          class="input_"
          on:change
        />
        <!---- Inner gradient ---->
        <!---- Mask ---->
        <div
          data-testid={testID.volumeSliderInner}
          class="
            pointer-events-none
            absolute inset-0  z-20  h-6 overflow-hidden bg-red-600
            "
          style="width: {$animatedValue > 0 ? $animatedValue * 100 : 0}%;"
        >
          <!---- Fill ---->
          <div
            class="absolute inset-0 h-6 min-w-[112px] bg-gradient-to-r from-amber-500 to-orange-500"
          />
        </div>
      </div>
    </div>
  {/if}
</main>

<style lang="postcss">
  input[type="range"].input_ {
    -webkit-appearance: none;
    margin: 0px;
    padding: 0px;
    width: 112px;
    height: 24px;
    background-color: red;
    cursor: pointer;

    &:focus {
      outline: none;
    }

    &::-webkit-slider-runnable-track {
      background: theme(colors.grey.500);
    }

    &::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 1px;
      height: 24px;
      background-color: red;
      opacity: 0;
    }
  }

  .shadow_ {
    box-shadow: 0px 0px 16px rgba(0, 0, 0, 0.3);
  }
</style>
