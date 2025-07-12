import { render, screen } from '@testing-library/react';
import Timeline from './Timeline';

// Mock axios
jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve({ data: { events: [] } }))
}));

test('renders timeline header', () => {
  render(<Timeline />);
  const headerElement = screen.getByText(/Timeline/i);
  expect(headerElement).toBeInTheDocument();
});

test('renders timeline description', () => {
  render(<Timeline />);
  const descriptionElement = screen.getByText(/View your life events chronologically/i);
  expect(descriptionElement).toBeInTheDocument();
}); 