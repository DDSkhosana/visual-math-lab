/**
 * Minimal observable store (Observer pattern). State is treated as immutable:
 * replace nested objects instead of mutating them so change detection stays shallow.
 */
export function createStore(initialState) {
  const initial = JSON.parse(JSON.stringify(initialState));
  let state = initialState;
  const subscribers = new Set();

  return {
    get: () => state,

    set(patch) {
      const changedKeys = Object.keys(patch).filter((key) => !Object.is(state[key], patch[key]));
      if (changedKeys.length === 0) return;
      state = { ...state, ...patch };
      for (const { listener, keys } of [...subscribers]) {
        if (!keys || keys.some((key) => changedKeys.includes(key))) listener(state);
      }
    },

    reset() {
      state = JSON.parse(JSON.stringify(initial));
      for (const { listener } of [...subscribers]) {
        listener(state);
      }
    },

    getInitial: () => JSON.parse(JSON.stringify(initial)),

    /** Subscribes to every change, or only changes to the listed top-level keys. Returns an unsubscribe function. */
    subscribe(listener, keys = null) {
      const entry = { listener, keys };
      subscribers.add(entry);
      return () => subscribers.delete(entry);
    },
  };
}
