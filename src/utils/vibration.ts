export type HapticPattern = 'correct' | 'incorrect' | 'combo' | 'achievement' | 'levelup';

interface RumbleEffect {
  duration: number;
  weakMagnitude: number;
  strongMagnitude: number;
}

const PATTERNS: Record<HapticPattern, RumbleEffect> = {
  correct: {
    duration: 80,
    weakMagnitude: 0.45,
    strongMagnitude: 0.0,
  },
  incorrect: {
    duration: 180,
    weakMagnitude: 0.1,
    strongMagnitude: 0.65,
  },
  combo: {
    duration: 250,
    weakMagnitude: 0.6,
    strongMagnitude: 0.6,
  },
  achievement: {
    duration: 400,
    weakMagnitude: 0.85,
    strongMagnitude: 0.35,
  },
  levelup: {
    duration: 650,
    weakMagnitude: 0.95,
    strongMagnitude: 0.8,
  },
};

/**
 * Checks if vibration/rumble is supported on any connected gamepad.
 */
export const checkVibrationSupport = (): boolean => {
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (let i = 0; i < gamepads.length; i++) {
    const gp = gamepads[i];
    if (gp && gp.vibrationActuator) {
      return true;
    }
  }
  return false;
};

/**
 * Triggers gamepad rumble based on specific haptic patterns and strength levels.
 * Falls back to returning false if no actuators are present.
 */
export const triggerGamepadVibration = (
  pattern: HapticPattern,
  intensity: number = 1.0, // 0.0 to 1.0 strength multiplier
  enabled: boolean = true
): boolean => {
  if (!enabled || intensity <= 0) return false;

  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  let actuator: any = null;

  // Find the first gamepad with vibration capability
  for (let i = 0; i < gamepads.length; i++) {
    const gp = gamepads[i];
    if (gp && gp.vibrationActuator) {
      actuator = gp.vibrationActuator;
      break;
    }
  }

  if (actuator && typeof actuator.playEffect === 'function') {
    const preset = PATTERNS[pattern];
    if (!preset) return false;

    // Apply intensity multiplier
    const duration = preset.duration;
    const weakMagnitude = Math.min(1.0, preset.weakMagnitude * intensity);
    const strongMagnitude = Math.min(1.0, preset.strongMagnitude * intensity);

    actuator.playEffect('dual-rumble', {
      startDelay: 0,
      duration,
      weakMagnitude,
      strongMagnitude,
    }).catch((err: any) => {
      console.warn('Gamepad vibration failed to execute:', err);
    });

    return true;
  }

  return false;
};
