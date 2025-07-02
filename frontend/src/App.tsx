import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import { JoinGamePage } from './pages/JoinGamePage';
import { JoinPage } from './pages/JoinPage';
import { AuthDemo } from './pages/AuthDemo';
import TableMonitorPage from './pages/TableMonitorPage';
import AutoSeatPage from './pages/AutoSeatPage';
import { Navigation } from './components/Navigation';
import GlobalStyles from './styles/GlobalStyles';
import { theme } from './styles/theme';
import { navigationService } from './services/navigationService';

// Inner component to access useNavigate hook
function AppContent() {
  const navigate = useNavigate();

  useEffect(() => {
    // Set up navigation callback for the navigation service
    navigationService.setNavigationCallback((path: string, replace = false) => {
      navigate(path, { replace });
    });

    return () => {
      // Clean up on unmount
      navigationService.setNavigationCallback(() => {});
    };
  }, [navigate]);

  return (
    <div data-testid="game-container">
      <Navigation />
      <Routes>
        <Route path="/" element={<LobbyPage />} />
        <Route path="/auth-demo" element={<AuthDemo />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/join-table" element={<JoinGamePage />} />
        <Route path="/game/:gameId" element={<GamePage />} />
        <Route path="/monitor" element={<TableMonitorPage />} />
        <Route path="/auto-seat" element={<AutoSeatPage />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Router>
        <GlobalStyles />
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}

export default App; 