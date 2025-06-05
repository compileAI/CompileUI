import { render, screen } from '@testing-library/react';
import DemoHomeClient from '@/components/DemoHome';

jest.mock('@/components/ArticleGrid', () => () => <div data-testid="grid" />);
jest.mock('@/components/DemoHeader', () => () => <div data-testid="header">header</div>);

describe('DemoHomeClient', () => {
  it('renders header and grid', () => {
    render(<DemoHomeClient />);
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('grid')).toBeInTheDocument();
  });
});
