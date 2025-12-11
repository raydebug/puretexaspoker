import { createGlobalStyle, css } from 'styled-components';

// Media query breakpoints
export const breakpoints = {
  xs: '480px',
  sm: '576px',
  md: '768px',
  lg: '992px',
  xl: '1200px'
};

// Media query mixins
export const media = {
  xs: (strings: TemplateStringsArray, ...values: any[]) => css`
    @media (max-width: ${breakpoints.xs}) {
      ${css(strings, ...values)}
    }
  `,
  sm: (strings: TemplateStringsArray, ...values: any[]) => css`
    @media (max-width: ${breakpoints.sm}) {
      ${css(strings, ...values)}
    }
  `,
  md: (strings: TemplateStringsArray, ...values: any[]) => css`
    @media (max-width: ${breakpoints.md}) {
      ${css(strings, ...values)}
    }
  `,
  lg: (strings: TemplateStringsArray, ...values: any[]) => css`
    @media (max-width: ${breakpoints.lg}) {
      ${css(strings, ...values)}
    }
  `,
  xl: (strings: TemplateStringsArray, ...values: any[]) => css`
    @media (max-width: ${breakpoints.xl}) {
      ${css(strings, ...values)}
    }
  `
};

// Color palette
export const colors = {
  primary: '#1b4d3e',    // Dark green
  secondary: '#4caf50',  // Light green
  accent: '#ffd700',     // Gold
  background: '#0a1c15', // Very dark green
  text: '#ffffff',
  textDark: '#0a1c15',
  error: '#ff5555',
  success: '#4caf50',
  warning: '#ff9800',
  info: '#2196f3',
  dark: 'rgba(0, 0, 0, 0.8)',
  light: 'rgba(255, 255, 255, 0.8)'
};

// Typography
export const typography = {
  fontFamily: "'Roboto', 'Helvetica Neue', sans-serif",
  fontSize: {
    xs: '0.75rem',  // 12px
    sm: '0.875rem', // 14px
    md: '1rem',     // 16px
    lg: '1.25rem',  // 20px
    xl: '1.5rem',   // 24px
    xxl: '2rem'     // 32px
  },
  fontWeight: {
    light: 300,
    regular: 400,
    medium: 500,
    bold: 700
  }
};

// Z-index levels
export const zIndex = {
  table: 1,
  cards: 2,
  chips: 3,
  players: 4,
  seatMenu: 50,
  modal: 100,
  tooltip: 150,
  soundControls: 200
};

// Global styles
export const GlobalStyles = createGlobalStyle`
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    font-size: 16px;
    scroll-behavior: smooth;
  }

  body {
    font-family: ${typography.fontFamily};
    background-color: ${colors.background};
    color: ${colors.text};
    line-height: 1.5;
    overflow-x: hidden;
  }

  h1, h2, h3, h4, h5, h6 {
    font-weight: ${typography.fontWeight.bold};
    margin-bottom: 1rem;
  }

  h1 {
    font-size: ${typography.fontSize.xxl};
  }

  h2 {
    font-size: ${typography.fontSize.xl};
  }

  h3 {
    font-size: ${typography.fontSize.lg};
  }

  p {
    margin-bottom: 1rem;
  }

  button, input, select, textarea {
    font-family: inherit;
    font-size: inherit;
  }

  button {
    cursor: pointer;
  }

  a {
    color: ${colors.secondary};
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }

  /* Mobile responsiveness */
  ${media.md`
    html {
      font-size: 14px;
    }
  `}

  ${media.sm`
    html {
      font-size: 12px;
    }
  `}

  /* Custom scrollbar */
  ::-webkit-scrollbar {
    width: 6px;
  }

  ::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
  }

  ::-webkit-scrollbar-thumb {
    background: ${colors.secondary};
    border-radius: 3px;
  }

  /* Animation for dealing cards */
  @keyframes dealCard {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Animation for chip toss */
  @keyframes chipToss {
    0% {
      transform: translateY(0) scale(1);
    }
    50% {
      transform: translateY(-40px) scale(1.2);
    }
    100% {
      transform: translateY(0) scale(1);
    }
  }
`;

export default GlobalStyles; 