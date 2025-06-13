import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Modal = styled.div`
  background: #222;
  border-radius: 16px;
  padding: 2rem;
  min-width: 320px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  border: 1px solid #ffd700;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const ModalTitle = styled.h2`
  color: #ffd700;
  margin-bottom: 1rem;
`;

const ModalInput = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 4px;
  border: 1px solid #ffd700;
  background: rgba(0, 0, 0, 0.8);
  color: #ffd700;
  font-size: 1rem;
  margin-bottom: 1rem;
`;

const ModalButton = styled.button`
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
  margin-bottom: 0.5rem;
  &:hover {
    background: #37a34a;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }
  &:disabled {
    background: #666;
    cursor: not-allowed;
    transform: none;
  }
`;

const ModalSkipButton = styled.button`
  width: 100%;
  padding: 0.75rem;
  border-radius: 4px;
  border: 1px solid #666;
  background: transparent;
  color: #ccc;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    border-color: #ffd700;
    color: #ffd700;
  }
`;

const ModalError = styled.div`
  color: #ff4444;
  text-align: center;
  margin-bottom: 1rem;
`;

interface LoginModalProps {
  isOpen: boolean;
  onLogin: (nickname: string) => void;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onLogin, onClose }) => {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNickname('');
      setError('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    if (!nickname.trim()) {
      setError('Please enter your nickname');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Call onLogin but don't wait for it - close modal immediately
      onLogin(nickname.trim());
      
      // Force close modal immediately
      onClose();
      
    } catch (error) {
      setError('Login failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleEscapeKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <ModalOverlay data-testid="nickname-modal" onClick={handleOverlayClick}>
      <Modal>
        <ModalTitle>Enter Your Nickname</ModalTitle>
        <form onSubmit={handleSubmit}>
          <ModalInput
            type="text"
            value={nickname}
            onChange={e => {
              setNickname(e.target.value);
              setError('');
            }}
            placeholder="Your nickname"
            autoFocus
            data-testid="nickname-input"
          />
          {error && <ModalError data-testid="modal-error">{error}</ModalError>}
          <ModalButton type="submit" data-testid="join-button" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in...' : 'Start Playing'}
          </ModalButton>
        </form>
        <ModalSkipButton type="button" onClick={onClose} data-testid="browse-anonymously-button">
          Browse Anonymously
        </ModalSkipButton>
      </Modal>
    </ModalOverlay>
  );
}; 