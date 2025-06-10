import React, { useEffect } from 'react';
import styled from 'styled-components';

interface WelcomePopupProps {
  tableName: string;
  tableId: number;
  onComplete: () => void;
  isVisible: boolean;
}

const PopupOverlay = styled.div<{ $visible: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(6px);
  opacity: ${props => props.$visible ? 1 : 0};
  visibility: ${props => props.$visible ? 'visible' : 'hidden'};
  transition: opacity 0.3s ease, visibility 0.3s ease;
`;

const PopupContent = styled.div<{ $visible: boolean }>`
  background: linear-gradient(135deg, #1b4d3e, #0d2c24);
  padding: 3rem 2rem;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  border: 3px solid #ffd700;
  color: white;
  text-align: center;
  max-width: 500px;
  width: 90%;
  transform: ${props => props.$visible ? 'translateY(0) scale(1)' : 'translateY(-50px) scale(0.95)'};
  transition: transform 0.3s ease;
`;

const WelcomeTitle = styled.h1`
  color: #ffd700;
  font-size: 2.5rem;
  margin: 0 0 1rem 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.7);
  font-weight: bold;
`;

const TableMessage = styled.div`
  font-size: 1.5rem;
  color: #e0e0e0;
  margin-bottom: 2rem;
  line-height: 1.4;
`;

const TableHighlight = styled.span`
  color: #ffd700;
  font-weight: bold;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
`;

const LoadingDots = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const Dot = styled.div<{ $delay: number }>`
  width: 8px;
  height: 8px;
  background-color: #ffd700;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
  animation-delay: ${props => props.$delay}s;

  @keyframes bounce {
    0%, 80%, 100% {
      transform: scale(0);
    }
    40% {
      transform: scale(1);
    }
  }
`;

export const WelcomePopup: React.FC<WelcomePopupProps> = ({ 
  tableName, 
  tableId, 
  onComplete, 
  isVisible 
}) => {
  useEffect(() => {
    if (isVisible) {
      // Auto-close after 2.5 seconds
      const timer = setTimeout(() => {
        onComplete();
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  return (
    <PopupOverlay $visible={isVisible} data-testid="welcome-popup">
      <PopupContent $visible={isVisible}>
        <WelcomeTitle>Welcome!</WelcomeTitle>
        <TableMessage>
          You're joining <TableHighlight>table-{tableId}</TableHighlight>
          <br />
          <strong>{tableName}</strong>
        </TableMessage>
        <LoadingDots>
          <Dot $delay={0} />
          <Dot $delay={0.2} />
          <Dot $delay={0.4} />
        </LoadingDots>
      </PopupContent>
    </PopupOverlay>
  );
}; 