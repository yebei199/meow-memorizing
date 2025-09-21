export interface WordHighlighterProps {
  originalWord: string;
  lowerCaseWord: string;
}

export interface WordHighlighterState {
  isHovered: boolean;
  tooltipPosition: { x: number; y: number };
  hasTriggered: boolean;
}
