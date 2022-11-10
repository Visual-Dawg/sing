import * as E from "fp-ts/lib/Either"

import type { Either, Right } from "fp-ts/lib/Either"
import type { IBackendQueryResponse } from "./IPC"

export function isError(error: unknown): error is Error {
  return error instanceof Error
}

export function isBackendQueryResponse(
  response: unknown
): response is IBackendQueryResponse {
  if (typeof response !== "object" || response === null) return false
  if (typeof (response as IBackendQueryResponse)?.queryID !== "string")
    return false
  if ((response as IBackendQueryResponse)?.data === undefined) return false

  return true
}

export function isKeyOfObject<T, Key extends string | number | symbol>(
  object: T,
  key: Key
): object is T & { [key in Key]: unknown } {
  return key in object
}

/**
 * Check if an array of Eithers contains only right values and narrow down the type.
 */
export function hasOnlyRightValues<
  T extends readonly Either<unknown, unknown>[]
>(
  array: T
  // @ts-ignore - It works but TS does not like it.
): array is T extends readonly Either<unknown, infer R>[] ? Right<R>[] : never {
  return array.some(E.isLeft)
}

// export function isIFrontendEventsConsumeData(data: unknown): data is IFrontendEventsConsume[keyof IFrontendEventsConsume] {
//   if (typeof data !== "object" || data === null) return false
//   if ((data as IFrontendEventsConsume)? !== true) return false
//   if ((data as IFrontendEventsConsume)?.data === undefined) return false
//   if (typeof (data as IFrontendEventsConsume)?.event !== "string") return false

//   return true
// }

// const x = {
//   event: "getTracks",
//   id: "jonoin",
//   args: [],
// }

// isIDEvent(x) //?

//? ##############################################################
//? #######################   TESTS   ############################
//? ##############################################################

// if (import.meta.vitest) {
//   const { expect, test } = await import("vitest")

//   test("isIDEvent happy", () => {
//     const event = {
//       id: "09hg97gh9g9g9vbujuoi",
//       response: { hi: "Hiiii" },
//     }

//     expect(isIDEvent(event)).toBe(true)
//   })

//   test("isIDEvent sad", () => {
//     const event = {
//       id: 3423,
//       data: { hi: "Hiiii" },
//     }

//     expect(isIDEvent(event)).toBe(false)
//   })
// }
