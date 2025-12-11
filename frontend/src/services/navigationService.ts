/**
 * Navigation Service
 * 
 * Provides programmatic navigation capabilities for services that are not React components.
 * This allows the socketService to trigger navigation based on location state changes.
 */

type NavigationCallback = (path: string, replace?: boolean) => void;

class NavigationService {
  private navigationCallback: NavigationCallback | null = null;

  /**
   * Set the navigation callback function (called from React components with access to useNavigate)
   */
  setNavigationCallback(callback: NavigationCallback) {
    this.navigationCallback = callback;
  }

  /**
   * Navigate to a specific path
   */
  navigate(path: string, replace = false) {
    if (this.navigationCallback) {
      console.log(`🚀 NAVIGATION: Navigating to ${path} (replace: ${replace})`);
      this.navigationCallback(path, replace);
    } else {
      console.warn('Navigation callback not set, falling back to window.location');
      if (replace) {
        window.location.replace(path);
      } else {
        window.location.href = path;
      }
    }
  }

  /**
   * Navigate to lobby
   */
  navigateToLobby(replace = true) {
    this.navigate('/', replace);
  }

  /**
   * Navigate to game page
   */
  navigateToGame(gameId: string | number, replace = false) {
    this.navigate(`/game/${gameId}`, replace);
  }

  /**
   * Get current path (for debugging)
   */
  getCurrentPath(): string {
    return typeof window !== 'undefined' ? window.location.pathname : '';
  }

  /**
   * Check if currently on a specific path
   */
  isOnPath(path: string): boolean {
    return this.getCurrentPath() === path;
  }

  /**
   * Check if currently on lobby
   */
  isOnLobby(): boolean {
    const currentPath = this.getCurrentPath();
    return currentPath === '/' || currentPath.startsWith('/lobby');
  }

  /**
   * Check if currently on a game page
   */
  isOnGamePage(): boolean {
    return this.getCurrentPath().startsWith('/game/');
  }

  /**
   * Extract game ID from current path (if on game page)
   */
  getCurrentGameId(): string | null {
    const path = this.getCurrentPath();
    const match = path.match(/^\/game\/(.+)$/);
    return match ? match[1] : null;
  }
}

// Create singleton instance
const navigationService = new NavigationService();

export { navigationService }; 