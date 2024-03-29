/* eslint-disable unicorn/prefer-dom-node-text-content */

import { TEST_IDS } from "@sing-renderer/TestConsts"

import type { ElectronApplication } from "playwright"

import { convertDisplayTimeToSeconds } from "#/Helper"

/**
 * Interact with the playbar
 */
export async function createPlaybarOrganism(electron: ElectronApplication) {
  const page = await electron.firstWindow()

  const currentTime = page.getByTestId(TEST_IDS.seekbarCurrentTime),
    currentTrackTitle = page.getByTestId(TEST_IDS.playbarTitle),
    currentTrackArtist = page.getByTestId(TEST_IDS.playbarArtist),
    currentArtist = page.getByTestId(TEST_IDS.playbarArtist),
    volumeIcon = page.getByTestId(TEST_IDS.playbarVolumeIcon),
    backButton = page.getByTestId(TEST_IDS.playbarBackButton),
    cover = page.getByTestId(TEST_IDS.playbarCover),
    nextButton = page.getByTestId(TEST_IDS.playbarNextButton),
    pauseButton = page.getByTestId(TEST_IDS.playbarPauseButton),
    playButton = page.getByTestId(TEST_IDS.playbarPlayButton),
    progressbar = page.getByTestId(TEST_IDS.seekbarProgressbar),
    seekbar = page.getByTestId(TEST_IDS.seekbar),
    testAudioElement = page.getByTestId(TEST_IDS.testAudioELement),
    totalDuration = page.getByTestId(TEST_IDS.seekbarTotalDuration),
    volumeSlider = page.getByTestId(TEST_IDS.volumeSlider),
    volumeSliderInner = page.getByTestId(TEST_IDS.volumeSliderInner),
    shuffleButton = page.getByTestId(TEST_IDS.playbarShuffleButton)

  // , previousTracks = page.getByTestId(TEST_IDS.queuePlayedTracks)

  return {
    clickNext,
    currentTrackTitle,
    currentTrackArtist,
    clickPause,
    clickPlay,
    clickPrevious,
    clickSeekbar,
    clickShuffle,
    currentArtist,
    currentTime,
    getCoverPath,
    getCurrentTime: getCurrentProgress,
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
    waitForProgessToBecome: waitForDurationToBecome,
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

  async function waitForDurationToBecome(duration: number) {
    await hoverSeekbar()

    return currentTime
      .filter({ hasText: String(duration) })
      .waitFor({ state: "visible" })
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
    return playButton.click()
  }

  /**
   * Go to the next track by clicking the `next` button.
   */
  async function clickNext() {
    await nextButton.click()
  }

  async function clickPrevious() {
    return backButton.click()
  }

  async function getProgressBarWidth() {
    const boundingBox = await progressbar.boundingBox()

    return boundingBox?.width
  }

  async function clickSeekbar(seekPercentage: number) {
    const boundingBox = await seekbar.boundingBox()

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
      force: true,
    })
  }

  /**
   * Get the current progress of the track in seconds.
   */
  async function getCurrentProgress(): Promise<number> {
    await hoverSeekbar()
    const time = convertDisplayTimeToSeconds(await currentTime.innerText())

    return time
  }

  async function getTotalDuration() {
    await hoverSeekbar()
    const time = convertDisplayTimeToSeconds(await totalDuration.innerText())

    return time
  }

  async function hoverSeekbar() {
    await seekbar.hover()
  }

  async function hoverVolumeIcon() {
    await volumeIcon.hover({ force: true })
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

  /**
   * Sets the volume in decimal percentage like `0.5`.
   */
  async function setVolume(volume: number): Promise<void> {
    await hoverVolumeIcon()

    const { height, width } = (await volumeSlider.boundingBox()) || {
      height: undefined,
      width: undefined,
    }

    if (height === undefined) {
      throw new Error("height of volume slider is undefined")
    }
    if (width === undefined) {
      throw new Error("width of volume slider is undefined")
    }

    const heightToReach = height * volume
    const x = width * 0.5 // Do not click on the border, click on the center

    await volumeSlider.click({
      position: {
        y: heightToReach,
        x,
      },
      force: true,
    })

    await waitForAnimationToFinish()

    async function waitForAnimationToFinish(
      newHeight?: number | undefined,
      previousHeight?: number | undefined
    ): Promise<void> {
      const boundingBox = await volumeSliderInner.boundingBox()

      const newElementHeight = boundingBox?.height

      if (newElementHeight === undefined)
        throw new Error("height of volume gradient is undefined")

      if (newElementHeight !== previousHeight) {
        // Nessecary as two frames might have the same value
        await page.waitForTimeout(10)
        return waitForAnimationToFinish(newElementHeight, newHeight)
      }
      return
    }
  }

  /**
   * Pause the playback by clicking the pause button.
   */
  async function clickPause() {
    await pauseButton.click()
  }

  /**
   * Press the shuffle button
   */
  async function clickShuffle() {
    await shuffleButton.click()
  }

  async function isShuffleOn() {
    return shuffleButton.evaluate((element) =>
      element.classList.contains("button-active")
    )
  }
}
