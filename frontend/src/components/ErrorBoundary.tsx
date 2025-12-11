import React, { Component, ReactNode } from 'react';
import styled from 'styled-components';

interface ErrorInfo {
  componentStack: string;
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

const ErrorContainer = styled.div`
  background: linear-gradient(145deg, #2c1810, #4a2c1a);
  border: 1px solid #d32f2f;
  border-radius: 10px;
  padding: 2rem;
  margin: 1rem 0;
  text-align: center;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
`;

const ErrorTitle = styled.h2`
  color: #ff5252;
  font-size: 1.5rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

const ErrorMessage = styled.div`
  color: #ffcdd2;
  font-size: 1rem;
  margin-bottom: 1.5rem;
  line-height: 1.5;
`;

const ErrorDetails = styled.details`
  background: rgba(0, 0, 0, 0.3);
  border-radius: 5px;
  padding: 1rem;
  margin: 1rem 0;
  text-align: left;
`;

const ErrorSummary = styled.summary`
  color: #ff8a80;
  cursor: pointer;
  font-weight: 600;
  padding: 0.5rem;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }
`;

const ErrorStack = styled.pre`
  color: #ffab91;
  font-size: 0.8rem;
  white-space: pre-wrap;
  word-break: break-all;
  margin-top: 1rem;
  background: rgba(0, 0, 0, 0.4);
  padding: 1rem;
  border-radius: 3px;
  overflow-x: auto;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  ${props => props.variant === 'primary' ? `
    background: linear-gradient(135deg, #ff5722 0%, #d32f2f 100%);
    color: white;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(255, 87, 34, 0.4);
    }
  ` : `
    background: linear-gradient(135deg, #757575 0%, #424242 100%);
    color: white;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(117, 117, 117, 0.4);
    }
  `}
  
  &:disabled {
    background: #555;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const RetryInfo = styled.div`
  color: #ffcc02;
  font-size: 0.9rem;
  margin-bottom: 1rem;
  padding: 0.5rem;
  background: rgba(255, 204, 2, 0.1);
  border-radius: 5px;
`;

export class ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      errorInfo
    });

    // Call the onError prop if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Track error for monitoring
    console.error('React Error Boundary:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount
    });
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  handleRetry = () => {
    const newRetryCount = this.state.retryCount + 1;
    
    if (newRetryCount >= 3) {
      alert('Maximum retry attempts reached. Please refresh the page manually.');
      return;
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: newRetryCount
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleReportError = () => {
    const { error, errorInfo } = this.state;
    const reportData = {
      message: error?.message || 'Unknown error',
      stack: error?.stack || 'No stack trace',
      componentStack: errorInfo?.componentStack || 'No component stack',
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };

    // Copy error details to clipboard
    navigator.clipboard.writeText(JSON.stringify(reportData, null, 2))
      .then(() => {
        alert('Error details copied to clipboard. Please paste this information when reporting the bug.');
      })
      .catch(() => {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = JSON.stringify(reportData, null, 2);
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('Error details copied to clipboard. Please paste this information when reporting the bug.');
      });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, retryCount } = this.state;

      return (
        <ErrorContainer>
          <ErrorTitle>
            🚨 Something went wrong
          </ErrorTitle>
          
          <ErrorMessage>
            {error?.message || 'An unexpected error occurred in the application.'}
          </ErrorMessage>

          {retryCount > 0 && (
            <RetryInfo>
              Retry attempt #{retryCount}/3
            </RetryInfo>
          )}

          <ButtonGroup>
            <Button 
              variant="primary" 
              onClick={this.handleRetry}
              disabled={retryCount >= 3}
            >
              {retryCount >= 3 ? 'Max Retries Reached' : 'Try Again'}
            </Button>
            
            <Button 
              variant="secondary" 
              onClick={this.handleReload}
            >
              Reload Page
            </Button>
            
            <Button 
              variant="secondary" 
              onClick={this.handleReportError}
            >
              Report Error
            </Button>
          </ButtonGroup>

          <ErrorDetails>
            <ErrorSummary>
              🔍 Technical Details (Click to expand)
            </ErrorSummary>
            
            <div>
              <strong>Error:</strong> {error?.name || 'Unknown Error'}
              <br />
              <strong>Message:</strong> {error?.message || 'No message provided'}
              <br />
              <strong>Location:</strong> {window.location.href}
              <br />
              <strong>Time:</strong> {new Date().toLocaleString()}
              
              {error?.stack && (
                <ErrorStack>
                  <strong>Stack Trace:</strong>
                  {error.stack}
                </ErrorStack>
              )}
              
              {errorInfo?.componentStack && (
                <ErrorStack>
                  <strong>Component Stack:</strong>
                  {errorInfo.componentStack}
                </ErrorStack>
              )}
            </div>
          </ErrorDetails>
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
} 