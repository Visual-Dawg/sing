import type { Page } from "playwright"
import createSettingsPage from "./SettingsBasePage"
import {
  TEST_IDS as id,
  testAttr,
} from "../../packages/renderer/src/TestConsts"

export default function createLibrarySettingsPage(page: Page) {
  const folders = page.locator(id.asQuery.settingsFolders)

  return {
    ...createSettingsPage(page),
    addFolder,
    editFolder,
    getFoldersAmount,
    isDisplayed,
    removeFolder,
    saveFolders,
  }

  async function isDisplayed(): Promise<boolean> {
    return folders.isVisible()
  }

  async function addFolder(folderpath: string): Promise<void> {}

  async function editFolder(
    folderpath: string,
    folderIndex: number = 0
  ): Promise<void> {}

  async function removeFolder(folderIndex: number): Promise<void> {}

  async function getFoldersAmount(): Promise<number> {
    const selector = testAttr.asQuery.folderInput

    const amount = await page.evaluate((selector) => {
      return document.querySelectorAll(selector).length
    }, selector)

    return amount
  }

  async function saveFolders() {}
}