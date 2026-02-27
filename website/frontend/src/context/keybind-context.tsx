import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useRef,
} from "react";

type KeybindHandler = {
  key: string; // can be event.key or event.code
  handler: () => void;
};

type KeybindContextValue = {
  registerKeyDownKeybind: (keybindHandler: KeybindHandler) => void;
  registerKeyUpKeybind: (keybindHandler: KeybindHandler) => void;
  unregisterKeyDownKeybind: (key: string) => void;
  unregisterKeyUpKeybind: (key: string) => void;
};

const KeybindContext = createContext<KeybindContextValue | null>(null);

export function KeybindProvider({ children }: { children: React.ReactNode }) {
  const keyDownHandlersRef = useRef<Map<string, KeybindHandler>>(new Map());
  const keyUpHandlersRef = useRef<Map<string, KeybindHandler>>(new Map());

  const registerKeyDownKeybind = useCallback((handler: KeybindHandler) => {
    if (keyDownHandlersRef.current.has(handler.key)) {
      console.warn(
        `Key ${handler.key} already has a value in global key down keybind handler mapping. Overriding with new handler.`
      );
    }
    keyDownHandlersRef.current.set(handler.key, handler);
  }, []);

  const unregisterKeyDownKeybind = useCallback((id: string) => {
    keyDownHandlersRef.current.delete(id);
  }, []);

  const registerKeyUpKeybind = useCallback((handler: KeybindHandler) => {
    if (keyUpHandlersRef.current.has(handler.key)) {
      console.warn(
        `Key ${handler.key} already has a value in global key up keybind handler mapping. Overriding with new handler.`
      );
    }
    keyUpHandlersRef.current.set(handler.key, handler);
  }, []);

  const unregisterKeyUpKeybind = useCallback((id: string) => {
    keyUpHandlersRef.current.delete(id);
  }, []);

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const key = event.key;
    if (keyDownHandlersRef.current.has(key)) {
      keyDownHandlersRef.current.get(key)!.handler();
      return;
    }

    const code = event.code;
    keyDownHandlersRef.current.get(code)?.handler();
  });
  const handleKeyUp = useEffectEvent((event: KeyboardEvent) => {
    const key = event.key;
    if (keyUpHandlersRef.current.has(key)) {
      keyUpHandlersRef.current.get(key)!.handler();
      return;
    }

    const code = event.code;
    keyUpHandlersRef.current.get(code)?.handler();
  });

  // Single global event listener
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  return (
    <KeybindContext.Provider
      value={{
        registerKeyDownKeybind,
        registerKeyUpKeybind,
        unregisterKeyDownKeybind,
        unregisterKeyUpKeybind,
      }}
    >
      {children}
    </KeybindContext.Provider>
  );
}

export function useBTimeKeyDownKeybind(key: string, handler: () => void) {
  const context = useContext(KeybindContext);

  if (!context) {
    throw new Error("useBTimeKeybinds must be used within KeybindProvider");
  }

  const { registerKeyDownKeybind, unregisterKeyDownKeybind } = context;

  useEffect(() => {
    registerKeyDownKeybind({ key, handler });

    return () => {
      unregisterKeyDownKeybind(key);
    };
  }, [key, handler, registerKeyDownKeybind, unregisterKeyDownKeybind]);
}

export function useBTimeKeyUpKeybind(key: string, handler: () => void) {
  const context = useContext(KeybindContext);

  if (!context) {
    throw new Error("useBTimeKeybinds must be used within KeybindProvider");
  }

  const { registerKeyUpKeybind, unregisterKeyUpKeybind } = context;
  useEffect(() => {
    registerKeyUpKeybind({ key, handler });

    return () => unregisterKeyUpKeybind(key);
  }, [key, handler, registerKeyUpKeybind, unregisterKeyUpKeybind]);
}
