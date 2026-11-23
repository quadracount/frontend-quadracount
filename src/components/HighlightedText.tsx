import { Fragment } from "react";
import type { Interpretation } from "../lib/types";

interface Piece {
  text: string;
  index: number | null;
}

/**
 * Parte el texto original en trozos, marcando las frases que el asistente
 * interpretó y numerándolas para que coincidan con la lista de abajo.
 */
function splitByPhrases(text: string, interpretations: Interpretation[]): Piece[] {
  const matches = interpretations
    .map((interpretation, position) => ({
      phrase: interpretation.phrase,
      number: position + 1,
      start: text.indexOf(interpretation.phrase),
    }))
    .filter((match) => match.start >= 0 && match.phrase.length > 0)
    .sort((a, b) => a.start - b.start);

  const pieces: Piece[] = [];
  let cursor = 0;

  for (const match of matches) {
    // Si dos frases se solapan, se conserva la primera.
    if (match.start < cursor) continue;
    if (match.start > cursor) {
      pieces.push({ text: text.slice(cursor, match.start), index: null });
    }
    pieces.push({ text: match.phrase, index: match.number });
    cursor = match.start + match.phrase.length;
  }

  if (cursor < text.length) {
    pieces.push({ text: text.slice(cursor), index: null });
  }
  return pieces;
}

export function HighlightedText({
  text,
  interpretations,
}: {
  text: string;
  interpretations: Interpretation[];
}) {
  const pieces = splitByPhrases(text, interpretations);

  return (
    <p className="qc-draft__text">
      {pieces.map((piece, position) => (
        <Fragment key={position}>
          {piece.index === null ? (
            piece.text
          ) : (
            <mark className="qc-highlight">
              {piece.text}
              <sup className="qc-highlight__index">{piece.index}</sup>
            </mark>
          )}
        </Fragment>
      ))}
    </p>
  );
}
