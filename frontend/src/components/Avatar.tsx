import React, { useState } from 'react';
import styled from 'styled-components';
import { Avatar as AvatarType } from '../types/shared';

interface AvatarProps {
  avatar: AvatarType;
  size?: 'small' | 'medium' | 'large';
  isActive?: boolean;
  isAway?: boolean;
  allowUpload?: boolean;
  onUpload?: (file: File) => void;
}

const getSizeInPx = (size: 'small' | 'medium' | 'large'): number => {
  switch (size) {
    case 'small': return 32;
    case 'medium': return 48;
    case 'large': return 64;
    default: return 48;
  }
};

interface AvatarContainerProps {
  $size: 'small' | 'medium' | 'large';
  $isActive?: boolean;
  $isAway?: boolean;
}

const AvatarContainer = styled.div<AvatarContainerProps>`
  width: ${props => getSizeInPx(props.$size)}px;
  height: ${props => getSizeInPx(props.$size)}px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${props => props.theme.colors.background};
  border: 2px solid ${props => props.theme.colors.border};
  opacity: ${props => props.$isAway ? 0.5 : 1};
  box-shadow: ${props => props.$isActive ? props.theme.shadows.md : 'none'};
`;

const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

interface DefaultAvatarProps {
  $backgroundColor: string;
}

const DefaultAvatar = styled.div<DefaultAvatarProps>`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${props => props.$backgroundColor};
`;

const InitialsAvatar = styled(DefaultAvatar)`
  font-size: 1.2em;
  font-weight: bold;
  color: white;
`;

const UploadButton = styled.input`
  display: none;
`;

const UploadLabel = styled.label`
  position: absolute;
  bottom: -5px;
  right: -5px;
  background-color: #4caf50;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 2px solid white;
  
  &:hover {
    background-color: #45a049;
  }
`;

const UploadIcon = styled.span`
  color: white;
  font-size: 10px;
  line-height: 1;
`;

export const Avatar: React.FC<AvatarProps> = ({ 
  avatar, 
  size = 'medium', 
  isActive, 
  isAway, 
  allowUpload = false,
  onUpload 
}) => {
  const [uploadId] = useState(() => `avatar-upload-${Math.random()}`);

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onUpload) {
      onUpload(file);
    }
  };

  const renderAvatarContent = () => {
    switch (avatar.type) {
      case 'image':
        return avatar.imageUrl ? (
          <AvatarImage src={avatar.imageUrl} alt="Player avatar" />
        ) : (
          <DefaultAvatar $backgroundColor={avatar.color}>
            <svg width="60%" height="60%" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
            </svg>
          </DefaultAvatar>
        );

      case 'initials':
        return avatar.initials ? (
          <InitialsAvatar $backgroundColor={avatar.color}>
            {avatar.initials}
          </InitialsAvatar>
        ) : (
          <DefaultAvatar $backgroundColor={avatar.color}>
            <svg width="60%" height="60%" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
            </svg>
          </DefaultAvatar>
        );

      default:
        return (
          <DefaultAvatar $backgroundColor={avatar.color}>
            <svg width="60%" height="60%" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
            </svg>
          </DefaultAvatar>
        );
    }
  };

  return (
    <AvatarContainer $size={size} $isActive={isActive} $isAway={isAway} style={{ position: 'relative' }}>
      {renderAvatarContent()}
      {allowUpload && (
        <>
          <UploadButton
            type="file"
            id={uploadId}
            accept="image/*"
            onChange={handleUpload}
            data-testid="avatar-upload"
          />
          <UploadLabel htmlFor={uploadId}>
            <UploadIcon>📷</UploadIcon>
          </UploadLabel>
        </>
      )}
    </AvatarContainer>
  );
}; 