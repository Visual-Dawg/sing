<script lang="ts">
  import type { SvelteComponentDev } from "svelte/internal"

  export let label: string
  export let primary = true
  export let classes: string | undefined = undefined
  export let testid: string | undefined = undefined
  export let icon: typeof SvelteComponentDev | undefined = undefined
  export let disabled = false
  export let size: "medium" | "large" = "large"

  const buttonColor = primary
    ? "bg-grey-100  text-grey-900"
    : "text-white bg-grey-600"

  const buttonSize = size === "large" ? "px-6 py-3" : "px-4 py-2"
</script>

<button
  data-testid={testid}
  on:click
  class="squishy flex min-w-[9rem]  cursor-pointer justify-center gap-3
		    rounded-lg   uppercase transition-all hover:opacity-80 active:opacity-60 disabled:cursor-default
        disabled:bg-grey-300 disabled:hover:opacity-100 {buttonSize}
        {buttonColor} {classes} "
  {disabled}
>
  {#if icon}
    <svelte:component this={icon} class="-ml-2 h-6 w-6" />
  {/if}
  {label}
</button>
