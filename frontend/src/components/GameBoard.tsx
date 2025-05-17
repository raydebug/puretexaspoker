import React from 'react';
import styled from 'styled-components';
import { GameState, Player } from '../types/game';
import { AnimatedCard } from './AnimatedCard';

const Table = styled.div`
  width: 800px;
  height: 400px;
  background-color: #2c8a3d;
  border-radius: 200px;
  position: relative;
  margin: 20px auto;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
`;

const CommunityCards = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  gap: 10px;
`;

const Pot = styled.div`
  position: absolute;
  top: 40%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10px 20px;
  border-radius: 20px;
  font-size: 1.2rem;
`;

const PlayerSeat = styled.div<{ position: number }>`
  position: absolute;
  width: 120px;
  padding: 10px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  border: 2px solid #ffd700;
  border-radius: 10px;
  ${props => {
    const angle = (props.position * 72 - 90) * (Math.PI / 180);
    const radius = 180;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    return `
      left: calc(50% + ${x}px);
      top: calc(50% + ${y}px);
      transform: translate(-50%, -50%);
    `;
  }}
`;

const PlayerInfo = styled.div`
  text-align: center;
  margin-bottom: 10px;
`;

const PlayerCards = styled.div`
  display: flex;
  gap: 5px;
  justify-content: center;
`;

interface GameBoardProps {
  gameState: GameState;
  currentPlayer: Player;
}

export const GameBoard: React.FC<GameBoardProps> = ({ gameState, currentPlayer }) => {
  const renderPlayer = (player: Player) => {
    const isCurrentPlayer = player.id === currentPlayer.id;
    const isCurrentTurn = gameState.currentPlayerId === player.id;

    return (
      <PlayerSeat key={player.id} position={player.position}>
        <PlayerInfo>
          <div>{player.name}</div>
          <div>Chips: {player.chips}</div>
          {player.currentBet > 0 && <div>Bet: {player.currentBet}</div>}
          {isCurrentTurn && <div style={{ color: '#ffd700' }}>Your Turn</div>}
        </PlayerInfo>
        <PlayerCards>
          {player.cards.map((card, index) => (
            <AnimatedCard
              key={index}
              card={card}
              isVisible={isCurrentPlayer}
              delay={index * 0.2}
            />
          ))}
        </PlayerCards>
      </PlayerSeat>
    );
  };

  return (
    <Table>
      <Pot>Pot: {gameState.pot}</Pot>
      <CommunityCards>
        {gameState.communityCards.map((card, index) => (
          <AnimatedCard
            key={index}
            card={card}
            isVisible={true}
            delay={index * 0.2}
          />
        ))}
      </CommunityCards>
      {gameState.players.map(renderPlayer)}
    </Table>
  );
}; 