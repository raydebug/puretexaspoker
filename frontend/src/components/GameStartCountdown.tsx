import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';

interface GameStartCountdownProps {
  isActive: boolean;
  onComplete?: () => void;
}

const pulseAnimation = keyframes`
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.8;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.2);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.8;
  }
`;

const fadeOutAnimation = keyframes`
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.8);
  }
`;

const CountdownContainer = styled.div<{ $isVisible: boolean; $isFadingOut: boolean }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 100;
  display: ${props => props.$isVisible ? 'flex' : 'none'};
  flex-direction: column;
  align-items: center;
  justify-content: center;
  
  animation: ${props => {
    if (props.$isFadingOut) {
      return `${fadeOutAnimation} 0.5s ease-out forwards`;
    }
    return `${pulseAnimation} 1s ease-in-out infinite`;
  }};
`;

const CountdownNumber = styled.div`
  font-size: 120px;
  font-weight: bold;
  color: #ffd700;
  text-shadow: 
    0 0 20px rgba(255, 215, 0, 0.8),
    0 0 40px rgba(255, 215, 0, 0.6),
    0 0 60px rgba(255, 215, 0, 0.4),
    3px 3px 0px #000,
    -3px -3px 0px #000,
    3px -3px 0px #000,
    -3px 3px 0px #000;
  line-height: 1;
  margin-bottom: 10px;
`;

const CountdownText = styled.div`
  font-size: 24px;
  font-weight: bold;
  color: #ffffff;
  text-shadow: 
    2px 2px 0px #000,
    -2px -2px 0px #000,
    2px -2px 0px #000,
    -2px 2px 0px #000;
  text-align: center;
  margin-bottom: 20px;
`;

const GameStartText = styled.div`
  font-size: 18px;
  color: #ffd700;
  text-shadow: 
    1px 1px 0px #000,
    -1px -1px 0px #000,
    1px -1px 0px #000,
    -1px 1px 0px #000;
  background: rgba(0, 0, 0, 0.7);
  padding: 8px 16px;
  border-radius: 20px;
  border: 2px solid #ffd700;
`;

const BackgroundOverlay = styled.div<{ $isVisible: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 99;
  display: ${props => props.$isVisible ? 'block' : 'none'};
  backdrop-filter: blur(2px);
`;

export const GameStartCountdown: React.FC<GameStartCountdownProps> = ({ 
  isActive, 
  onComplete 
}) => {
  const [timeLeft, setTimeLeft] = useState(10);
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (isActive && !isVisible) {
      // Reset and start countdown
      setTimeLeft(10);
      setIsVisible(true);
      setIsFadingOut(false);
      console.log('🚀 Game Start Countdown: Starting 10-second countdown');
    }
  }, [isActive, isVisible]);

  useEffect(() => {
    if (!isVisible || !isActive) return;

    if (timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
        console.log(`⏰ Game Start Countdown: ${timeLeft - 1} seconds remaining`);
      }, 1000);

      return () => clearTimeout(timer);
    } else {
      // Countdown finished - start fade out
      console.log('✅ Game Start Countdown: Countdown complete, fading out');
      setIsFadingOut(true);
      
      // Hide completely after fade out animation
      setTimeout(() => {
        setIsVisible(false);
        setIsFadingOut(false);
        onComplete?.();
      }, 500);
    }
  }, [timeLeft, isVisible, isActive, onComplete]);

  // Reset when no longer active
  useEffect(() => {
    if (!isActive && isVisible) {
      setIsVisible(false);
      setIsFadingOut(false);
      setTimeLeft(10);
    }
  }, [isActive, isVisible]);

  const getCountdownText = () => {
    if (timeLeft > 0) {
      return timeLeft <= 3 ? 'GET READY!' : 'GAME STARTING';
    }
    return 'LET\'S PLAY!';
  };

  return (
    <>
      <BackgroundOverlay $isVisible={isVisible} />
      <CountdownContainer 
        $isVisible={isVisible} 
        $isFadingOut={isFadingOut}
        data-testid="game-start-countdown"
      >
        <CountdownText data-testid="countdown-text">
          {getCountdownText()}
        </CountdownText>
        
        <CountdownNumber data-testid="countdown-number">
          {timeLeft > 0 ? timeLeft : '🎮'}
        </CountdownNumber>
        
        <GameStartText data-testid="game-start-text">
          {timeLeft > 0 ? 
            `Starting in ${timeLeft} second${timeLeft !== 1 ? 's' : ''}...` : 
            'Game Started!'
          }
        </GameStartText>
      </CountdownContainer>
    </>
  );
}; 