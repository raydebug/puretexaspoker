import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import { JoinGamePage } from './pages/JoinGamePage';
import GlobalStyles from './styles/GlobalStyles';

function App() {
  return (
    <Router>
      <GlobalStyles />
      <Routes>
        <Route path="/" element={<LobbyPage />} />
        <Route path="/lobby" element={<LobbyPage />} />
        <Route path="/join" element={<JoinGamePage />} />
        <Route path="/game/:gameId" element={<GamePage />} />
      </Routes>
    </Router>
  );
}

export default App; 