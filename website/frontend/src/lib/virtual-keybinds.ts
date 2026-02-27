import type { KeybindMap } from "@/types/keybind";

/**
 * Hardcoded keybinds for virtual cube control.
 *
 */
export const DEFAULT_VIRTUAL_KEYBINDS: KeybindMap<string> = new Map([
  ["1", { keyCode: "Digit1", keyBind: "S'" }],
  ["2", { keyCode: "Digit2", keyBind: "E" }],
  ["3", { keyCode: "Digit3", keyBind: "" }],
  ["4", { keyCode: "Digit4", keyBind: "" }],
  ["5", { keyCode: "Digit5", keyBind: "M" }],
  ["6", { keyCode: "Digit6", keyBind: "M" }],
  ["7", { keyCode: "Digit7", keyBind: "" }],
  ["8", { keyCode: "Digit8", keyBind: "" }],
  ["9", { keyCode: "Digit9", keyBind: "E'" }],
  ["0", { keyCode: "Digit0", keyBind: "S" }],

  ["Q", { keyCode: "KeyQ", keyBind: "z'" }],
  ["W", { keyCode: "KeyW", keyBind: "B" }],
  ["E", { keyCode: "KeyE", keyBind: "L'" }],
  ["R", { keyCode: "KeyR", keyBind: "Lw'" }],
  ["T", { keyCode: "KeyT", keyBind: "x" }],
  ["Y", { keyCode: "KeyY", keyBind: "x" }],
  ["U", { keyCode: "KeyU", keyBind: "Rw" }],
  ["I", { keyCode: "KeyI", keyBind: "R" }],
  ["O", { keyCode: "KeyO", keyBind: "B'" }],
  ["P", { keyCode: "KeyP", keyBind: "z" }],

  ["A", { keyCode: "KeyA", keyBind: "y'" }],
  ["S", { keyCode: "KeyS", keyBind: "D" }],
  ["D", { keyCode: "KeyD", keyBind: "L" }],
  ["F", { keyCode: "KeyF", keyBind: "U'" }],
  ["G", { keyCode: "KeyG", keyBind: "F'" }],
  ["H", { keyCode: "KeyH", keyBind: "F" }],
  ["J", { keyCode: "KeyJ", keyBind: "U" }],
  ["K", { keyCode: "KeyK", keyBind: "R'" }],
  ["L", { keyCode: "KeyL", keyBind: "D'" }],
  [";", { keyCode: "Semicolon", keyBind: "y" }],

  ["Z", { keyCode: "KeyZ", keyBind: "Dw" }],
  ["X", { keyCode: "KeyX", keyBind: "M'" }],
  ["C", { keyCode: "KeyC", keyBind: "Uw'" }],
  ["V", { keyCode: "KeyV", keyBind: "Lw" }],
  ["B", { keyCode: "KeyB", keyBind: "x'" }],
  ["N", { keyCode: "KeyN", keyBind: "x'" }],
  ["M", { keyCode: "KeyM", keyBind: "Rw'" }],
  [",", { keyCode: "Comma", keyBind: "Uw" }],
  [".", { keyCode: "Period", keyBind: "M'" }],
  ["/", { keyCode: "Slash", keyBind: "Dw'" }],
]);
