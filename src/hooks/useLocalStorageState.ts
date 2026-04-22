import { useCallback, useEffect, useState } from 'react'

type Updater<T> = T | ((prev: T) => T)

/**
 * Drop-in replacement for `useKV` from `@github/spark/hooks`,
 * backed by `window.localStorage`. Keeps the same `[value, setValue, deleteValue]`
 * tuple shape and supports functional updates.
 */
export function useLocalStorageState<T>(
  key: string,
  defaultValue: T,
): [T, (next: Updater<T>) => void, () => void] {
  const readInitial = (): T => {
    if (typeof window === 'undefined') return defaultValue
    try {
      const raw = window.localStorage.getItem(key)
      if (raw === null) return defaultValue
      return JSON.parse(raw) as T
    } catch {
      return defaultValue
    }
  }

  const [value, setValueState] = useState<T>(readInitial)

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // quota exceeded or serialization failure — ignore silently
    }
  }, [key, value])

  const setValue = useCallback((next: Updater<T>) => {
    setValueState(prev => {
      const computed =
        typeof next === 'function' ? (next as (p: T) => T)(prev) : next
      // Avoid triggering re-renders when the new value is structurally equal.
      // This matches the behaviour of `@github/spark`'s `useKV`, which doesn't
      // synchronously re-render on no-op updates and prevents `useEffect`
      // chains from looping forever when callers return a freshly built object
      // each time (e.g. `[...a, ...b]`).
      if (Object.is(computed, prev)) return prev
      try {
        if (JSON.stringify(computed) === JSON.stringify(prev)) return prev
      } catch {
        // fall through — non-serialisable values just compare by identity
      }
      return computed
    })
  }, [])

  const deleteValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // ignore
    }
    setValueState(defaultValue)
  }, [key, defaultValue])

  return [value, setValue, deleteValue]
}
