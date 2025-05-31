import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import { JoinGamePage } from './pages/JoinGamePage';
import { JoinPage } from './pages/JoinPage';
import { AuthDemo } from './pages/AuthDemo';
import { Navigation } from './components/Navigation';
import GlobalStyles from './styles/GlobalStyles';
import { theme } from './styles/theme';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Router>
        <GlobalStyles />
        <div data-testid="game-container">
          <Navigation />
          <Routes>
            <Route path="/" element={<LobbyPage />} />
            <Route path="/auth-demo" element={<AuthDemo />} />
            <Route path="/join" element={<JoinPage />} />
            <Route path="/join-table" element={<JoinGamePage />} />
            <Route path="/game/:gameId" element={<GamePage />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App; 