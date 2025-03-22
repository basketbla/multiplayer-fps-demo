import { useState, useEffect } from 'react'

// Define the control keys
const KEYS = {
  KeyW: 'forward',
  KeyS: 'backward',
  KeyA: 'left',
  KeyD: 'right',
  Space: 'jump',
}

export type KeyState = {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
  jump: boolean
}

export const useKeyboardControls = () => {
  const [keyState, setKeyState] = useState<KeyState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
  })

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.code as keyof typeof KEYS
      if (KEYS[key]) {
        setKeyState((state) => ({ ...state, [KEYS[key]]: true }))
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.code as keyof typeof KEYS
      if (KEYS[key]) {
        setKeyState((state) => ({ ...state, [KEYS[key]]: false }))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  return keyState
}

export default useKeyboardControls
