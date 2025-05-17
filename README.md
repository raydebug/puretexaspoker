# Poker Game

A real-time multiplayer poker game built with React, TypeScript, and Socket.IO.

## Features

- Real-time multiplayer gameplay
- 5-player poker table
- No login required - just enter a nickname and join
- Seat selection
- Animated card dealing
- Real-time game state updates
- Betting, checking, and folding actions
- Community cards display
- Player chips and bets tracking

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser

## How to Play

1. Enter your nickname
2. Select an available seat at the poker table
3. Click "Join Game" to start playing
4. Wait for other players to join
5. When it's your turn:
   - Bet: Enter an amount and click "Bet"
   - Check: Click "Check" if no one has bet
   - Fold: Click "Fold" to give up your hand

## Technologies Used

- React
- TypeScript
- Socket.IO
- Styled Components
- React Router

## Project Structure

- `src/components/` - React components
- `src/pages/` - Page components
- `src/services/` - Socket service and other utilities
- `src/types/` - TypeScript type definitions

## Development

The project uses:
- TypeScript for type safety
- Styled Components for styling
- Socket.IO for real-time communication
- React Router for navigation

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request 