import { vi } from "vitest"
import rawMetaDataFactory from "../tests/factories/RawMetaDataFactory"
import * as mm from "music-metadata"

export const parseFile = vi.fn(async (filepath: string) => {
  const fileName = filepath.split("/").at(-1)?.at(0) // without extension

  const number = Number(fileName) // inputs should be like "./test/1.mp3"

  if (number === NaN || number === undefined || number === null) {
    throw new Error(
      `Received filepath with invalid testing filename: "${filepath}"\nFilenames should only use numbers for testing purposes`
    )
  }

  return rawMetaDataFactory.build(
    {},
    {
      transient: {
        forcedSequence: number,
      },
    }
  )
})

export const selectCover = mm.selectCover
