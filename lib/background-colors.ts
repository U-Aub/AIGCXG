import type { BackgroundColor, BackgroundColorKey } from "./photo-types"

export const BACKGROUND_COLORS: Record<BackgroundColorKey, BackgroundColor> = {
  red: {
    key: "red",
    name: "红色",
    hex: "#FF0000",
    rgb: { r: 255, g: 0, b: 0 },
  },
  white: {
    key: "white",
    name: "白色",
    hex: "#FFFFFF",
    rgb: { r: 255, g: 255, b: 255 },
  },
  blue: {
    key: "blue",
    name: "蓝色",
    hex: "#0000FF",
    rgb: { r: 0, g: 0, b: 255 },
  },
}

export const BACKGROUND_COLOR_OPTIONS = Object.values(BACKGROUND_COLORS)

export const DEFAULT_BACKGROUND_COLOR: BackgroundColorKey = "white"
