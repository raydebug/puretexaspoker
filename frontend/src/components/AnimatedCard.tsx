import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { Card as CardType } from '../types/game';

const dealAnimation = keyframes`
  from {
    transform: translate(-50%, -50%) rotateY(180deg);
    opacity: 0;
  }
  to {
    transform: translate(0, 0) rotateY(0);
    opacity: 1;
  }
`;

const CardContainer = styled.div<{ delay: number; isDealt: boolean }>`
  width: 60px;
  height: 90px;
  position: relative;
  perspective: 1000px;
  animation: ${props => props.isDealt ? dealAnimation : 'none'} 0.5s ease-out forwards;
  animation-delay: ${props => props.delay}s;
  opacity: 0;
`;

const CardInner = styled.div<{ isFlipped: boolean }>`
  position: relative;
  width: 100%;
  height: 100%;
  text-align: center;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform-style: preserve-3d;
  transform: ${props => props.isFlipped ? 'rotateY(180deg)' : 'rotateY(0)'};
`;

const CardFace = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 20px;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
`;

const CardFront = styled(CardFace)`
  background-color: white;
  color: ${props => props.color === 'red' ? '#d40000' : 'black'};
`;

const CardBack = styled(CardFace)`
  background-color: #2c3e50;
  transform: rotateY(180deg);
  background-image: linear-gradient(45deg, #34495e 25%, transparent 25%),
    linear-gradient(-45deg, #34495e 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #34495e 75%),
    linear-gradient(-45deg, transparent 75%, #34495e 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
`;

interface AnimatedCardProps {
  card: CardType;
  delay: number;
  isVisible?: boolean;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({ card, delay, isVisible = true }) => {
  const [isDealt, setIsDealt] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    setIsDealt(true);
    const timer = setTimeout(() => setIsFlipped(true), delay * 1000 + 500);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!isVisible) {
    return null;
  }

  const getCardColor = (suit: string) => {
    return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
  };

  const getSuitSymbol = (suit: string) => {
    switch (suit) {
      case 'hearts': return '♥';
      case 'diamonds': return '♦';
      case 'clubs': return '♣';
      case 'spades': return '♠';
      default: return '';
    }
  };

  return (
    <CardContainer delay={delay} isDealt={isDealt}>
      <CardInner isFlipped={isFlipped}>
        <CardFront color={getCardColor(card.suit)}>
          {card.rank}
          {getSuitSymbol(card.suit)}
        </CardFront>
        <CardBack />
      </CardInner>
    </CardContainer>
  );
}; 