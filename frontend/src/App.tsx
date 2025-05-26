import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import { JoinGamePage } from './pages/JoinGamePage';
import { JoinPage } from './pages/JoinPage';
import GlobalStyles from './styles/GlobalStyles';

function App() {
  return (
    <Router>
      <GlobalStyles />
      <div data-testid="game-container">
        <Routes>
          <Route path="/" element={<LobbyPage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/join-table" element={<JoinGamePage />} />
          <Route path="/game/:gameId" element={<GamePage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App; 