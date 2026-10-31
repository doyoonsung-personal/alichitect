// The single place the app calls core's displayGraph. The session truth: while a turn is open the canvas draws
// displayGraph(working raw graph); at turn end it draws the committed graph, which is exactly what the display equals.
import { displayGraph } from '@ali/core/display.ts';
import type { DisplayResult } from '@ali/core/display.ts';
import type { Catalog, Constraint, Graph } from '@ali/core/types.ts';

export interface DisplayInput {
  raw: Graph;
  catalog: Catalog;
  /** Card ids drawn right now; undefined before anything is drawn. */
  drawn: ReadonlySet<string> | undefined;
  shownAtTurnStart: ReadonlySet<string>;
  touched: ReadonlySet<string>;
  constraints: readonly Constraint[];
}

/** The display graph of an open turn: repair, then hold back cards that would only flash in and out. */
export function displayOpenTurn(i: DisplayInput): DisplayResult {
  return displayGraph(i.raw, i.catalog, { turnOpen: true, drawn: i.drawn, shownAtTurnStart: i.shownAtTurnStart, touched: i.touched }, { constraints: [...i.constraints] });
}
