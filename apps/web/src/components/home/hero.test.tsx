import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Hero } from './hero';

describe('Hero', () => {
  it('should render heading', () => {
    render(<Hero />);
    // Text is split across elements, use a more flexible matcher
    expect(screen.getByText(/Turn any website into a/)).toBeInTheDocument();
    expect(screen.getByText(/JSON API/)).toBeInTheDocument();
  });

  it('should render description with Cloudflare mention', () => {
    render(<Hero />);
    expect(screen.getByText(/Cloudflare Browser Rendering/)).toBeInTheDocument();
    expect(screen.getByText(/GPT-4o-mini/)).toBeInTheDocument();
  });

  it('should render AI badge', () => {
    render(<Hero />);
    expect(screen.getByText(/AI-Powered Universal Extractor/)).toBeInTheDocument();
  });

  it('should render Launch Playground button', () => {
    render(<Hero />);
    expect(screen.getByRole('button', { name: /Launch Playground/i })).toBeInTheDocument();
  });

  it('should render Read Documentation link', () => {
    render(<Hero />);
    const docLink = screen.getByRole('link', { name: /Read Documentation/i });
    expect(docLink).toBeInTheDocument();
    expect(docLink).toHaveAttribute('href', '/docs');
  });

  it('should render main heading with highlighted text', () => {
    render(<Hero />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Turn any website into a');
    expect(heading).toHaveTextContent('JSON API');
  });
});
