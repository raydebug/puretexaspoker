import Cookies from 'js-cookie';

const COOKIE_KEYS = {
  NICKNAME: 'poker_nickname',
  SEAT_NUMBER: 'poker_seat_number',
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

  clearGameData() {
    Cookies.remove(COOKIE_KEYS.NICKNAME);
    Cookies.remove(COOKIE_KEYS.SEAT_NUMBER);
  }
}

export const cookieService = new CookieService(); 