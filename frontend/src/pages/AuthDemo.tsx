import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { authService, User } from '../services/authService';
import { LoginForm } from '../components/Auth/LoginForm';
import { UserProfile } from '../components/Auth/UserProfile';

const PageContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 50%, #16213e 100%);
  padding: 2rem;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 3rem;
`;

const Title = styled.h1`
  color: #fff;
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Subtitle = styled.p`
  color: #ccc;
  font-size: 1.1rem;
  margin: 0;
`;

const StatusBanner = styled.div<{ isAuthenticated: boolean }>`
  max-width: 600px;
  margin: 0 auto 2rem;
  padding: 1rem 1.5rem;
  border-radius: 10px;
  text-align: center;
  font-weight: 600;
  
  ${props => props.isAuthenticated ? `
    background: linear-gradient(135deg, #51cf66 0%, #40c057 100%);
    color: white;
  ` : `
    background: linear-gradient(135deg, #ffd43b 0%, #fab005 100%);
    color: #333;
  `}
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  
  &::after {
    content: '';
    width: 40px;
    height: 40px;
    border: 4px solid #667eea;
    border-top: 4px solid transparent;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const FeatureGrid = styled.div`
  max-width: 800px;
  margin: 3rem auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
`;

const FeatureCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  padding: 1.5rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
`;

const FeatureIcon = styled.div`
  font-size: 2rem;
  margin-bottom: 1rem;
`;

const FeatureTitle = styled.h3`
  color: #fff;
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
`;

const FeatureDescription = styled.p`
  color: #ccc;
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0;
`;

export const AuthDemo: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated on page load
    const checkAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const userProfile = await authService.getProfile();
          setUser(userProfile);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // If auth check fails, user remains null (not authenticated)
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (loading) {
    return (
      <PageContainer>
        <Header>
          <Title>Texas Hold'em Poker</Title>
          <Subtitle>Authentication System Demo</Subtitle>
        </Header>
        <LoadingSpinner />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Header>
        <Title>Texas Hold'em Poker</Title>
        <Subtitle>Authentication System Demo</Subtitle>
      </Header>

      <StatusBanner isAuthenticated={!!user}>
        {user 
          ? `✅ Welcome back, ${user.displayName}! You are successfully authenticated.`
          : `🔐 Please login or register to continue.`
        }
      </StatusBanner>

      {user ? (
        <UserProfile user={user} onLogout={handleLogout} />
      ) : (
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      )}

      <FeatureGrid>
        <FeatureCard>
          <FeatureIcon>🔐</FeatureIcon>
          <FeatureTitle>JWT Authentication</FeatureTitle>
          <FeatureDescription>
            Secure token-based authentication with automatic refresh and session management.
          </FeatureDescription>
        </FeatureCard>
        
        <FeatureCard>
          <FeatureIcon>👤</FeatureIcon>
          <FeatureTitle>User Profiles</FeatureTitle>
          <FeatureDescription>
            Complete user management with profiles, avatars, and game statistics tracking.
          </FeatureDescription>
        </FeatureCard>
        
        <FeatureCard>
          <FeatureIcon>🎯</FeatureIcon>
          <FeatureTitle>Game Integration</FeatureTitle>
          <FeatureDescription>
            Seamless integration with poker game mechanics and real-time multiplayer features.
          </FeatureDescription>
        </FeatureCard>
        
        <FeatureCard>
          <FeatureIcon>🔒</FeatureIcon>
          <FeatureTitle>Password Security</FeatureTitle>
          <FeatureDescription>
            Industry-standard bcrypt hashing with secure password policies and validation.
          </FeatureDescription>
        </FeatureCard>
      </FeatureGrid>
    </PageContainer>
  );
}; 