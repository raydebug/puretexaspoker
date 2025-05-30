import React, { useState } from 'react';
import styled from 'styled-components';
import { authService, User } from '../../services/authService';

const ProfileContainer = styled.div`
  max-width: 600px;
  margin: 2rem auto;
  padding: 2rem;
  background: linear-gradient(145deg, #1a1a2e, #16213e);
  border-radius: 15px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const Avatar = styled.div<{ color: string }>`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: ${props => props.color};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
  font-weight: bold;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
`;

const UserInfo = styled.div`
  flex: 1;
`;

const DisplayName = styled.h2`
  color: #fff;
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
`;

const Username = styled.p`
  color: #ccc;
  margin: 0;
  font-size: 0.9rem;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  padding: 1rem;
  border-radius: 10px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 0.25rem;
`;

const StatLabel = styled.div`
  color: #ccc;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  ${props => {
    switch (props.variant) {
      case 'danger':
        return `
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
          color: white;
          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(255, 107, 107, 0.4);
          }
        `;
      case 'secondary':
        return `
          background: rgba(255, 255, 255, 0.1);
          color: #ccc;
          border: 1px solid rgba(255, 255, 255, 0.2);
          &:hover {
            background: rgba(255, 255, 255, 0.15);
            color: #fff;
          }
        `;
      default:
        return `
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
          }
        `;
    }
  }}

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    background: #555;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const ChipCount = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: bold;
  margin-top: 1rem;
  
  &::before {
    content: '🏆';
    font-size: 1.2rem;
  }
`;

interface UserProfileProps {
  user: User;
  onLogout: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ user, onLogout }) => {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await authService.logout();
      onLogout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAvatarInfo = () => {
    try {
      if (user.avatar) {
        const avatarData = JSON.parse(user.avatar);
        return {
          initials: avatarData.initials || user.username.substring(0, 2).toUpperCase(),
          color: avatarData.color || '#667eea'
        };
      }
    } catch (error) {
      // Fallback if avatar parsing fails
    }
    
    return {
      initials: user.username.substring(0, 2).toUpperCase(),
      color: '#667eea'
    };
  };

  const avatarInfo = getAvatarInfo();
  const winRate = user.gamesPlayed > 0 ? (user.gamesWon / user.gamesPlayed * 100).toFixed(1) : '0.0';

  return (
    <ProfileContainer>
      <Header>
        <Avatar color={avatarInfo.color}>
          {avatarInfo.initials}
        </Avatar>
        <UserInfo>
          <DisplayName>{user.displayName}</DisplayName>
          <Username>@{user.username}</Username>
          <ChipCount>
            {user.chips.toLocaleString()} Chips
          </ChipCount>
        </UserInfo>
      </Header>

      <StatsGrid>
        <StatCard>
          <StatValue>{user.gamesPlayed}</StatValue>
          <StatLabel>Games Played</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{user.gamesWon}</StatValue>
          <StatLabel>Games Won</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{winRate}%</StatValue>
          <StatLabel>Win Rate</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{new Date(user.createdAt).toLocaleDateString()}</StatValue>
          <StatLabel>Member Since</StatLabel>
        </StatCard>
      </StatsGrid>

      <ActionButtons>
        <Button variant="primary">
          Edit Profile
        </Button>
        <Button variant="secondary">
          Game History
        </Button>
        <Button variant="danger" onClick={handleLogout} disabled={loading}>
          {loading ? 'Logging out...' : 'Logout'}
        </Button>
      </ActionButtons>
    </ProfileContainer>
  );
}; 