import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthDemo } from './pages/AuthDemo';
import AutoSeatPage from './pages/AutoSeatPage';
import AutoStartGamePage from './pages/AutoStartGamePage';
import GamePage from './pages/GamePage';
import { JoinGamePage } from './pages/JoinGamePage';
import { JoinPage } from './pages/JoinPage';
import LobbyPage from './pages/LobbyPage';
import TableMonitorPage from './pages/TableMonitorPage';

console.log('🎯 App component starting...');

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🎯 React error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red' }}>
          <h1>Something went wrong.</h1>
          <p>Error: {this.state.error?.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  console.log('🎯 App component rendering...');
  
  try {
    return (
      <ErrorBoundary>
        <Router>
          <Routes>
            <Route path="/" element={<LobbyPage />} />
            <Route path="/join" element={<JoinPage />} />
            <Route path="/join-game" element={<JoinGamePage />} />
            <Route path="/auto-seat" element={<AutoSeatPage />} />
            <Route path="/auto-start-game" element={<AutoStartGamePage />} />
            <Route path="/game/:tableId?" element={<GamePage />} />
            <Route path="/auth-demo" element={<AuthDemo />} />
            <Route path="/table-monitor" element={<TableMonitorPage />} />
          </Routes>
        </Router>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('🎯 Error in App component:', error);
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h1>App component error</h1>
        <p>Error: {error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    );
  }
}

console.log('🎯 App component defined');

export default App; 