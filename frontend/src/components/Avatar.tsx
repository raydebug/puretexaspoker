import React from 'react';
import styled from 'styled-components';
import { Avatar as AvatarType } from '../types/shared';

interface AvatarProps {
  avatar: AvatarType;
  size?: number;
}

const AvatarContainer = styled.div<{ size: number }>`
  width: ${props => props.size}px;
  height: ${props => props.size}px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${props => props.theme.colors.background};
  border: 2px solid ${props => props.theme.colors.border};
`;

const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const DefaultAvatar = styled.div<{ backgroundColor: string }>`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${props => props.backgroundColor};
`;

const InitialsAvatar = styled(DefaultAvatar)`
  font-size: 1.2em;
  font-weight: bold;
  color: white;
`;

export const Avatar: React.FC<AvatarProps> = ({ avatar, size = 40 }) => {
  const renderAvatarContent = () => {
    switch (avatar.type) {
      case 'image':
        return avatar.imageUrl ? (
          <AvatarImage src={avatar.imageUrl} alt="Player avatar" />
        ) : (
          <DefaultAvatar backgroundColor={avatar.color}>
            <svg width="60%" height="60%" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
            </svg>
          </DefaultAvatar>
        );

      case 'initials':
        return avatar.initials ? (
          <InitialsAvatar backgroundColor={avatar.color}>
            {avatar.initials}
          </InitialsAvatar>
        ) : (
          <DefaultAvatar backgroundColor={avatar.color}>
            <svg width="60%" height="60%" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
            </svg>
          </DefaultAvatar>
        );

      default:
        return (
          <DefaultAvatar backgroundColor={avatar.color}>
            <svg width="60%" height="60%" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
            </svg>
          </DefaultAvatar>
        );
    }
  };

  return (
    <AvatarContainer size={size}>
      {renderAvatarContent()}
    </AvatarContainer>
  );
}; 