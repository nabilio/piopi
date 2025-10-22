type SoundType =
  | 'correct'
  | 'wrong'
  | 'perfect'
  | 'complete'
  | 'battle_start'
  | 'battle_victory'
  | 'battle_defeat'
  | 'countdown'
  | 'timer_warning'
  | 'page_turn'
  | 'story_complete';

export function playSound(type: SoundType) {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    let duration = 0.3;

    switch (type) {
      case 'correct':
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2);
        break;

      case 'wrong':
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
        duration = 0.2;
        break;

      case 'perfect':
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.15);
        oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.3);
        oscillator.frequency.setValueAtTime(1046.50, audioContext.currentTime + 0.45);
        duration = 0.6;
        break;

      case 'complete':
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        duration = 0.4;
        break;

      case 'battle_start':
        oscillator.frequency.setValueAtTime(392.00, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.2);
        oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.3);
        duration = 0.5;
        break;

      case 'battle_victory':
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.12);
        oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.24);
        oscillator.frequency.setValueAtTime(1046.50, audioContext.currentTime + 0.36);
        oscillator.frequency.setValueAtTime(1318.51, audioContext.currentTime + 0.48);
        duration = 0.7;
        break;

      case 'battle_defeat':
        oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(250, audioContext.currentTime + 0.15);
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime + 0.3);
        duration = 0.5;
        break;

      case 'countdown':
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
        duration = 0.15;
        break;

      case 'timer_warning':
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.2);
        duration = 0.35;
        break;

      case 'page_turn':
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(350, audioContext.currentTime + 0.05);
        duration = 0.15;
        break;

      case 'story_complete':
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.15);
        oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.3);
        oscillator.frequency.setValueAtTime(1046.50, audioContext.currentTime + 0.45);
        duration = 0.6;
        break;

      default:
        oscillator.frequency.setValueAtTime(100, audioContext.currentTime);
        duration = 0.1;
    }

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  } catch (e) {
    console.log('Audio not supported');
  }
}
