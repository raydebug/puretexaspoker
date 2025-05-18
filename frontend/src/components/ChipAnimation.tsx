import React, { useEffect, useState } from 'react';
import styled, { keyframes } from 'styled-components';

// Animation that moves chips from a player position to the pot
const moveToCenter = keyframes`
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(var(--targetX), var(--targetY)) scale(0.8);
    opacity: 0.8;
  }
`;

// Animation for when a player wins and chips move from pot to player
const moveFromCenter = keyframes`
  0% {
    transform: translate(0, 0) scale(0.8);
    opacity: 0.8;
  }
  100% {
    transform: translate(var(--targetX), var(--targetY)) scale(1);
    opacity: 1;
  }
`;

const ChipContainer = styled.div<{
  startPosition: { x: number; y: number };
  endPosition: { x: number; y: number };
  animationType: 'bet' | 'win';
  delay: number;
}>`
  position: absolute;
  left: ${props => props.startPosition.x}px;
  top: ${props => props.startPosition.y}px;
  --targetX: ${props => props.animationType === 'bet' 
    ? props.endPosition.x - props.startPosition.x 
    : props.endPosition.x - props.startPosition.x}px;
  --targetY: ${props => props.animationType === 'bet' 
    ? props.endPosition.y - props.startPosition.y 
    : props.endPosition.y - props.startPosition.y}px;
  animation: ${props => props.animationType === 'bet' ? moveToCenter : moveFromCenter} 0.8s forwards;
  animation-delay: ${props => props.delay}s;
  z-index: 50;
`;

const Chip = styled.div<{ value: number }>`
  width: 35px;
  height: 35px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 12px;
  color: white;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  border: 2px dashed white;
  background-color: ${props => {
    // Different colors for different chip values
    switch (true) {
      case props.value <= 5: return '#3498db'; // blue for low value
      case props.value <= 25: return '#2ecc71'; // green for medium value
      case props.value <= 100: return '#f39c12'; // orange for high value
      default: return '#e74c3c'; // red for very high value
    }
  }};
  position: relative;
  
  &:before {
    content: '';
    position: absolute;
    width: 27px;
    height: 27px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.7);
    top: 2px;
    left: 2px;
  }
`;

const ChipValue = styled.span`
  position: relative;
  z-index: 2;
`;

interface ChipAnimationProps {
  amount: number;
  startPosition: { x: number; y: number };
  endPosition: { x: number; y: number };
  animationType: 'bet' | 'win';
  onComplete?: () => void;
}

export const ChipAnimation: React.FC<ChipAnimationProps> = ({
  amount,
  startPosition,
  endPosition,
  animationType,
  onComplete
}) => {
  const [visible, setVisible] = useState(true);
  
  // Determine how many chips to show based on bet amount
  const getChipCount = (amount: number) => {
    if (amount <= 10) return 1;
    if (amount <= 50) return 2;
    if (amount <= 200) return 3;
    return 4; // For large bets
  };
  
  const chipCount = getChipCount(amount);
  const chipValue = Math.max(1, Math.floor(amount / chipCount));
  const chips = Array.from({ length: chipCount }, (_, index) => ({
    value: chipValue,
    delay: index * 0.1
  }));

  useEffect(() => {
    // Hide chips and call onComplete after animation finishes
    const timeout = setTimeout(() => {
      setVisible(false);
      if (onComplete) onComplete();
    }, 1000 + chipCount * 100); // Animation time + delays
    
    return () => clearTimeout(timeout);
  }, [chipCount, onComplete]);

  if (!visible) return null;

  return (
    <>
      {chips.map((chip, index) => (
        <ChipContainer
          key={index}
          startPosition={startPosition}
          endPosition={endPosition}
          animationType={animationType}
          delay={chip.delay}
        >
          <Chip value={chip.value}>
            <ChipValue>{chip.value}</ChipValue>
          </Chip>
        </ChipContainer>
      ))}
    </>
  );
}; 