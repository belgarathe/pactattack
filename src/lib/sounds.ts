/**
 * Sound effects utility
 * Plays sound effects for pack opening events
 */

// Cash register sound effect
// Try local file first, fallback to online source
const CASH_REGISTER_SOUND_URL = '/sounds/cash-register.mp3';

// Fallback online sound (if local file doesn't exist)
// Using a free cash register sound from a CDN
const FALLBACK_SOUND_URL = 'https://assets.mixkit.co/sfx/preview/mixkit-cash-register-788.mp3';

let audioCache: HTMLAudioElement | null = null;

/**
 * Play cash register sound effect
 * Used when Rare or Mythic cards are pulled
 */
export function playCashRegisterSound() {
  try {
    // Create audio element if not cached
    if (!audioCache) {
      audioCache = new Audio(CASH_REGISTER_SOUND_URL);
      audioCache.volume = 0.7; // Set volume to 70%
      audioCache.preload = 'auto';
      
      // Handle error loading local file, try fallback
      audioCache.addEventListener('error', () => {
        if (audioCache && audioCache.src !== FALLBACK_SOUND_URL) {
          audioCache.src = FALLBACK_SOUND_URL;
          audioCache.load();
        }
      });
    }

    // Reset and play
    audioCache.currentTime = 0;
    const playPromise = audioCache.play();
    
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        // Handle autoplay restrictions - try fallback if local fails
        if (audioCache && audioCache.src === CASH_REGISTER_SOUND_URL) {
          audioCache.src = FALLBACK_SOUND_URL;
          audioCache.load();
          audioCache.play().catch(() => {
            console.warn('Could not play sound (autoplay may be blocked)');
          });
        } else {
          console.warn('Could not play sound:', error);
        }
      });
    }
  } catch (error) {
    console.warn('Error playing cash register sound:', error);
  }
}

/**
 * Preload sound effects
 */
export function preloadSounds() {
  try {
    if (!audioCache) {
      audioCache = new Audio(CASH_REGISTER_SOUND_URL);
      audioCache.volume = 0.7;
      audioCache.preload = 'auto';
      
      // Try fallback if local file fails
      audioCache.addEventListener('error', () => {
        if (audioCache && audioCache.src !== FALLBACK_SOUND_URL) {
          audioCache.src = FALLBACK_SOUND_URL;
          audioCache.load();
        }
      });
    }
  } catch (error) {
    console.warn('Error preloading sounds:', error);
  }
}

