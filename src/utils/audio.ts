// Web Audio API feedback synthesizer and Speech Synthesis wrapper
class AudioFeedbackService {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    // Resume if suspended by browser autoplay policy
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Synthesize retro gaming chimes and buzzers
  public play(type: 'correct' | 'incorrect' | 'click' | 'combo' | 'levelup') {
    const context = this.getContext();
    if (!context) return;

    const osc = context.createOscillator();
    const gainNode = context.createGain();
    osc.connect(gainNode);
    gainNode.connect(context.destination);

    const now = context.currentTime;

    if (type === 'click') {
      // Short click sound
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);
      gainNode.gain.setValueAtTime(0.12, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'correct') {
      // Pleasant high double-chime
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      gainNode.gain.setValueAtTime(0.18, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'incorrect') {
      // Low buzz sound
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.linearRampToValueAtTime(80, now + 0.2);
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (type === 'combo') {
      // Rapid upward scale
      osc.type = 'sine';
      const notes = [261.63, 329.63, 392.00, 523.25]; // C4 -> E4 -> G4 -> C5
      notes.forEach((freq, idx) => {
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
      });
      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.setValueAtTime(0.15, now + 0.2);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'levelup') {
      // Triumphant arpeggio
      osc.type = 'square';
      const notes = [196.00, 261.63, 329.63, 392.00, 523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
      });
      gainNode.gain.setValueAtTime(0.12, now);
      gainNode.gain.setValueAtTime(0.12, now + 0.3);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc.start(now);
      osc.stop(now + 0.55);
    }
  }

  // Wrapper for Web Speech Synthesis
  public speak(text: string) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Cancel active speaking
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.35;
      utterance.pitch = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  }
}

export const audioFeedback = new AudioFeedbackService();
