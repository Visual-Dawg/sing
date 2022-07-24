/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Track } from "@prisma/client"

import type { Either } from "fp-ts/lib/Either"
import type * as mm from "music-metadata"
import type { app, IpcRendererEvent } from "electron"

import type { syncDirectories } from "../packages/backend/src/lib/Sync"

type NonNull<T> = T extends null ? never : T

export type ISyncResult = Awaited<ReturnType<typeof syncDirectories>>

export type NullableKeys<T> = NonNullable<
  {
    [K in keyof T]: T[K] extends NonNull<T[K]> ? never : K
  }[keyof T]
>

export type NullValuesToOptional<T> = Omit<T, NullableKeys<T>> &
  Partial<Pick<T, NullableKeys<T>>>

export type ITrack = NullValuesToOptional<Track>

export type IElectronPaths = Parameters<typeof app.getPath>[0]

/**
 * Also has the renderer event as its argument
 */
export interface IFrontendEventsBase {
  setMusic: (event: IpcRendererEvent, response: ISyncResult) => void
}
export type IFrontendEvents = {
  [Key in keyof IFrontendEventsBase]: (
    ...arguments_: ParametersWithoutFirst<IFrontendEventsBase[Key]>
  ) => void
}

export type AllowedIndexes<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends readonly any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Result extends any[] = []
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
> = T extends readonly [infer _, ...infer Rest]
  ? AllowedIndexes<Rest, [...Result, Result["length"]]>
  : Result[number]

// eslint-disable-next-line @typescript-eslint/ban-types
export type IError<T = {}> = {
  readonly error: Error | unknown
  readonly message?: string
} & T

export type Writeable<T> = { -readonly [P in keyof T]: T[P] }

export interface IRawAudioMetadata extends mm.IAudioMetadata {
  readonly filepath: string
}

export interface IidBackendAnswer {
  readonly id: string
  readonly data: Either<IError, unknown>
}

/**
 * Transfrom `[[[nestedType]]]` to `nestedType`
 * @example type x = [[[[string]]]]
 *     type unnestedX = innerArray<x> //=> `string`
 *
 */
export type InnerArray<T extends unknown[]> = T["length"] extends 1
  ? T[0] extends unknown[]
    ? T[0]["length"] extends 1
      ? InnerArray<T[0]>
      : T[0]
    : T[0]
  : T

export type FlattenedParameters<T extends (...arguments_: any[]) => any> =
  InnerArray<Parameters<T>>

export type DropFirst<T extends any[]> = T extends [any, ...infer U] ? U : never

export type ParametersWithoutFirst<T extends (...arguments_: any[]) => any> =
  DropFirst<Parameters<T>>

export type OptionalPromise<T> = T | Promise<T>

// type x = (options:  Prisma.TrackFindManyArgs | undefined) => void
// type y = Parameters<x>

// type b = InnerArray<Parameters< y>>
