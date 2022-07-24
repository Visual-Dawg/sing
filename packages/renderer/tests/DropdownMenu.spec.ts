import Menu from "@/lib/molecules/DropdownMenu.svelte"
import { TEST_IDS as id, testAttributes } from "@/TestConsts"
import { fireEvent, render } from "@testing-library/svelte"
import { expect, it } from "vitest"

import MenuItems from "./helpers/MenuItemsTestComponent.svelte"

import type { SvelteComponentDev } from "svelte/internal"

let SlotWrapper: typeof SvelteComponentDev

beforeEach(async () => {
  SlotWrapper = (await import(
    "./helpers/SlotTest.svelte"
  )) as unknown as typeof SvelteComponentDev
})

afterEach(async () => {
  vi.resetModules()
})

it("displays the menu when clicking the icon", async () => {
  const dom = render(SlotWrapper, {
    componentToTest: Menu,
    slottedComponent: MenuItems,
  })

  const icon = dom.getByTestId(id.testIcon)

  await fireEvent.click(icon)

  const menu = dom.getByTestId(id.test)

  expect(menu).toBeTruthy()
})

it("displays the menu items when clicking the icon", async () => {
  const dom = render(SlotWrapper, {
    componentToTest: Menu,
    slottedComponent: MenuItems,
  })

  const icon = dom.getByTestId(id.testIcon)

  await fireEvent.click(icon)

  const menu = dom.getByTestId(id.test)
  const elements = menu.querySelectorAll(testAttributes.asQuery.menuItem)

  expect(elements.length).toBe(3)
})
