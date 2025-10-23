import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders chess tournament director', () => {
  render(<App />);
  const linkElement = screen.getByText(/Chess TD/i);
  expect(linkElement).toBeInTheDocument();
});
