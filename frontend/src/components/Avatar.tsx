import React from 'react';
import styled from 'styled-components';
import { Avatar as AvatarType } from '../types/game';

interface AvatarContainerProps {
  size: 'small' | 'medium' | 'large';
  isAway?: boolean;
  isActive?: boolean;
}

const AvatarContainer = styled.div<AvatarContainerProps>`
  width: ${props => {
    switch (props.size) {
      case 'small': return '32px';
      case 'medium': return '48px';
      case 'large': return '64px';
      default: return '48px';
    }
  }};
  height: ${props => {
    switch (props.size) {
      case 'small': return '32px';
      case 'medium': return '48px';
      case 'large': return '64px';
      default: return '48px';
    }
  }};
  border-radius: 50%;
  background-color: ${props => props.isAway ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.7)'};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: ${props => {
    switch (props.size) {
      case 'small': return '12px';
      case 'medium': return '18px';
      case 'large': return '24px';
      default: return '18px';
    }
  }};
  border: 2px solid ${props => {
    if (props.isActive) return '#ffd700';
    if (props.isAway) return '#ff9800';
    return '#4caf50';
  }};
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
  
  ${props => props.isActive && `
    box-shadow: 0 0 0 2px #ffd700, 0 0 10px #ffd700;
  `}
`;

const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const DefaultAvatar = styled.div<{ backgroundColor?: string }>`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${props => props.backgroundColor || '#1b4d3e'};
`;

const InitialsAvatar = styled.div<{ backgroundColor?: string }>`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${props => props.backgroundColor || '#1b4d3e'};
  text-transform: uppercase;
`;

interface AvatarProps {
  avatar: AvatarType;
  size?: 'small' | 'medium' | 'large';
  isAway?: boolean;
  isActive?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  avatar,
  size = 'medium',
  isAway = false,
  isActive = false
}) => {
  return (
    <AvatarContainer size={size} isAway={isAway} isActive={isActive}>
      {avatar.type === 'image' && avatar.imageUrl && (
        <AvatarImage src={avatar.imageUrl} alt="Player avatar" />
      )}
      
      {avatar.type === 'initials' && avatar.initials && (
        <InitialsAvatar backgroundColor={avatar.color}>
          {avatar.initials}
        </InitialsAvatar>
      )}
      
      {((avatar.type === 'default') || (!avatar.imageUrl && !avatar.initials)) && (
        <DefaultAvatar backgroundColor={avatar.color}>
          <svg width="60%" height="60%" viewBox="0 0 24 24" fill="white">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </DefaultAvatar>
      )}
    </AvatarContainer>
  );
}; 