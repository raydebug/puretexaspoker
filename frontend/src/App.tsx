import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GameLobby } from './components/GameLobby';
import GamePage from './pages/GamePage';
import { socketService } from './services/socketService';

function App() {
  const handleJoinGame = (nickname: string, seatNumber: number) => {
    // Connect to socket and join game
    socketService.connect();
    socketService.joinGame(nickname, seatNumber);
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<GameLobby onJoinGame={handleJoinGame} />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App; 