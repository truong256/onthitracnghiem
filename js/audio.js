/**
 * Sound Effects Engine (Silenced / Disabled per user preference)
 */

class SoundEffects {
  constructor() {
    this.muted = true;
  }

  init() {}
  toggleMute() { return true; }
  isMuted() { return true; }
  playClick() {}
  playCorrect() {}
  playWrong() {}
  playFinish() {}
}

export const sounds = new SoundEffects();

