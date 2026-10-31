```css
/* src/styles/landing.css */

.landing {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.landing__stack {
  width: var(--landing-box-w);
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: max(64px, calc((100vh - 580px) / 2 - 24px));
}

/* Utility row pinned top-right */
.landing__util {
  position: fixed;
  top: 16px;
  right: 16px;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  z-index: 10;
}

/* Lockup */
.landing__lockup {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: nowrap;
  margin: 0;
}

.brand--landing {
  display: inline-flex;
  align-items: center;
  font-size: var(--t-24);
  padding: 19px; /* 0.6 x 32px logo height clear space */
}

.brand--landing .brand__logo {
  height: 32px;
  width: auto;
}

.brand--landing .brand__rule {
  display: block;
  width: 1px;
  height: 28px;
  background: var(--line-1);
  margin: 0 20px;
  flex: none;
}

.brand--landing .brand__name {
  font-size: var(--t-24);
  line-height: var(--lh-24);
  font-weight: var(--w-medium);
  color: var(--ink);
}

/* Lead */
.landing__lead {
  font-size: var(--t-18);
  line-height: var(--lh-18);
  color: var(--ink-2);
  max-width: 600px;
  text-align: center;
  margin-top: 16px;
  margin-bottom: 32px;
}

/* Brief box */
.brief {
  width: 100%;
  border: 1px solid var(--line-control);
  background: var(--sheet);
  border-radius: var(--r-control);
  display: flex;
  flex-direction: column;
  transition: border-color var(--d-hover) linear, box-shadow var(--d-hover) linear;
}

.brief:focus-within {
  border-color: var(--action);
  box-shadow: inset 0 0 0 1px var(--action);
}

.brief__input {
  width: 100%;
  font-size: var(--t-18);
  line-height: var(--lh-18);
  color: var(--ink);
  padding: 20px;
  border: none;
  outline: none;
  background: transparent;
  min-height: 80px;
  max-height: 224px;
}

.brief__row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px 16px;
  gap: var(--s-3);
}

.brief__hint {
  font-size: var(--t-12);
  line-height: var(--lh-12);
  color: var(--ink-3);
  margin: 0;
}

.brief__hint--error {
  color: var(--danger);
}

/* Language switch segmented control */
.seg {
  display: inline-flex;
  flex-direction: row;
  border: 1px solid var(--line-control);
  border-radius: var(--r-control);
  height: 32px;
}

.seg__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 0 var(--s-4);
  font-size: var(--t-13);
  line-height: var(--lh-13);
  color: var(--ink-2);
  background: transparent;
  border: none;
  border-radius: var(--r-control);
  cursor: pointer;
  transition: background-color var(--d-hover) linear, color var(--d-hover) linear;
}

.seg__btn[aria-pressed="true"] {
  color: var(--ink);
  background: var(--action-soft);
}

.seg__btn:not([aria-pressed="true"]):hover {
  background: var(--surface-2);
}

/* Examples */
.examples {
  width: 100%;
}

.examples__heading {
  font-size: var(--t-13);
  line-height: var(--lh-13);
  font-weight: var(--w-medium);
  color: var(--ink-2);
  margin-top: 40px;
  margin-bottom: 8px;
}

.examples__list {
  list-style: none;
  padding: 0;
  margin: 0;
  border-top: 1px solid var(--line-1);
}

.examples__list li {
  border-bottom: 1px solid var(--line-1);
}

.example {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  height: 44px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: var(--r-control);
  text-align: left;
  cursor: pointer;
  transition: background-color var(--d-hover) linear;
}

.example:hover,
.example:focus-visible {
  background: var(--surface-2);
}

.example__tag {
  flex: none;
  width: 152px;
  font-size: var(--t-13);
  line-height: var(--lh-13);
  color: var(--ink-3);
  padding-left: var(--s-5);
}

.example__brief {
  flex: 1;
  min-width: 0;
  font-size: var(--t-14);
  line-height: var(--lh-14);
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.example__arrow {
  opacity: 0;
  color: var(--ink-2);
  margin-right: var(--s-5);
  transition: opacity var(--d-hover) linear;
}

.example:hover .example__arrow,
.example:focus-visible .example__arrow {
  opacity: 1;
}

/* Notice on landing */
.notice--landing {
  width: 100%;
  margin-top: 16px;
  text-align: left;
}

/* Footer */
.landing__footer {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: var(--t-12);
  line-height: var(--lh-12);
  color: var(--ink-3);
  margin: 0;
  text-align: center;
}

@media (max-height: 640px) {
  .landing__footer {
    position: static;
    transform: none;
    margin-top: var(--s-9);
    padding-bottom: 20px;
  }
}
```

```css
/* src/styles/shell.css */

/* ---------- Header ---------- */
.header {
  display: flex;
  flex-direction: row;
  align-items: center;
  height: var(--header-h);
  background: var(--sheet);
  border-bottom: 1px solid var(--line-1);
  padding: 0 16px;
  flex: none;
}

.brand--header {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: var(--r-control);
  cursor: pointer;
  text-decoration: none;
}

.brand--header .brand__logo {
  height: 18px;
  width: auto;
}

.brand--header .brand__rule {
  display: block;
  width: 1px;
  height: 16px;
  background: var(--line-1);
  flex: none;
}

.brand--header .brand__name {
  font-size: var(--t-14);
  line-height: var(--lh-14);
  font-weight: var(--w-medium);
  color: var(--ink);
  text-decoration: none;
  transition: text-decoration-color var(--d-hover) linear;
}

.brand--header:hover:not(:disabled) .brand__name {
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}

.brand--header:disabled {
  cursor: default;
}

.header__title {
  flex: 1;
  min-width: 0;
  margin-left: 24px;
  font-size: var(--t-13);
  line-height: var(--lh-13);
  color: var(--ink-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header__right {
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
}

.header .btn--ghost {
  height: 32px;
}

/* Mode state */
.mode {
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
}

.mode__dot {
  display: block;
  width: 8px;
  height: 8px;
  flex: none;
}

.mode__label {
  font-size: var(--t-12);
  line-height: var(--lh-12);
  color: var(--ink-3);
}

.mode--live .mode__dot { background: var(--ok); }
.mode--replay .mode__dot { background: var(--warn); }
.mode--offline .mode__dot { background: var(--danger); }
.mode--checking .mode__dot { background: var(--ink-disabled); }

/* ---------- Menu ---------- */
.menu {
  position: relative;
}

.menu__list {
  position: absolute;
  top: calc(100% + 4px);
  min-width: 240px;
  background: var(--sheet);
  border: 1px solid var(--line-2);
  border-radius: var(--r-pop);
  box-shadow: var(--shadow-raise);
  padding: 4px;
  z-index: 50;
}

.menu__list--end { right: 0; }
.menu__list--start { left: 0; }

.menu--sessions .menu__list {
  min-width: 320px;
}

.menu__item {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 36px;
  padding: 6px 12px;
  font-size: var(--t-13);
  line-height: var(--lh-13);
  color: var(--ink);
  text-align: left;
  background: transparent;
  border: none;
  border-radius: var(--r-control);
  cursor: pointer;
  transition: background-color var(--d-hover) linear;
}

.menu__item:hover,
.menu__item:focus-visible {
  background: var(--surface-2);
}

.menu__item:focus-visible {
  outline: var(--focus-outline);
  outline-offset: -2px;
}

.menu__item[aria-current="true"] {
  font-weight: var(--w-medium);
}

.menu__label {
  display: block;
}

.menu__title {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.menu__meta {
  display: block;
  font-size: var(--t-12);
  line-height: var(--lh-12);
  color: var(--ink-3);
  margin-top: var(--s-1);
}

.menu__empty {
  font-size: var(--t-13);
  line-height: var(--lh-13);
  color: var(--ink-3);
  padding: 8px 12px;
  margin: 0;
}

.menu__rule {
  height: 1px;
  background: var(--line-1);
  margin: 4px 0;
}

/* ---------- Offline notice ---------- */
.notice {
  border: 1px solid var(--line-2);
  background: var(--sheet);
  padding: 16px;
  border-radius: var(--r-control);
}

.notice__title {
  font-size: var(--t-14);
  line-height: var(--lh-14);
  font-weight: var(--w-medium);
  color: var(--ink);
  margin: 0;
}

.notice__body {
  font-size: var(--t-13);
  line-height: var(--lh-13);
  color: var(--ink-2);
  margin: 4px 0 0;
}

.notice__actions {
  display: flex;
  flex-direction: row;
  gap: 8px;
  margin-top: 12px;
}

/* ---------- Working view layout ---------- */
.app--working {
  display: grid;
  grid-template-rows: var(--header-h) 1fr;
  height: 100vh;
  min-height: 600px;
}

.work {
  display: grid;
  grid-template-columns: var(--console-w) 1fr;
  min-height: 0;
  transition: grid-template-columns var(--d-panel) var(--ease-in-out);
}

.app--working[data-focus] .work {
  grid-template-columns: 1fr;
}

.work__console {
  background: var(--record);
  border-right: 1px solid var(--line-1);
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Stage and canvas entrance */
.stage {
  position: relative;
  background: var(--sheet);
  display: grid;
  grid-template-rows: 1fr var(--panel-bar-h);
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.stage__canvas {
  grid-row: 1;
  position: relative;
  overflow: hidden;
  outline: none;
}

@keyframes stage-enter {
  from {
    transform: translateX(24px);
    opacity: 0;
  }
  to {
    transform: none;
    opacity: 1;
  }
}

.stage[data-enter] {
  animation: stage-enter var(--d-handoff) var(--ease-out) both;
}

@media (prefers-reduced-motion: reduce) {
  @keyframes stage-enter {
    from { opacity: 0; }
    to { opacity: 1; }
  }
}

/* Panel wrapper inside stage */
.stage__panel {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: var(--panel-open-h);
  pointer-events: none;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.stage__panel > * {
  pointer-events: auto;
}

/* Reflow at narrow widths */
@media (max-width: 760px) {
  .app--working {
    height: auto;
  }
  .work {
    grid-template-columns: 1fr;
  }
  .work__console {
    border-right: none;
    border-bottom: 1px solid var(--line-1);
    max-height: 60vh;
  }
  .stage {
    height: 70vh;
  }
}

/* ---------- Handoff ghost ---------- */
.handoff-ghost {
  position: fixed;
  box-sizing: border-box;
  background: var(--sheet);
  border: 1px solid var(--line-control);
  font-size: var(--t-18);
  line-height: var(--lh-18);
  color: var(--ink);
  padding: 20px;
  overflow: hidden;
  pointer-events: none;
  transform-origin: 0 0;
  z-index: 60;
  white-space: pre-wrap;
}

/* ---------- Console placeholder ---------- */
.console {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  height: 100%;
}

.console__req {
  padding: 16px;
  border-bottom: 1px solid var(--line-1);
  font-size: var(--t-13);
  line-height: var(--lh-13);
}

.console__req h2 {
  font-size: var(--t-13);
  line-height: var(--lh-13);
  font-weight: var(--w-medium);
  color: var(--ink-2);
  margin: 0;
}

.console__record {
  flex: 1;
  overflow: auto;
  padding: 16px;
  font-size: var(--t-14);
  line-height: var(--lh-14);
  min-height: 0;
}

.console__composer {
  padding: 16px;
  border-top: 1px solid var(--line-1);
}

.console__box {
  background: var(--sheet);
  border: 1px solid var(--line-control);
  border-radius: var(--r-control);
  display: flex;
  flex-direction: column;
}

.console__box textarea {
  width: 100%;
  font-size: var(--t-16);
  line-height: var(--lh-16);
  color: var(--ink);
  padding: 12px;
  border: none;
  outline: none;
  background: transparent;
}

.console__box button {
  align-self: flex-end;
  margin: 0 8px 8px 0;
  height: 32px;
  padding: 0 var(--s-5);
  font-size: var(--t-14);
  line-height: var(--lh-14);
  font-weight: var(--w-medium);
  color: var(--ink);
  background: var(--sheet);
  border: 1px solid var(--line-control);
  border-radius: var(--r-control);
  cursor: pointer;
  transition: background-color var(--d-hover) linear, border-color var(--d-hover) linear;
}

.console__box button:hover:not(:disabled) {
  background: var(--surface-2);
  border-color: var(--ink);
}

.console__box button:disabled {
  color: var(--ink-disabled);
  border-color: var(--ink-disabled);
  cursor: default;
}

/* ---------- Canvas placeholder ---------- */
.canvas-placeholder {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.canvas-placeholder__world {
  position: absolute;
  left: 0;
  top: 0;
}

.canvas-placeholder__empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--t-14);
  line-height: var(--lh-14);
  color: var(--ink-3);
  margin: 0;
}

.cp-frame {
  position: absolute;
  border: 1px solid var(--frame-region-line);
  border-radius: var(--r-frame);
}

.cp-frame span {
  position: absolute;
  left: 12px;
  top: 8px;
  font-size: var(--t-12);
  line-height: var(--lh-12);
  font-weight: var(--w-medium);
  color: var(--ink-2);
}

.cp-frame--region { background: var(--frame-region-fill); }
.cp-frame--vpc { background: var(--frame-vpc-fill); border-color: var(--frame-vpc-line); }
.cp-frame--zone { background: transparent; border: 1px dashed var(--frame-zone-line); }
.cp-frame--edge { background: var(--frame-edge-fill); border: none; }
.cp-frame--external,
.cp-frame--outside,
.cp-frame--onprem { background: transparent; border: 1px dashed var(--frame-ext-line); }
.cp-frame--account,
.cp-frame--saas,
.cp-frame--recs,
.cp-frame--lane,
.cp-frame--solution { background: var(--frame-band-fill); border: none; }

.cp-card {
  position: absolute;
  background: var(--card-fill);
  border: 1px solid var(--card-line);
  border-radius: var(--r-card);
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  overflow: hidden;
}

.cp-card svg:first-child {
  color: var(--brand-icon);
  flex: none;
}

.cp-card span {
  font-size: var(--t-14);
  line-height: 18px;
  font-weight: var(--w-medium);
  color: var(--ink);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ---------- Panel placeholder ---------- */
.panel-placeholder {
  background: var(--sheet);
  border-top: 1px solid var(--line-1);
  pointer-events: auto;
}

.panel-placeholder__bar {
  height: var(--panel-bar-h);
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  font-size: var(--t-14);
  line-height: var(--lh-14);
}

.panel-placeholder[data-open] ul {
  max-height: 300px;
  overflow: auto;
  padding: 8px 16px;
  font-size: var(--t-13);
  line-height: var(--lh-13);
  margin: 0;
  list-style: none;
}
```