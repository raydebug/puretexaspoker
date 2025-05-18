import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import { JoinGamePage } from './pages/JoinGamePage';

export const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/lobby" replace />} />
        <Route path="/lobby" element={<LobbyPage />} />
        <Route path="/join" element={<JoinGamePage />} />
        <Route path="/game/:gameId" element={<GamePage />} />
      </Routes>
    </Router>
  );
};

export default App; 