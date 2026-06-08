import { Fragment } from 'react';
import type { IWordMatch } from '@/src/core/types';
import TransLine from './TransLine';

/**
 * Renders one text node's content as a single React tree: plain text segments
 * interleaved with a TransLine per matched word. One root per text node (instead
 * of one root per word) keeps React mount cost proportional to nodes, not match
 * count — the dominant JS-side cost in the page scan.
 */
export default function HighlightedText({
  text,
  matches,
}: {
  text: string;
  matches: IWordMatch[];
}) {
  const parts: React.ReactNode[] = [];
  let last = 0;

  matches.forEach((match, i) => {
    if (match.index > last) {
      parts.push(
        <Fragment key={`t${i}`}>
          {text.slice(last, match.index)}
        </Fragment>,
      );
    }
    parts.push(
      <TransLine
        key={`w${i}`}
        originalWord={match.word}
        lowerCaseWord={match.word.toLowerCase()}
      />,
    );
    last = match.end;
  });

  if (last < text.length) {
    parts.push(
      <Fragment key='tail'>{text.slice(last)}</Fragment>,
    );
  }

  return <>{parts}</>;
}
