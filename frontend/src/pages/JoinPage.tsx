import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import Cookies from 'js-cookie';

const Container = styled.div`
  min-height: 100vh;
  background-color: #1a0f0f;
  padding: 2rem;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const LoginForm = styled.div`
  background: rgba(0, 0, 0, 0.85);
  border-radius: 16px;
  padding: 2rem;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  border: 1px solid #8b0000;
`;

const Title = styled.h1`
  font-size: 2rem;
  color: #ffd700;
  text-align: center;
  margin-bottom: 2rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
`;

const InputGroup = styled.div`
  margin-bottom: 2rem;
`;

const Label = styled.label`
  display: block;
  color: #ffd700;
  margin-bottom: 0.5rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 4px;
  border: 1px solid #ffd700;
  background: rgba(0, 0, 0, 0.8);
  color: #ffd700;
  font-size: 1rem;
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.2);
  }
`;

const Button = styled.button`
  width: 100%;
  padding: 1rem;
  border-radius: 4px;
  border: 1px solid #2c8a3d;
  background: #2c8a3d;
  color: #ffd700;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #37a34a;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }
`;

const ErrorMessage = styled.div`
  color: #ff4444;
  text-align: center;
  margin-top: 1rem;
`;

export const JoinPage: React.FC = () => {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nickname.trim()) {
      setError('Please enter your nickname');
      return;
    }
    
    // Store nickname in cookies for persistence
    Cookies.set('playerNickname', nickname, { expires: 7 });
    
    // Navigate to the lobby
    navigate('/');
  };
  
  return (
    <Container>
      <LoginForm>
        <Title>Texas Hold'em Poker</Title>
        
        <form onSubmit={handleSubmit}>
          <InputGroup>
            <Label htmlFor="nickname">Your Nickname</Label>
            <Input 
              id="nickname"
              type="text" 
              value={nickname} 
              onChange={(e) => {
                setNickname(e.target.value);
                setError('');
              }}
              placeholder="Enter your nickname"
              autoFocus
              data-testid="nickname-input"
            />
          </InputGroup>
          
          {error && <ErrorMessage>{error}</ErrorMessage>}
          
          <Button type="submit" data-testid="join-button">Join Game</Button>
        </form>
      </LoginForm>
    </Container>
  );
}; 