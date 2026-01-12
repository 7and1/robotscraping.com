import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Home from './page';

describe('Home', () => {
  it('renders hero headline', () => {
    render(<Home />);
    expect(
      screen.getByRole('heading', { name: /Turn any website into a JSON API/i }),
    ).toBeInTheDocument();
  });
});
