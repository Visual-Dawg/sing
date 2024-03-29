import type { FilePath } from "@sing-types/Filesystem"
import type {
  IMusicIDs,
  IPlaylist,
  IPlaylistCreateArgument,
} from "@sing-types/DatabaseTypes"
import type { SvelteComponentDev } from "svelte/internal"
import type { AsyncOrSync } from "ts-essentials"
import type { ITestAttribute, ITestID } from "@/TestConsts"
import type { PAGE_TITLES } from "@/Constants"

export type IPlayState = MediaSessionPlaybackState
export type IPlayLoop = "NONE" | "LOOP_QUEUE" | "LOOP_TRACK"

export type IHeroMetaDataItem = AsyncOrSync<{
  readonly label: string
  readonly to?: string
  readonly bold?: boolean
}>

export type ITrackListDisplayOptions = {
  readonly artist?: boolean
  readonly album?: boolean
  readonly cover?: boolean
}

export type IHeroButton = {
  readonly icon: typeof SvelteComponentDev | undefined
  readonly label: string
  readonly callback: (...arguments_: any[]) => void
  readonly primary?: boolean
}

/**
 * The type of the card element used on for examples the albums and playlists pages.
 */
export type ICardProperties = {
  readonly title: string
  readonly secondaryText?: string
  readonly image?: FilePath | readonly FilePath[]
  readonly contextMenuItems: IMenuItemsArgument
  readonly onPlay: () => void
  readonly onClickPrimary: () => void
  readonly onClickSecondary?: () => void
  readonly testAttributes?: ITestAttribute | readonly ITestAttribute[]
  readonly testID?: ITestID
}

export type IMenuID = symbol | "main"

/**
 * The data to be used to render a menu.
 * It is the converted {@link IMenuItemArgument}[ ]
 */
export type IMenu = {
  readonly id: IMenuID
  readonly title: string
  readonly items: readonly (IMenuItemArgument | IMenuSpacer)[]
  readonly previousMenu: IMenuID | undefined // Link the previous menu and not the next, as there can be mutliple next menus.
}

/**
 * Either the X and Y coordinates or an element for Popperjs to position the menu to.
 */
export type IMenuLocation =
  | HTMLElement
  | {
      clientX: number
      clientY: number
    }

/**
 * A single menu item
 */
export type IMenuItemArgument = {
  readonly type: "item"
  readonly onClick: () => void
  readonly label: string
  readonly leadingIcon?: ConstructorOfATypedSvelteComponent
  readonly trailingIcon?: ConstructorOfATypedSvelteComponent
}

export type IMenuSpacer = {
  type: "spacer"
}

/**
 * A single menu item which opens up a submenu on click.
 * Contains the submenu.
 * @property subMenu The submenu to be displayed on click
 */
export type ISubmenuItemArgument = {
  readonly type: "subMenu"
  readonly label: string
  readonly icon?: ConstructorOfATypedSvelteComponent
  readonly subMenu: IMenuItemsArgument
}

/**
 * The argument to open a menu with its items.
 * @param onEvent The event to trigger the opening of the menu.
 */
export type IOpenMenuArgument = {
  readonly menuItems: IMenuItemsArgument
  readonly onEvent?: keyof DocumentEventMap
  readonly testID?: string
}

/**
 * Menu items to be passed to the menu-factory.
 */
export type IMenuItemsArgument = readonly (
  | IMenuItemArgument
  | ISubmenuItemArgument
  | IMenuSpacer
)[]

/**
 * Used to create context menu items for music items, like albums and tracks.
 */
export type ICreateMenuOutOfMusic = (
  item: IPlaylistCreateArgument
) => IMenuItemsArgument

/**
 * Same as {@link ICreateMenuOutOfMusic}, but narrowed only for tracks.
 * The `name` property is used like in {@link ICreateMenuOutOfMusic} to automatically infer the name of a created playlist, as the menu items also allow creating a new playlist.
 */
export type ICreateMenuOutOfTrack = (
  item: IMusicIDs["track"] & Pick<IPlaylist, "name">
) => IMenuItemsArgument

export type IPageTitle = (typeof PAGE_TITLES)[keyof typeof PAGE_TITLES]
