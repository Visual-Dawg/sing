import type { Page, Locator, ConsoleMessage } from "playwright"
import {
  TEST_IDS as id,
  TEST_ATTRIBUTE as testAttr,
} from "../../packages/renderer/src/Consts"
import { convertDisplayTimeToSeconds, isImage } from "../Helper"

export default function createBasePage(page: Page) {
  const currentTime = page.locator(id.asQuery.seekbarCurrentTime)
  const currentTrack = page.locator(id.asQuery.playbarTitle)
  const nextQueueTrack = page.locator(id.asQuery.queueNextTrack)
  const nextTrack = page.locator(id.asQuery.queueNextTrack)
  const nextTracks = page.locator(id.asQuery.queueBarNextTracks)
  const playbarBackButton = page.locator(id.asQuery.playbarBackButton)
  const playbarCover = page.locator(id.asQuery.playbarCover)
  const playbarNextButton = page.locator(id.asQuery.playbarNextButton)
  const playbarPlayButton = page.locator(id.asQuery.playbarPlayButton)
  const playbarQueueIcon = page.locator(id.asQuery.playbarQueueIcon)
  const previousTrack = page.locator(id.asQuery.queuePreviousTrack)
  const previousTracks = page.locator(id.asQuery.queuePlayedTracks)
  const progressbar = page.locator(id.asQuery.seekbarProgressbar)
  const progressBarKnob = page.locator(id.asQuery.seekbarProgressbarKnob)
  const queueBar = page.locator(id.asQuery.queueBar)
  const seekbar = page.locator(id.asQuery.seekbar)
  const totalDuration = page.locator(id.asQuery.seekbarTotalDuration)

  return {
    clickPlay,
    dragKnob,
    clickSeekbar,
    createErrorListener,
    getCoverPath,
    getCurrentTime,
    getNextTracks,
    getPreviousTracks,
    getProgressBarWidth,
    getTotalDuration,
    goToNextTrack,
    hoverSeekbar,
    isRenderingPlaybarCover,
    openQueue,
    playNextTrackFromQueue,
    playPrevious,
    reload,
    waitForProgressBarToGrow,
    waitForTrackToChange: waitForTrackToChangeTo,
    getNextTrack,
    getPreviousTrack,
    getCurrentTrack,
  }

  async function reload() {
    page.evaluate(() => window.location.reload())
  }

  async function waitForProgressBarToGrow(desiredWidth: number) {
    const selector = id.asQuery.seekbarProgressbar

    await page.waitForFunction(
      ({ selector, desiredWidth }) => {
        const progressBar = document.querySelector(selector)
        const width = progressBar?.getBoundingClientRect().width || 0

        if (width > desiredWidth) return true
        return false
      },
      { selector, desiredWidth }
    )
  }

  async function getCoverPath() {
    return playbarCover.evaluate((element: HTMLElement) =>
      element.getAttribute("src")
    )
  }

  async function isRenderingPlaybarCover() {
    return playbarCover.evaluate((element: HTMLElement) => {
      if (!isImage(element)) return false

      return !!element.naturalWidth
    })
  }

  async function createErrorListener() {
    const errors: Error[] = []

    const listener = (exception: Error) => {
      errors.push(exception)
      console.log(`Uncaught exception: "${exception}"`)
    }
    page.on("pageerror", listener)

    return {
      getErrors: () => errors,
      stopListeners: () => page.removeListener("pageerror", listener),
    }
  }

  async function clickPlay() {
    return playbarPlayButton.click({ timeout: 2000 })
  }

  async function goToNextTrack() {
    return playbarNextButton.click({ timeout: 2000 })
  }

  async function playPrevious() {
    return playbarBackButton.click({ timeout: 2000 })
  }

  async function playNextTrackFromQueue() {
    await nextQueueTrack.dblclick({ timeout: 2000 })
  }
  async function openQueue() {
    await playbarQueueIcon.click({ timeout: 1500 })
    await queueBar.isVisible()
  }

  async function getNextTracks() {
    return nextTracks
  }

  async function getPreviousTracks() {
    return previousTracks
  }

  async function getProgressBarWidth() {
    return (await progressbar.boundingBox({ timeout: 3000 }))?.width
  }

  async function getNextTrack(): Promise<String | undefined> {
    const element = await nextTrack.elementHandle()
    const titleElement = await element?.$(testAttr.asQuery.queueItemTitle)
    return titleElement?.innerText()
  }
  async function getPreviousTrack(): Promise<String | undefined> {
    const element = await previousTrack.elementHandle()
    const titleElement = await element?.$(testAttr.asQuery.queueItemTitle)
    return titleElement?.innerText()
  }
  async function getCurrentTrack(): Promise<String | undefined> {
    const element = await currentTrack.elementHandle()
    return element?.innerText()
  }

  async function waitForTrackToChangeTo(
    waitFor: "Next track" | "Previous track"
  ): Promise<void>
  async function waitForTrackToChangeTo(waitFor: string): Promise<void> {
    if (waitFor === "Next track" || waitFor === "Previous track") {
      const nextTitle =
        waitFor === "Next track"
          ? await getNextTrack()
          : await getPreviousTrack()
      if (!nextTitle) return undefined

      return waitTitleToBecomeThat(nextTitle)
    } else {
      return waitTitleToBecomeThat(waitFor)
    }

    async function waitTitleToBecomeThat(that: String) {
      const selector = id.asQuery.playbarTitle

      await page.waitForFunction(
        ({ that, selector }) => {
          const currentTitle = document.querySelector(selector)?.textContent

          return currentTitle === that
        },
        { that, selector }
      )
    }
  }

  async function clickSeekbar(percentage: number) {
    const x =
      ((await seekbar.boundingBox({ timeout: 1000 }))?.width ?? 0) *
      (percentage / 100)

    await seekbar.click({
      position: {
        x,
        y: 0,
      },
      timeout: 1000,
      force: true,
    })
  }

  async function dragKnob(amount: number) {
    await progressBarKnob.dragTo(seekbar, {
      targetPosition: { x: amount, y: 0 },
    })
  }

  async function getCurrentTime(): Promise<number> {
    await hoverSeekbar()
    const time = convertDisplayTimeToSeconds(
      await currentTime.innerText({ timeout: 3000 })
    )

    return time
  }

  async function getTotalDuration() {
    await hoverSeekbar()
    const time = convertDisplayTimeToSeconds(await totalDuration.innerText())

    return time
  }

  async function hoverSeekbar() {
    await seekbar.hover({ timeout: 2000 })
  }
}
