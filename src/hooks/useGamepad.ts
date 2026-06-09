import { useState, useEffect, useRef } from 'react';

export interface GamepadData {
  connected: boolean;
  id: string | null;
  buttons: Record<string, boolean>;
  buttonValues: Record<string, number>;
  axes: number[]; // [leftStickX, leftStickY, rightStickX, rightStickY]
}

const BUTTON_MAPPING: Record<number, string> = {
  0: 'A',
  1: 'B',
  2: 'X',
  3: 'Y',
  4: 'LB',
  5: 'RB',
  6: 'LT',
  7: 'RT',
  8: 'Back',
  9: 'Start',
  10: 'L3',
  11: 'R3',
  12: 'DpadUp',
  13: 'DpadDown',
  14: 'DpadLeft',
  15: 'DpadRight',
  16: 'Guide',
};

const INITIAL_STATE: GamepadData = {
  connected: false,
  id: null,
  buttons: {
    A: false, B: false, X: false, Y: false,
    LB: false, RB: false, LT: false, RT: false,
    DpadUp: false, DpadDown: false, DpadLeft: false, DpadRight: false,
    L3: false, R3: false, Start: false, Back: false, Guide: false,
  },
  buttonValues: {
    A: 0, B: 0, X: 0, Y: 0,
    LB: 0, RB: 0, LT: 0, RT: 0,
    DpadUp: 0, DpadDown: 0, DpadLeft: 0, DpadRight: 0,
    L3: 0, R3: 0, Start: 0, Back: 0, Guide: 0,
  },
  axes: [0, 0, 0, 0], // [LS_X, LS_Y, RS_X, RS_Y]
};

export const useGamepad = (): GamepadData => {
  const [gamepadState, setGamepadState] = useState<GamepadData>(INITIAL_STATE);
  const animationRef = useRef<number | null>(null);
  const previousStateRef = useRef<GamepadData | null>(null);

  const axesEqual = (a: number[], b: number[]) =>
    a.length === b.length && a.every((v, i) => v === b[i]);

  const buttonsEqual = (a: Record<string, boolean>, b: Record<string, boolean>) => {
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every(k => a[k] === b[k]);
  };

  const pollGamepad = () => {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let activeGamepad: Gamepad | null = null;

    // Find the first connected gamepad in the list
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        activeGamepad = gamepads[i];
        break;
      }
    }

    if (activeGamepad) {
      const mappedButtons: Record<string, boolean> = {};
      const mappedValues: Record<string, number> = {};

      // Map buttons based on standard index layout
      activeGamepad.buttons.forEach((btn, index) => {
        const key = BUTTON_MAPPING[index];
        if (key) {
          mappedButtons[key] = btn.pressed;
          mappedValues[key] = btn.value;
        }
      });

      const newAxes = [
        activeGamepad.axes[0] || 0, // LS X
        activeGamepad.axes[1] || 0, // LS Y
        activeGamepad.axes[2] || 0, // RS X
        activeGamepad.axes[3] || 0, // RS Y
      ];

      const mergedButtons = { ...INITIAL_STATE.buttons, ...mappedButtons };
      const mergedValues = { ...INITIAL_STATE.buttonValues, ...mappedValues };

      // Skip state update if nothing changed
      const prev = previousStateRef.current;
      if (
        prev &&
        prev.connected === true &&
        axesEqual(prev.axes, newAxes) &&
        buttonsEqual(prev.buttons, mergedButtons)
      ) {
        animationRef.current = requestAnimationFrame(pollGamepad);
        return;
      }

      const newState: GamepadData = {
        connected: true,
        id: activeGamepad.id,
        buttons: mergedButtons,
        buttonValues: mergedValues,
        axes: newAxes,
      };
      previousStateRef.current = newState;
      setGamepadState(newState);
    } else {
      if (previousStateRef.current?.connected !== false) {
        previousStateRef.current = INITIAL_STATE;
        setGamepadState(INITIAL_STATE);
      }
    }

    // Loop polling at 60fps
    animationRef.current = requestAnimationFrame(pollGamepad);
  };

  useEffect(() => {
    const handleConnected = () => {
      if (animationRef.current === null) {
        animationRef.current = requestAnimationFrame(pollGamepad);
      }
    };

    const handleDisconnected = () => {
      // Check if any gamepads are still connected
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const anyConnected = Array.from(gamepads).some(g => g !== null);
      
      if (!anyConnected) {
        if (animationRef.current !== null) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
        setGamepadState(INITIAL_STATE);
      }
    };

    window.addEventListener('gamepadconnected', handleConnected);
    window.addEventListener('gamepaddisconnected', handleDisconnected);

    // Initial check in case gamepad is already connected
    const existingGamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const hasExisting = Array.from(existingGamepads).some(g => g !== null);
    if (hasExisting) {
      handleConnected();
    }

    return () => {
      window.removeEventListener('gamepadconnected', handleConnected);
      window.removeEventListener('gamepaddisconnected', handleDisconnected);
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return gamepadState;
};
