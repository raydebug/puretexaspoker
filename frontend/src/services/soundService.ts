import { cookieService } from './cookieService';

// Define sound effect types for the game
type SoundType = 
  | 'cardDeal' 
  | 'cardFlip' 
  | 'chipBet' 
  | 'chipCollect' 
  | 'check' 
  | 'fold'
  | 'win'
  | 'lose'
  | 'notification'
  | 'error'
  | 'message'
  | 'buttonClick';

// Interface for SoundService
interface Sound {
  url: string;
  volume: number;
  audio?: HTMLAudioElement;
}

class SoundService {
  private sounds: Record<SoundType, Sound>;
  private isMuted: boolean;
  private isInitialized: boolean = false;
  private volume: number = 0.5; // 0.0 to 1.0

  constructor() {
    // Default sounds for the game
    this.sounds = {
      cardDeal: {
        url: '/sounds/card-deal.mp3',
        volume: 0.4
      },
      cardFlip: {
        url: '/sounds/card-flip.mp3',
        volume: 0.4
      },
      chipBet: {
        url: '/sounds/chip-bet.mp3',
        volume: 0.5
      },
      chipCollect: {
        url: '/sounds/chip-collect.mp3',
        volume: 0.5
      },
      check: {
        url: '/sounds/check.mp3',
        volume: 0.5
      },
      fold: {
        url: '/sounds/fold.mp3',
        volume: 0.5
      },
      win: {
        url: '/sounds/win.mp3',
        volume: 0.6
      },
      lose: {
        url: '/sounds/lose.mp3',
        volume: 0.4
      },
      notification: {
        url: '/sounds/notification.mp3',
        volume: 0.4
      },
      error: {
        url: '/sounds/error.mp3',
        volume: 0.4
      },
      message: {
        url: '/sounds/message.mp3',
        volume: 0.3
      },
      buttonClick: {
        url: '/sounds/button-click.mp3',
        volume: 0.3
      }
    };

    // Get muted state from cookies or default to false
    this.isMuted = cookieService.getSoundMuted() ?? false;
  }

  // Initialize audio objects
  public initialize(): void {
    if (this.isInitialized) return;

    // Create Audio elements for each sound
    Object.entries(this.sounds).forEach(([key, sound]) => {
      const audio = new Audio(sound.url);
      audio.volume = sound.volume * this.volume;
      audio.preload = 'auto';
      this.sounds[key as SoundType].audio = audio;
    });

    this.isInitialized = true;
    console.log('Sound service initialized');
  }

  // Play a sound
  public play(soundType: SoundType): void {
    if (!this.isInitialized) {
      this.initialize();
    }

    if (this.isMuted) return;

    const sound = this.sounds[soundType];
    if (!sound || !sound.audio) return;

    try {
      // Clone the audio for overlapping sounds
      const audioClone = sound.audio.cloneNode() as HTMLAudioElement;
      audioClone.volume = sound.volume * this.volume;
      audioClone.play().catch(error => {
        console.error(`Failed to play sound ${soundType}:`, error);
      });
    } catch (error) {
      console.error(`Error playing sound ${soundType}:`, error);
    }
  }

  // Toggle mute state
  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    cookieService.setSoundMuted(this.isMuted);
    return this.isMuted;
  }

  // Set mute state
  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    cookieService.setSoundMuted(this.isMuted);
  }

  // Get current mute state
  public isSoundMuted(): boolean {
    return this.isMuted;
  }

  // Set volume (0.0 to 1.0)
  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    
    // Update volume for all audio elements
    Object.values(this.sounds).forEach(sound => {
      if (sound.audio) {
        sound.audio.volume = sound.volume * this.volume;
      }
    });

    cookieService.setSoundVolume(this.volume);
  }

  // Get current volume
  public getVolume(): number {
    return this.volume;
  }
}

export const soundService = new SoundService(); 