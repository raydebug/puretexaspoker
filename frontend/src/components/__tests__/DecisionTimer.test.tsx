import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DecisionTimer from '../DecisionTimer';

// Mock timers for testing
jest.useFakeTimers();

describe('DecisionTimer Component', () => {
  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('Basic Functionality', () => {
    it('should render timer when active', () => {
      render(
        <DecisionTimer
          timeLimit={10}
          isActive={true}
          playerId="test-player"
          playerName="TestPlayer"
        />
      );

      expect(screen.getByTestId('decision-timer')).toBeInTheDocument();
      expect(screen.getByTestId('countdown-circle')).toBeInTheDocument();
      expect(screen.getByTestId('timer-seconds')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('should not render timer when inactive', () => {
      render(
        <DecisionTimer
          timeLimit={10}
          isActive={false}
          playerId="test-player"
          playerName="TestPlayer"
        />
      );

      const timer = screen.getByTestId('decision-timer');
      expect(timer).toHaveStyle('opacity: 0');
      expect(timer).toHaveStyle('visibility: hidden');
    });

    it('should countdown from specified time limit', async () => {
      render(
        <DecisionTimer
          timeLimit={10}
          isActive={true}
          playerId="test-player"
          playerName="TestPlayer"
        />
      );

      // Initial state
      expect(screen.getByText('10')).toBeInTheDocument();

      // After 1 second
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(screen.getByText('9')).toBeInTheDocument();

      // After 5 seconds total
      act(() => {
        jest.advanceTimersByTime(4000);
      });
      expect(screen.getByText('5')).toBeInTheDocument();

      // After 10 seconds total (timeout)
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should call onTimeout when timer reaches zero', async () => {
      const mockOnTimeout = jest.fn();
      
      render(
        <DecisionTimer
          timeLimit={3}
          isActive={true}
          playerId="test-player"
          playerName="TestPlayer"
          onTimeout={mockOnTimeout}
        />
      );

      // Fast forward to timeout
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // Wait for timeout callback (has 100ms delay)
      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(mockOnTimeout).toHaveBeenCalledTimes(1);
    });

    it('should reset timer when becoming active', () => {
      const { rerender } = render(
        <DecisionTimer
          timeLimit={10}
          isActive={false}
          playerId="test-player"
          playerName="TestPlayer"
        />
      );

      // Make timer active
      rerender(
        <DecisionTimer
          timeLimit={10}
          isActive={true}
          playerId="test-player"
          playerName="TestPlayer"
        />
      );

      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('should stop countdown when becoming inactive', () => {
      const { rerender } = render(
        <DecisionTimer
          timeLimit={10}
          isActive={true}
          playerId="test-player"
          playerName="TestPlayer"
        />
      );

      // Let timer run for 3 seconds
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      expect(screen.getByText('7')).toBeInTheDocument();

      // Make timer inactive
      rerender(
        <DecisionTimer
          timeLimit={10}
          isActive={false}
          playerId="test-player"
          playerName="TestPlayer"
        />
      );

      // Timer should not continue
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      
      // Timer should reset to original time when inactive
      expect(screen.getByText('10')).toBeInTheDocument();
    });
  });

  describe('Visual States and Colors', () => {
    it('should show normal color state initially', () => {
      render(
        <DecisionTimer
          timeLimit={10}
          isActive={true}
          playerId="test-player"
          playerName="TestPlayer"
        />
      );

      const timerText = screen.getByTestId('timer-seconds');
      // Normal state should have green color (#4CAF50)
      expect(timerText).toHaveStyle('color: #4CAF50');
    });

    it('should change to warning color at 5 seconds', () => {
      render(
        <DecisionTimer
          timeLimit={10}
          isActive={true}
          playerId="test-player"
          playerName="TestPlayer"
        />
      );

      // Fast forward to 5 seconds remaining
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      const timerText = screen.getByTestId('timer-seconds');
      // Warning state should have yellow color (#FFD93D)
      expect(timerText).toHaveStyle('color: #FFD93D');
    });

    it('should change to critical color at 2 seconds', () => {
      render(
        <DecisionTimer
          timeLimit={10}
          isActive={true}
          playerId="test-player"
          playerName="TestPlayer"
        />
      );

      // Fast forward to 2 seconds remaining
      act(() => {
        jest.advanceTimersByTime(8000);
      });

      const timerText = screen.getByTestId('timer-seconds');
      // Critical state should have red color (#FF6B6B)
      expect(timerText).toHaveStyle('color: #FF6B6B');
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <DecisionTimer
          timeLimit={10}
          isActive={true}
          playerId="test-player"
          playerName="TestPlayer"
        />
      );

      const timer = screen.getByTestId('decision-timer');
      expect(timer).toHaveAttribute('role', 'timer');
      expect(timer).toHaveAttribute('aria-label', '10 seconds remaining to make decision');
      expect(timer).toHaveAttribute('aria-live', 'polite');
    });

    it('should update aria-label as time changes', () => {
      render(
        <DecisionTimer
          timeLimit={10}
          isActive={true}
          playerId="test-player"
          playerName="TestPlayer"
        />
      );

      const timer = screen.getByTestId('decision-timer');
      expect(timer).toHaveAttribute('aria-label', '10 seconds remaining to make decision');

      // After 3 seconds
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(timer).toHaveAttribute('aria-label', '7 seconds remaining to make decision');
    });

    it('should provide screen reader updates at appropriate intervals', () => {
      render(
        <DecisionTimer
          timeLimit={10}
          isActive={true}
          playerId="test-player"
          playerName="TestPlayer"
        />
      );

      // Should announce at 10 seconds (multiple of 5)
      expect(screen.getByText(/10 seconds remaining for TestPlayer to decide/)).toBeInTheDocument();

      // Fast forward to 5 seconds (should announce)
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      expect(screen.getByText(/5 seconds remaining for TestPlayer to decide/)).toBeInTheDocument();

      // Fast forward to 3 seconds (should announce - final 3)
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      expect(screen.getByText(/3 seconds remaining for TestPlayer to decide/)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle different time limits', () => {
      const { rerender } = render(
        <DecisionTimer
          timeLimit={5}
          isActive={true}
          playerId="test-player"
          playerName="TestPlayer"
        />
      );

      expect(screen.getByText('5')).toBeInTheDocument();

      rerender(
        <DecisionTimer
          timeLimit={30}
          isActive={true}
          playerId="test-player"
          playerName="TestPlayer"
        />
      );

      expect(screen.getByText('30')).toBeInTheDocument();
    });

    it('should not call onTimeout if timer becomes inactive before expiring', () => {
      const mockOnTimeout = jest.fn();
      
      const { rerender } = render(
        <DecisionTimer
          timeLimit={5}
          isActive={true}
          playerId="test-player"
          playerName="TestPlayer"
          onTimeout={mockOnTimeout}
        />
      );

      // Let timer run for 3 seconds
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // Make timer inactive before timeout
      rerender(
        <DecisionTimer
          timeLimit={5}
          isActive={false}
          playerId="test-player"
          playerName="TestPlayer"
          onTimeout={mockOnTimeout}
        />
      );

      // Continue time to what would have been timeout
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(mockOnTimeout).not.toHaveBeenCalled();
    });

    it('should handle missing optional props gracefully', () => {
      render(
        <DecisionTimer
          isActive={true}
        />
      );

      // Should use default timeLimit of 10
      expect(screen.getByText('10')).toBeInTheDocument();
      
      // Should render without crashing even without onTimeout, playerId, or playerName
      expect(screen.getByTestId('decision-timer')).toBeInTheDocument();
    });
  });

  describe('Performance and Memory', () => {
    it('should clean up timers when unmounting', () => {
      const { unmount } = render(
        <DecisionTimer
          timeLimit={10}
          isActive={true}
          playerId="test-player"
          playerName="TestPlayer"
        />
      );

      // Start the timer
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      unmount();

      // No timers should be running after unmount
      expect(jest.getTimerCount()).toBe(0);
    });

    it('should handle rapid state changes without memory leaks', () => {
      const { rerender } = render(
        <DecisionTimer
          timeLimit={10}
          isActive={false}
          playerId="test-player"
          playerName="TestPlayer"
        />
      );

      // Rapidly toggle active state
      for (let i = 0; i < 10; i++) {
        rerender(
          <DecisionTimer
            timeLimit={10}
            isActive={i % 2 === 0}
            playerId="test-player"
            playerName="TestPlayer"
          />
        );
      }

      // Should not have excessive timers
      expect(jest.getTimerCount()).toBeLessThanOrEqual(1);
    });
  });
}); 