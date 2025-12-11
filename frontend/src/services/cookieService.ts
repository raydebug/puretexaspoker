import Cookies from 'js-cookie';

const COOKIE_KEYS = {
  NICKNAME: 'poker_nickname',
  SEAT_NUMBER: 'poker_seat_number',
  SOUND_MUTED: 'poker_sound_muted',
  SOUND_VOLUME: 'poker_sound_volume',
};

class CookieService {
  setNickname(nickname: string) {
    Cookies.set(COOKIE_KEYS.NICKNAME, nickname, { expires: 7 }); // Expires in 7 days
  }

  getNickname(): string | undefined {
    return Cookies.get(COOKIE_KEYS.NICKNAME);
  }

  setSeatNumber(seatNumber: number) {
    Cookies.set(COOKIE_KEYS.SEAT_NUMBER, seatNumber.toString(), { expires: 7 });
  }

  getSeatNumber(): number | null {
    const seatNumber = Cookies.get(COOKIE_KEYS.SEAT_NUMBER);
    return seatNumber ? parseInt(seatNumber, 10) : null;
  }

  // Sound settings
  setSoundMuted(muted: boolean) {
    Cookies.set(COOKIE_KEYS.SOUND_MUTED, muted.toString(), { expires: 30 });
  }

  getSoundMuted(): boolean | null {
    const muted = Cookies.get(COOKIE_KEYS.SOUND_MUTED);
    if (muted === undefined) return null;
    return muted === 'true';
  }

  setSoundVolume(volume: number) {
    Cookies.set(COOKIE_KEYS.SOUND_VOLUME, volume.toString(), { expires: 30 });
  }

  getSoundVolume(): number | null {
    const volume = Cookies.get(COOKIE_KEYS.SOUND_VOLUME);
    return volume ? parseFloat(volume) : null;
  }

  clearGameData() {
    Cookies.remove(COOKIE_KEYS.NICKNAME);
    Cookies.remove(COOKIE_KEYS.SEAT_NUMBER);
  }

  clearAllData() {
    Object.values(COOKIE_KEYS).forEach(key => {
      Cookies.remove(key);
    });
  }
}

export const cookieService = new CookieService(); 