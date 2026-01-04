/**
 * App Component Tests
 *
 * TDD: RED phase - Tests for the base App shell
 * Verifies the app renders with correct branding and styling
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App Component', () => {
  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<App />);
      // App should be in the document
      expect(document.body).toBeInTheDocument();
    });

    it('should have the app container with correct test id', () => {
      render(<App />);
      const appContainer = screen.getByTestId('app-container');
      expect(appContainer).toBeInTheDocument();
    });
  });

  describe('Branding', () => {
    it('should display the PolyWolyTroly brand name', () => {
      render(<App />);
      // The brand name should appear somewhere in the app
      expect(screen.getByText(/PolyWolyTroly/i)).toBeInTheDocument();
    });

    it('should display the tagline "Whale Intelligence"', () => {
      render(<App />);
      // There may be multiple instances (header and content), use getAllBy
      const elements = screen.getAllByText(/Whale Intelligence/i);
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  describe('Styling', () => {
    it('should have void black background color', () => {
      render(<App />);
      const appContainer = screen.getByTestId('app-container');
      // Check background is set (exact value depends on CSS loading)
      expect(appContainer).toHaveStyle({ backgroundColor: 'rgb(10, 10, 15)' });
    });

    it('should have primary text color', () => {
      render(<App />);
      const appContainer = screen.getByTestId('app-container');
      expect(appContainer).toHaveStyle({ color: 'rgb(240, 240, 245)' });
    });
  });

  describe('Structure', () => {
    it('should have a main content area', () => {
      render(<App />);
      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
    });
  });
});
