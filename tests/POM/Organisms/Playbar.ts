/* eslint-disable unicorn/prefer-dom-node-text-content */

import { TEST_IDS } from "../../../packages/renderer/src/TestConsts"
import { convertDisplayTimeToSeconds, getTrackTitle } from "../Helper"

import type { ElectronApplication } from "playwright"

/**
 * Interact with the playbar
 */
export async function createPlaybarOrganism(electron: ElectronApplication) {
  const page = await electron.firstWindow()

  const currentTime = page.locator(TEST_IDS.asQuery.seekbarCurrentTime),
    currentTrack = page.locator(TEST_IDS.asQuery.playbarTitle),
    artistName = page.locator(TEST_IDS.asQuery.playbarArtist),
    volumeIcon = page.locator(TEST_IDS.asQuery.playbarVolumeIcon),
    backButton = page.locator(TEST_IDS.asQuery.playbarBackButton),
    cover = page.locator(TEST_IDS.asQuery.playbarCover),
    nextButton = page.locator(TEST_IDS.asQuery.playbarNextButton),
    pauseButton = page.locator(TEST_IDS.asQuery.playbarPauseButton),
    playButton = page.locator(TEST_IDS.asQuery.playbarPlayButton),
    progressbar = page.locator(TEST_IDS.asQuery.seekbarProgressbar),
    seekbar = page.locator(TEST_IDS.asQuery.seekbar),
    testAudioElement = page.locator(TEST_IDS.asQuery.testAudioELement),
    totalDuration = page.locator(TEST_IDS.asQuery.seekbarTotalDuration),
    volumeSlider = page.locator(TEST_IDS.asQuery.volumeSlider),
    volumeSliderInner = page.locator(TEST_IDS.asQuery.volumeSliderInner),
    shuffleButton = page.locator(TEST_IDS.asQuery.playbarShuffleButton)
  // , previousTracks = page.locator(TEST_IDS.asQuery.queuePlayedTracks)

  return {
    clickNext,
    clickPause,
    clickPlay,
    clickPrevious,
    clickSeekbar,
    clickShuffle,
    getCoverPath,
    getCurrentArtist,
    getCurrentProgress,
    getCurrentTrack,
    getProgressBarWidth,
    getTotalDuration,
    getVolume,
    getVolumeState,
    hoverSeekbar,
    hoverVolumeIcon,
    isRenderingPlaybarCover,
    isShuffleOn,
    seekTo,
    setVolume,
    waitForProgressBarToProgress,
  }

  async function waitForProgressBarToProgress(desiredWidth: number) {
    const selector = TEST_IDS.asQuery.seekbarProgressbar

    await page.waitForFunction(
      // eslint-disable-next-line @typescript-eslint/no-shadow
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
    return cover.evaluate((element: HTMLElement) => element.getAttribute("src"))
  }

  async function isRenderingPlaybarCover() {
    return cover.evaluate((element: HTMLElement) => {
      if (element?.tagName !== "IMG") return false

      return !!(element as HTMLImageElement)?.naturalWidth
    })
  }

  async function clickPlay() {
    return playButton.click({ timeout: 2000 })
  }

  /**
   * Go to the next track by clicking the `next` button.
   */
  async function clickNext() {
    return nextButton.click({ timeout: 2000 })
  }

  async function clickPrevious() {
    return backButton.click({ timeout: 2000 })
  }

  async function getProgressBarWidth() {
    const boundingBox = await progressbar.boundingBox({ timeout: 3000 })

    return boundingBox?.width
  }

  /**
   * Get the current track title like `01`. Returns `undefined` if there is none.
   */
  async function getCurrentTrack(): Promise<string | undefined> {
    if ((await currentTrack.count()) === 0) return undefined

    return getTrackTitle(await currentTrack.innerText({ timeout: 2000 }))
  }

  async function clickSeekbar(seekPercentage: number) {
    const boundingBox = await seekbar.boundingBox({ timeout: 1000 })

    if (!boundingBox?.height || !boundingBox?.width) {
      throw new Error(
        `Seekbar is not properly rendered.\nSeekbar: ${seekbar}\nHeight: ${boundingBox?.height}\nWidth: ${boundingBox?.width}`
      )
    }

    const x = boundingBox.width * (seekPercentage / 100)
    // Subtract 4 because it has a negative top margin of 8, and 4 works
    const y = -4

    return seekbar.click({
      position: { x, y },
      timeout: 1000,
      force: true,
    })
  }

  /**
   * Drag and drop the seekbar knop to the desired progress in percentages like `50` or `100`.
   */
  async function seekTo(progress: number) {
    if (progress > 100 || progress < 0)
      throw new TypeError(
        `Must provide a positive percentage between 0 and 100 to seek to. But provided: ${progress}`
      )

    await hoverSeekbar()

    const { width } = await seekbar.boundingBox().then((box) => {
      if (!box) throw new Error("Progress bar could not been found.")

      return { width: box.width, x: box.x, y: box.y }
    })

    await seekbar.dragTo(seekbar, {
      targetPosition: { x: width * (progress / 100), y: 0 },
      timeout: 1000,
      force: true,
    })
  }

  /**
   * Get the current progress of the track in seconds.
   */
  async function getCurrentProgress(): Promise<number> {
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
    await volumeIcon.hover({ timeout: 2500, force: true })
  }

  async function getVolumeState(): Promise<number> {
    const volume = await testAudioElement.evaluate(
      (element) => (element as HTMLMediaElement).volume
    )

    return volume
  }

  async function getVolume(): Promise<number> {
    await hoverVolumeIcon()
    const container = await volumeSlider.boundingBox()
    const slider = await volumeSliderInner.boundingBox()

    const heightTotal = container?.height
    const sliderHeight = slider?.height

    if (heightTotal === undefined || sliderHeight === undefined) return 0

    return sliderHeight / heightTotal
  }

  async function setVolume(volume: number): Promise<void> {
    await hoverVolumeIcon()

    const { height, width } = (await volumeSlider.boundingBox({
      timeout: 1000,
    })) || { height: undefined, width: undefined }

    if (height === undefined) {
      throw new Error("height of volume slider is undefined")
    }
    if (width === undefined) {
      throw new Error("width of volume slider is undefined")
    }

    const heightToReach = height * volume
    const x = width || 12 * 0.5 // Do not click on the border

    await volumeSlider.click({
      position: {
        y: heightToReach,
        x,
      },
      timeout: 2000,
      force: true,
    })

    await validateAndWaitForAnimation()

    async function validateAndWaitForAnimation(
      newHeight?: number | undefined,
      previousHeight?: number | undefined
    ): Promise<boolean> {
      const boundingBox = await volumeSliderInner.boundingBox()

      const newElementHeight = boundingBox?.height

      if (newElementHeight === undefined)
        throw new Error("height of volume gradient is undefined")

      if (newElementHeight !== previousHeight) {
        await page.waitForTimeout(10)
        return validateAndWaitForAnimation(newElementHeight, newHeight)
      }
      return newElementHeight === heightToReach
    }
  }

  /**
   * Pause the playback by clicking the pause button.
   */
  async function clickPause() {
    await pauseButton.click({ timeout: 500 })
  }

  /**
   * Returns the currently displayed artist name on the playbar.
   */
  async function getCurrentArtist(): Promise<string> {
    return artistName.innerText({ timeout: 500 })
  }

  /**
   * Press the shuffle button
   */
  async function clickShuffle() {
    await shuffleButton.click({ timeout: 500 })
  }

  async function isShuffleOn() {
    return shuffleButton.evaluate(
      (element) => element.classList.contains("button-active"),
      { timeout: 500 }
    )
  }
}
