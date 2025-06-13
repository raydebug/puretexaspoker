import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';

const NavContainer = styled.nav`
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 1000;
  display: flex;
  gap: 10px;
`;

const NavLink = styled(Link)<{ $isActive: boolean }>`
  padding: 8px 16px;
  background: ${props => props.$isActive 
    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    : 'rgba(255, 255, 255, 0.1)'
  };
  color: white;
  text-decoration: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
  
  &:hover {
    background: ${props => props.$isActive 
      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      : 'rgba(255, 255, 255, 0.2)'
    };
    transform: translateY(-1px);
  }
`;

export const Navigation: React.FC = () => {
  const location = useLocation();

  return (
    <NavContainer>
      <NavLink to="/" $isActive={location.pathname === '/'}>
        Lobby
      </NavLink>
      <NavLink to="/auth-demo" $isActive={location.pathname === '/auth-demo'}>
        Auth Demo
      </NavLink>
    </NavContainer>
  );
}; 