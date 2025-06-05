import { render, screen, fireEvent } from '@testing-library/react';
import * as Accordion from '@radix-ui/react-accordion';
import DemoArticleAccordionItem from '@/components/DemoArticleAccordionItem';
import { useRouter } from 'next/navigation';
import { sampleArticle } from '../test/testUtils';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('DemoArticleAccordionItem', () => {
  const push = jest.fn();

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ push });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function renderItem() {
    return render(
      <Accordion.Root type="single">
        <DemoArticleAccordionItem article={sampleArticle} formattedDate="Jan 1" />
      </Accordion.Root>
    );
  }

  it('navigates to article page on double click', () => {
    renderItem();
    const title = screen.getByText(sampleArticle.title);
    fireEvent.doubleClick(title);
    expect(push).toHaveBeenCalledWith(`/demo/${sampleArticle.article_id}`);
  });

  it('appends message when provided', () => {
    renderItem();
    // open accordion to reveal input
    fireEvent.click(screen.getByText(sampleArticle.title));
    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: 'hello' } });
    fireEvent.click(screen.getByText('Chat'));
    expect(push).toHaveBeenCalledWith(
      `/demo/${sampleArticle.article_id}?message=hello`
    );
  });
});
