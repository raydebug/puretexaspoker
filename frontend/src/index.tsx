import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { GlobalStyles } from './styles/GlobalStyles';

console.log('🎯 React app starting...');

// Add global error handling
window.addEventListener('error', (event) => {
  console.error('🎯 Global error caught:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🎯 Unhandled promise rejection:', event.reason);
});

const rootElement = document.getElementById('root');
console.log('🎯 Root element found:', rootElement);

if (!rootElement) {
  console.error('🎯 Root element not found!');
  throw new Error('Root element not found');
}

const root = ReactDOM.createRoot(rootElement);

console.log('🎯 React root created:', root);

try {
  root.render(
    <React.StrictMode>
      <GlobalStyles />
      <App />
    </React.StrictMode>
  );
  console.log('🎯 React app rendered successfully');
} catch (error) {
  console.error('🎯 Error rendering React app:', error);
} 