export type Keybind<T> = {
  keyCode: string;
  keyBind: T;
};

export type KeybindMap<T> = Map<string, Keybind<T>>;
