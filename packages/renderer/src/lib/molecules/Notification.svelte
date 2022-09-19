<script lang="ts">
  import IconLoading from "virtual:icons/eos-icons/loading"
  import IconCheck from "virtual:icons/heroicons-outline/check-circle"
  import IconWarn from "virtual:icons/heroicons-outline/exclamation-circle"
  import IconDanger from "virtual:icons/heroicons-outline/exclamation"
  import IconClose from "virtual:icons/heroicons-outline/x"
  import { createEventDispatcher, onMount } from "svelte"
  import { fly } from "svelte/transition"

  import type { INotificationTypes } from "@sing-types/Types"
  import { TEST_ATTRIBUTES } from "@/TestConsts"

  export let id: symbol
  export let label: string
  export let type: INotificationTypes = "default"
  export let duration: number = 7 // Timeout in seconds. Set to -1 to disable

  const usedIcon = {
    loading: IconLoading,
    check: IconCheck,
    warning: IconWarn,
    danger: IconDanger,
    default: false,
  }[type]

  const iconClass = {
    default: "",
    loading: "",
    check: "",
    warning: " text-yellow-500",
    danger: "text-red-500",
  }[type]

  const animationDuration = 290
  const durationInMS = duration * 1000
  let timeoutBar: HTMLDivElement
  let timeLeft = duration * 1000 + animationDuration * 0.5
  let previousTime: number | undefined
  let timeoutAnimationID: number

  onMount(() => {
    if (duration === -1) return

    timeoutAnimationID = requestAnimationFrame(decreaseTimer)

    return () => cancelAnimationFrame(timeoutAnimationID)
  })

  const dispatch = createEventDispatcher()

  function decreaseTimer(timestamp: number) {
    if (timeLeft <= 0) {
      cancelAnimationFrame(timeoutAnimationID)
      handleClose()
      return
    }

    if (previousTime === timestamp) return

    const elapsed = previousTime ? timestamp - previousTime : 0

    previousTime = timestamp

    timeLeft = Math.max(0, timeLeft - elapsed)

    timeoutBar.style.width = `${(timeLeft / durationInMS) * 100}%`

    timeoutAnimationID = requestAnimationFrame(decreaseTimer)
  }

  function handleClose() {
    cancelAnimationFrame(timeoutAnimationID)
    dispatch("close", id)
  }

  function pauseTimout() {
    cancelAnimationFrame(timeoutAnimationID)
    previousTime = undefined
  }
  function resumeTimeout() {
    if (duration === -1) return

    timeoutAnimationID = requestAnimationFrame(decreaseTimer)
  }
</script>

<div
  data-testattribute={TEST_ATTRIBUTES.notification}
  class="z-50 flex min-w-[224px] overflow-hidden rounded bg-grey-600/60 shadow-xl shadow-grey-900 backdrop-blur-2xl"
  on:mouseenter={pauseTimout}
  on:mouseleave={resumeTimeout}
  in:fly={{ duration: animationDuration, opacity: 0, x: 100 }}
  out:fly={{
    duration: animationDuration / 2,
    opacity: 0,
    x: 100,
  }}
>
  <div class="flex gap-3 px-6 py-4">
    {#if type != undefined}
      <svelte:component
        this={usedIcon}
        class={`${iconClass} -ml-2 h-6 w-6 shrink-0`}
      />
    {/if}
    {label}
  </div>

  {#if duration !== -1}
    <!-- Timeout bar -->
    <div
      class="absolute inset-x-0 bottom-0 h-1 rotate-180 overflow-hidden rounded"
      bind:this={timeoutBar}
    >
      <div
        class="absolute inset-x-0  bottom-0 h-1 bg-gradient-to-l from-yellow-300 to-orange-500"
      />
    </div>
  {/if}

  <button
    data-testattribute={TEST_ATTRIBUTES.notificationCloseButton}
    class="absolute top-0 right-0  p-2 opacity-70 hover:opacity-100"
    on:click={handleClose}
  >
    <IconClose class="h-4 w-4 {iconClass}" />
  </button>
</div>