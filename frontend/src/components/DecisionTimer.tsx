import React, { useState, useEffect } from 'react';
import styled, { css, keyframes } from 'styled-components';

interface DecisionTimerProps {
  timeLimit?: number; // in seconds, default 10
  onTimeout?: () => void;
  isActive?: boolean;
  playerId?: string;
  playerName?: string;
}

const pulseAnimation = keyframes`
  0% { 
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
  }
  50% { 
    transform: scale(1.05);
    box-shadow: 0 0 0 5px rgba(76, 175, 80, 0.3);
  }
  100% { 
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
  }
`;

const TimerContainer = styled.div.withConfig({
  shouldForwardProp: (prop) => !['isVisible'].includes(prop)
})<{ isVisible: boolean }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  opacity: ${props => props.isVisible ? 1 : 0};
  visibility: ${props => props.isVisible ? 'visible' : 'hidden'};
  transition: opacity 0.3s ease, visibility 0.3s ease;
  z-index: 10;
`;

const CircleTimer = styled.div.withConfig({
  shouldForwardProp: (prop) => !['percentage', 'colorState'].includes(prop)
})<{ 
  percentage: number; 
  colorState: 'normal' | 'warning' | 'critical' 
}>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  position: relative;
  background: conic-gradient(
    ${props => {
      switch (props.colorState) {
        case 'critical': return '#F44336';
        case 'warning': return '#FFC107';
        default: return '#4CAF50';
      }
    }} ${props => props.percentage}%, 
    rgba(255, 255, 255, 0.2) ${props => props.percentage}%
  );
  border: 2px solid rgba(255, 255, 255, 0.3);
  animation: ${props => props.colorState === 'critical' ? css`${pulseAnimation} 0.5s ease-in-out infinite` : 'none'};
  
  &::before {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    right: 2px;
    bottom: 2px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.8);
  }
`;

const TimerText = styled.div.withConfig({
  shouldForwardProp: (prop) => !['colorState'].includes(prop)
})<{ colorState: 'normal' | 'warning' | 'critical' }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: ${props => {
    switch (props.colorState) {
      case 'critical': return '#FF6B6B';
      case 'warning': return '#FFD93D';
      default: return '#4CAF50';
    }
  }};
  font-size: 12px;
  font-weight: bold;
  font-family: 'Arial', sans-serif;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
  z-index: 2;
`;

const AccessibilityText = styled.div`
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  overflow: hidden;
`;

export const DecisionTimer: React.FC<DecisionTimerProps> = ({
  timeLimit = 10,
  onTimeout,
  isActive = false,
  playerId,
  playerName
}) => {
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (isActive && !isRunning) {
      setTimeRemaining(timeLimit);
      setIsRunning(true);
    } else if (!isActive && isRunning) {
      setIsRunning(false);
      setTimeRemaining(timeLimit);
    }
  }, [isActive, timeLimit, isRunning]);

  useEffect(() => {
    if (!isRunning || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setIsRunning(false);
          if (onTimeout) {
            setTimeout(onTimeout, 100); // Small delay to show 0
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, timeRemaining, onTimeout]);

  const percentage = (timeRemaining / timeLimit) * 100;
  
  const getColorState = (): 'normal' | 'warning' | 'critical' => {
    if (timeRemaining <= 2) return 'critical';
    if (timeRemaining <= 5) return 'warning';
    return 'normal';
  };

  const colorState = getColorState();

  return (
    <TimerContainer 
      isVisible={isActive && isRunning}
      data-testid="decision-timer"
      role="timer"
      aria-label={`${timeRemaining} seconds remaining to make decision`}
      aria-live="polite"
    >
      <CircleTimer 
        percentage={percentage} 
        colorState={colorState}
        data-testid="countdown-circle"
      />
      <TimerText 
        colorState={colorState}
        data-testid="timer-seconds"
        className="timer-text"
      >
        {timeRemaining}
      </TimerText>
      
      {/* Screen reader accessibility */}
      <AccessibilityText aria-live="polite">
        {isActive && isRunning && (timeRemaining <= 5 || timeRemaining % 5 === 0) && 
          `${timeRemaining} seconds remaining for ${playerName || 'player'} to decide`
        }
      </AccessibilityText>
    </TimerContainer>
  );
};

export default DecisionTimer; 