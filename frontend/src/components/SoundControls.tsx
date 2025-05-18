import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { soundService } from '../services/soundService';

const SoundControlsContainer = styled.div`
  position: absolute;
  bottom: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background-color: rgba(0, 0, 0, 0.7);
  border-radius: 20px;
  color: white;
  z-index: 1000;
`;

const SoundButton = styled.button<{ isMuted: boolean }>`
  background: none;
  border: none;
  color: ${props => props.isMuted ? '#ff5555' : '#ffffff'};
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: ${props => props.isMuted ? 'rgba(255, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)'};
  transition: all 0.3s ease;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.3);
  }

  &:focus {
    outline: none;
  }
`;

const VolumeSlider = styled.input`
  -webkit-appearance: none;
  width: 80px;
  height: 8px;
  background: #4c4c4c;
  border-radius: 4px;
  outline: none;
  
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ffffff;
    cursor: pointer;
  }
  
  &::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ffffff;
    cursor: pointer;
    border: none;
  }
`;

const SoundControls: React.FC = () => {
  const [isMuted, setIsMuted] = useState(soundService.isSoundMuted());
  const [volume, setVolume] = useState(soundService.getVolume());
  
  // Initialize sound service on component mount
  useEffect(() => {
    soundService.initialize();
  }, []);
  
  const handleToggleMute = () => {
    const muted = soundService.toggleMute();
    setIsMuted(muted);
    
    // Play test sound when unmuting
    if (!muted) {
      soundService.play('buttonClick');
    }
  };
  
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    soundService.setVolume(newVolume);
    
    // Play test sound when changing volume (if not muted)
    if (!isMuted) {
      soundService.play('buttonClick');
    }
  };
  
  const getVolumeIcon = () => {
    if (isMuted) return '🔇';
    if (volume < 0.33) return '🔈';
    if (volume < 0.66) return '🔉';
    return '🔊';
  };
  
  return (
    <SoundControlsContainer>
      <SoundButton 
        isMuted={isMuted} 
        onClick={handleToggleMute}
        aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
      >
        {getVolumeIcon()}
      </SoundButton>
      <VolumeSlider 
        type="range" 
        min="0" 
        max="1" 
        step="0.01" 
        value={volume}
        onChange={handleVolumeChange}
        aria-label="Volume"
      />
    </SoundControlsContainer>
  );
};

export default SoundControls; 