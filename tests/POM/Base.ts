import type { Page } from "playwright"
import {
  TEST_IDS as id,
  testAttr as testAttr,
} from "../../packages/renderer/src/TestConsts"
import { convertDisplayTimeToSeconds, isImageElement } from "../Helper"

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
  const playBarVolumeIcon = page.locator(id.asQuery.playbarVolumeIcon)
  const previousTrack = page.locator(id.asQuery.queuePreviousTrack)
  const previousTracks = page.locator(id.asQuery.queuePlayedTracks)
  const progressbar = page.locator(id.asQuery.seekbarProgressbar)
  const progressBarKnob = page.locator(id.asQuery.seekbarProgressbarKnob)
  const queueBar = page.locator(id.asQuery.queueBar)
  const seekbar = page.locator(id.asQuery.seekbar)
  const totalDuration = page.locator(id.asQuery.seekbarTotalDuration)
  const volumeSlider = page.locator(id.asQuery.volumeSlider)
  const testAudioElement = page.locator(id.asQuery.testAudioELement)
  const volumeSliderInner = page.locator(id.asQuery.volumeSliderInner)

  return {
    clickPlay,
    clickSeekbar,
    createErrorListener,
    dragKnob,
    getCoverPath,
    getCurrentTime,
    getCurrentTrack,
    getNextTrack,
    getNextTracks,
    getPreviousTrack,
    getPreviousTracks,
    getProgressBarWidth,
    getTotalDuration,
    getVolume,
    getVolumeState,
    goToNextTrack,
    hoverSeekbar,
    hoverVolumeIcon,
    isPlaying: isPlayingAudio,
    isRenderingPlaybarCover,
    openQueue,
    playNextTrackFromQueue,
    goToPreviousTrack,
    reload,
    setVolume,
    waitForProgressBarToGrow,
    waitForTrackToChangeTo,
  }

  async function reload() {
    page.evaluate(() => window.location.reload())
  }

  async function isPlayingAudio(): Promise<boolean> {
    const isPlaying = await testAudioElement.evaluate((e) => {
      if (!isMediaElement(e))
        throw new Error("Element is not a media element, but " + e.nodeName)

      return !(e.paused || e.ended)

      function isMediaElement(
        e: HTMLElement | SVGElement
      ): e is HTMLMediaElement {
        if (e.nodeName === "AUDIO") return true
        if (e.nodeName === "VIDEO") return true

        return false
      }
    })

    return isPlaying
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
      if (!isImageElement(element)) return false

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

  async function goToPreviousTrack() {
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

  async function hoverVolumeIcon() {
    await playBarVolumeIcon.hover({ timeout: 2500, force: true })
  }

  async function getVolumeState(): Promise<number> {
    const volume = await testAudioElement.evaluate((e) => {
      const x = e as unknown as HTMLAudioElement

      return x.volume
    })

    return volume
  }

  async function getVolume(): Promise<number> {
    await hoverVolumeIcon()

    const heightTotal = (await volumeSlider.boundingBox())?.height
    const sliderHeight = (await volumeSliderInner.boundingBox())?.height

    if (heightTotal === undefined || sliderHeight === undefined) return 0

    return sliderHeight / heightTotal
  }

  async function setVolume(volume: number): Promise<void> {
    await hoverVolumeIcon()

    const { height, width } = (await volumeSlider.boundingBox({
      timeout: 2000,
    })) || { height: undefined, width: undefined }

    if (height === undefined) {
      throw new Error("height of volume slider is undefined")
    }
    if (width === undefined) {
      throw new Error("width of volume slider is undefined")
    }

    const heightToReach = height * volume
    const x = width || 12 * 0.5

    await volumeSlider.click({
      position: {
        y: heightToReach,
        x, // Do not click on the border
      },
      timeout: 2000,
    })

    await validateAndWaitForAnimation()

    async function validateAndWaitForAnimation(
      height: number | undefined = undefined,
      previousHeight: number | undefined = undefined
    ) {
      const newElementHeight = (await volumeSliderInner.boundingBox())?.height
      if (newElementHeight === undefined)
        throw new Error("height of volume gradient is undefined")

      if (newElementHeight !== previousHeight) {
        await page.waitForTimeout(10)
        await validateAndWaitForAnimation(newElementHeight, height)
      } else {
        return newElementHeight === heightToReach
      }
    }
  }
}
