// The products-and-why panel (spec 7.25, 7.26, 7.28): a 52 px bar under the canvas with the ^ handle, and a table that
// rises over the canvas. The shell pins this component's container to the stage bottom at the open height with
// pointer-events none; the root below sets pointer-events auto. The table is data from model.ts.
import { useEffect, useMemo, useRef } from 'react';
import type { KeyboardEvent, ReactElement } from 'react';
import { ProductIcon } from '../icons/ProductIcon.tsx';
import { Icon } from '../shell/Icon.tsx';
import type { PanelProps } from '../app/contracts.ts';
import { buildPanelModel, isLatest, summaryParts } from './model.ts';
import type { FlagKind, PanelEdge, PanelGroup, PanelRow } from './model.ts';
import './panel.css';

const FLAG_KEY = {
  preview: 'panel.flag.preview',
  legacy: 'panel.flag.legacy',
  noNew: 'panel.flag.noNew',
  retired: 'panel.flag.retired',
  chinaOnly: 'panel.flag.chinaOnly',
  restricted: 'panel.flag.restricted',
  announced: 'panel.flag.announced',
} as const satisfies Record<FlagKind, string>;

const EDGE_KEY = { data: 'panel.edge.data', async: 'panel.edge.async', control: 'panel.edge.control', resolve: 'panel.edge.resolve' } as const;

const FLASH_MS = 1600;

export function Panel(p: PanelProps): ReactElement {
  const { t, open, actions } = p;
  const handleRef = useRef<HTMLButtonElement>(null);
  const flash = useRef<number | null>(null);
  useEffect(() => () => { if (flash.current !== null) window.clearTimeout(flash.current); }, []);

  const model = useMemo(
    () => buildPanelModel(p.display.graph, p.display.layout, p.catalog, p.t, p.provenance),
    [p.display.graph, p.display.layout, p.catalog, p.t, p.provenance],
  );
  const solution = p.mode === 'solution';
  const empty = model.rows.length === 0;
  const parts = summaryParts(t, p.count, model.recs, solution);
  const last = p.revisions.length ? p.revisions[p.revisions.length - 1] : null;
  const buildingRev = p.streaming && last && (last.status === 'waiting' || last.status === 'streaming') ? last.n : null;
  const lit = p.highlight ? new Set(p.highlight.cards) : null;

  const toggle = (): void => actions.setOpen(!open);

  const onKeyDown = (e: KeyboardEvent<HTMLElement>): void => {
    if (e.key === 'Escape' && open) {
      e.stopPropagation();
      actions.setOpen(false);
      handleRef.current?.focus();
    }
  };

  const hover = (row: PanelRow | null): void => {
    if (row) actions.highlight({ source: 'panel', cards: [row.id], ghosts: [] });
    else if (p.highlight?.source === 'panel') actions.highlight(null);
  };

  // "Show on diagram": the table gets out of the way, the canvas pans to the card, and the card stays outlined a moment
  const show = (row: PanelRow): void => {
    actions.highlight({ source: 'panel', cards: [row.id], ghosts: [] });
    actions.panTo([row.id]);
    handleRef.current?.focus();
    actions.setOpen(false);
    if (flash.current !== null) window.clearTimeout(flash.current);
    flash.current = window.setTimeout(() => { actions.highlight(null); flash.current = null; }, FLASH_MS);
  };

  const cols = 6;

  return (
    <section id="products" className="pp" data-open={open || undefined} data-streaming={p.streaming || undefined} aria-label={t('panel.title')} onKeyDown={onKeyDown}>
      <button
        ref={handleRef}
        type="button"
        className="pp__handle"
        aria-expanded={open}
        aria-controls="products-body"
        aria-label={open ? t('panel.collapse') : t('panel.expand')}
        onClick={toggle}
      >
        <Icon name={open ? 'chevronDown' : 'chevronUp'} size={16} />
      </button>

      <div className="pp__bar" onClick={toggle}>
        <h2 className="pp__title">{t('panel.title')}</h2>
        {parts.length ? (
          <span className="pp__count num">{parts.join(' · ')}</span>
        ) : (
          <span className="pp__count">{t('panel.empty')}</span>
        )}
        {!open && parts.length ? <span className="pp__hint">· {t('panel.why')}</span> : null}
        <span className="pp__meta">
          {t('panel.aiNotice')} · <span className="num">{t('panel.catalog', { date: p.catalogVersion })}</span>
        </span>
      </div>

      <div id="products-body" className="pp__body" inert={!open}>
        {empty ? (
          <p className="pp__empty">{t('panel.empty')}</p>
        ) : (
          <>
            <table className="pp-table" data-mode={p.mode} aria-label={t('panel.title')}>
              <colgroup>
                <col className="pp-c-product" />
                <col className="pp-c-why" />
                {solution ? <col className="pp-c-fit" /> : <col className="pp-c-where" />}
                {solution ? <col className="pp-c-price" /> : <col className="pp-c-notes" />}
                <col className="pp-c-rev" />
                <col className="pp-c-act" />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">{t('panel.col.product')}</th>
                  <th scope="col">{t('panel.col.why')}</th>
                  <th scope="col">{solution ? t('panel.col.fit') : t('panel.col.where')}</th>
                  <th scope="col">{solution ? t('panel.col.price') : t('panel.col.notes')}</th>
                  <th scope="col" className="pp-th-rev">{t('panel.col.rev')}</th>
                  <th scope="col"><span className="visually-hidden">{t('panel.title')}</span></th>
                </tr>
              </thead>
              {model.groups.map((g) => (
                <GroupBody key={g.key} g={g} cols={cols} solution={solution} p={p} lit={lit} buildingRev={buildingRev} hover={hover} show={show} />
              ))}
            </table>
            {model.edges.length ? <Connections edges={model.edges} p={p} /> : null}
          </>
        )}
      </div>
    </section>
  );
}

interface GroupProps {
  g: PanelGroup;
  cols: number;
  solution: boolean;
  p: PanelProps;
  lit: Set<string> | null;
  buildingRev: number | null;
  hover: (row: PanelRow | null) => void;
  show: (row: PanelRow) => void;
}

function GroupBody({ g, cols, solution, p, lit, buildingRev, hover, show }: GroupProps): ReactElement {
  return (
    <tbody className="pp-group-body">
      {g.label ? (
        <tr className="pp-group">
          <th scope="rowgroup" colSpan={cols}>{g.label}</th>
        </tr>
      ) : null}
      {g.rows.map((row) => (
        <ProductRow key={row.id} row={row} solution={solution} p={p} lit={lit?.has(row.id) ?? false} dim={lit !== null && !lit.has(row.id)} buildingRev={buildingRev} hover={hover} show={show} />
      ))}
    </tbody>
  );
}

interface RowProps {
  row: PanelRow;
  solution: boolean;
  p: PanelProps;
  lit: boolean;
  dim: boolean;
  buildingRev: number | null;
  hover: (row: PanelRow | null) => void;
  show: (row: PanelRow) => void;
}

function ProductRow({ row, solution, p, lit, buildingRev, hover, show }: RowProps): ReactElement {
  const { t } = p;
  const rev = row.addedIn ?? buildingRev;
  const filled = isLatest(row, p.latestCommitted);
  return (
    <tr
      className="pp-row"
      data-row-id={row.id}
      data-lit={lit || undefined}
      data-indent={row.indent || undefined}
      onMouseEnter={() => hover(row)}
      onMouseLeave={() => hover(null)}
      onFocus={() => hover(row)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) hover(null); }}
    >
      <th scope="row" className="pp-cell-product">
        <span className="pp-prod">
          <span className="pp-prod__icon" title={row.fullName}>
            <ProductIcon product={row.product} size={16} />
          </span>
          <span className="pp-prod__text">
            <span className="pp-prod__name">{row.name}</span>
            {row.label ? <span className="pp-prod__label">{row.label}</span> : null}
          </span>
        </span>
        {solution ? <Notes row={row} p={p} compact /> : null}
      </th>
      <td className={row.whyIsCatalog ? 'pp-why pp-why--catalog' : 'pp-why'}>
        <span className="pp-why__text">{row.why}</span>
      </td>
      {solution ? (
        <>
          <td className="pp-cell-fit">{row.fit ? <FitChip fit={row.fit} t={t} /> : null}</td>
          <td className="pp-cell-price">
            {row.price ? <span>{t('rec.priceAsOf', { summary: row.price.summary, date: row.price.asOf })}</span> : <span className="pp-muted">{t('rec.noPrice')}</span>}
          </td>
        </>
      ) : (
        <>
          <td className="pp-cell-where">{row.where}</td>
          <td className="pp-cell-notes">
            <Notes row={row} p={p} />
            {row.kind === 'rec' && row.fit ? <FitChip fit={row.fit} t={t} /> : null}
          </td>
        </>
      )}
      <td className="pp-cell-rev">
        {rev !== null && rev !== undefined ? (
          <button
            type="button"
            className="pp-rev"
            data-latest={filled || undefined}
            aria-label={t('panel.rev', { n: rev })}
            title={t('panel.rev', { n: rev })}
            onClick={() => p.actions.revealRevision(rev)}
          >
            <span className="num">{rev}</span>
          </button>
        ) : null}
      </td>
      <td className="pp-cell-act">
        <div className="pp-acts">
          <DocsLink row={row} p={p} />
          <button type="button" className="pp-show" aria-label={t('panel.show', { name: row.label ?? row.name })} title={t('panel.show', { name: row.label ?? row.name })} onClick={() => show(row)}>
            <Icon name="fit" size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function FitChip({ fit, t }: { fit: 'primary' | 'complement'; t: PanelProps['t'] }): ReactElement {
  return <span className="pp-fit" data-fit={fit}>{fit === 'primary' ? t('rec.recommended') : t('rec.optional')}</span>;
}

function Notes({ row, p, compact }: { row: PanelRow; p: PanelProps; compact?: boolean }): ReactElement | null {
  const { t } = p;
  const priced = !compact && row.price && row.kind !== 'rec';
  if (!row.flags.length && !row.note && !priced) return null;
  return (
    <span className="pp-notes" data-compact={compact || undefined}>
      {row.flags.map((f) => (
        <span key={f} className="pp-flag" data-flag={f}>
          {f !== 'preview' ? <Icon name="info" size={12} /> : null}
          {t(FLAG_KEY[f])}
        </span>
      ))}
      {row.note ? <span className="pp-note">{row.note}</span> : null}
      {priced ? <span className="pp-note">{t('rec.priceAsOf', { summary: row.price!.summary, date: row.price!.asOf })}</span> : null}
    </span>
  );
}

function DocsLink({ row, p }: { row: PanelRow; p: PanelProps }): ReactElement | null {
  if (!row.docs) return null;
  const name = `${p.t('pop.productPage')}: ${row.name}`;
  return (
    <a className="pp-docs" href={row.docs} target="_blank" rel="noopener noreferrer" aria-label={name} title={name}>
      <Icon name="external" size={16} />
    </a>
  );
}

function Connections({ edges, p }: { edges: PanelEdge[]; p: PanelProps }): ReactElement {
  const { t } = p;
  return (
    <details className="pp-conn">
      <summary>
        <Icon name="chevronRight" size={12} className="pp-conn__chev" />
        <span className="num">{t('rec.connections', { n: edges.length })}</span>
      </summary>
      <ul>
        {edges.map((e) => (
          <li key={e.id} className="pp-conn__row">
            <span className="pp-conn__ends">
              {e.from} <Icon name="arrowRight" size={12} /> {e.to}
            </span>
            <span className="pp-conn__label">{e.label ?? ''}</span>
            <span className="pp-conn__kind">{t(EDGE_KEY[e.kind])}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
