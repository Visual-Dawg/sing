<script lang="ts">
  import { TEST_ATTRIBUTES } from "@/TestConsts"

  import type { IMenuItemArgument } from "@/types/Types"

  export let data: IMenuItemArgument
</script>

<button
  on:click|stopPropagation={data.onClick}
  data-testattribute={TEST_ATTRIBUTES.menuItem}
  on:click
>
  <div
    class="
      flex h-10 cursor-pointer items-center justify-start gap-3 px-4 text-left align-middle hover:bg-grey-700
      active:bg-grey-800
      "
  >
    {#if data.leadingIcon}
      <svelte:component
        this={data.leadingIcon}
        class="-ml-1 h-6 w-6 shrink-0 grow-0 cursor-pointer  text-grey-300"
      />
    {/if}
    <div class="grow text-sm tracking-wide">
      {data.label}
    </div>
    {#if data.trailingIcon}
      <svelte:component
        this={data.trailingIcon}
        class="h-6 w-6 shrink-0 grow-0 cursor-pointer text-grey-300"
      />
    {/if}
  </div>
</button>
