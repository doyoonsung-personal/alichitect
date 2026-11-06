// Example fixtures for tests and local development ONLY. Production code must not
// import this file; it is kept in src/ so both the web tests (via the @ali/bd-brief
// alias) and the worker tests (via relative paths) can use the same examples.
//
// The scenarios mirror plan §10 step 5: a thin-context conversation, a rich one with
// current pricing, and contradictory meeting notes.

import type { BriefContent, BriefNote, BriefRecord, BriefSnapshot } from './types.ts';
import { BD_BRIEF_SCHEMA_VERSION, makeEmptyContent } from './types.ts';

/** Thin context: a few customer statements, no completed design, no pricing.
 * Preparation must still produce useful questions — and no invented qualification facts. */
export function thinSnapshot(over: Partial<BriefSnapshot> = {}): BriefSnapshot {
  return {
    schemaVersion: BD_BRIEF_SCHEMA_VERSION,
    sourceKind: 'browser-session',
    sourceKey: 'sess-thin-001',
    sourceRevision: 2,
    suppliedBy: 'signed-in-user',
    capturedAt: Date.UTC(2026, 10, 3, 9, 0, 0),
    lang: 'en',
    objective: 'Understand whether the data-platform migration is worth a PoC.',
    statements: [
      { id: 'st-1', text: 'Our nightly batch jobs on self-managed Hadoop take six hours and the team is afraid of the hardware refresh.' },
      { id: 'st-2', text: 'The CFO wants to know the monthly run-rate before we talk to any vendor.' },
      { id: 'st-3', text: 'One of our data engineers is leaving in December.' },
    ],
    design: null,
    pricing: { status: 'missing', currency: null, monthlyUsd: null, oneTimeUsd: null, source: null },
    ...over,
  };
}

/** Rich context: a design summary with capabilities and boundaries, plus a current estimate. */
export function richSnapshot(over: Partial<BriefSnapshot> = {}): BriefSnapshot {
  return {
    schemaVersion: BD_BRIEF_SCHEMA_VERSION,
    sourceKind: 'browser-session',
    sourceKey: 'sess-rich-002',
    sourceRevision: 7,
    suppliedBy: 'signed-in-user',
    capturedAt: Date.UTC(2026, 10, 4, 2, 30, 0),
    lang: 'en',
    objective: null,
    statements: [
      { id: 'st-1', text: 'We serve 40k daily users in Korea and need the analytics pipeline to stay under 15 minutes.' },
      { id: 'st-2', text: 'Security review must approve any external data transfer before production use.' },
      { id: 'st-3', text: 'The CTO asked whether MaxCompute can replace our current warehouse without rewriting SQL.' },
      { id: 'st-4', text: 'Budget approval goes through the group IT committee in Seoul.' },
    ],
    design: {
      summary: 'Managed analytics pipeline: MaxCompute for warehousing, DataWorks for orchestration, Quick BI for dashboards, with OSS as the landing zone.',
      capabilities: [
        { id: 'cap-maxcompute', name: 'MaxCompute' },
        { id: 'cap-dataworks', name: 'DataWorks' },
        { id: 'cap-quickbi', name: 'Quick BI' },
      ],
      boundaries: [
        'Group security review approves external data transfers before production',
        'Existing on-prem identity provider remains the source of truth for accounts',
      ],
    },
    pricing: { status: 'current', currency: 'USD', monthlyUsd: 4820, oneTimeUsd: 1500, source: 'session-pricing' },
    ...over,
  };
}

/** Contradictory meeting notes: the budget timeline and the decision maker conflict
 * with earlier statements, so review must surface conflicts instead of flattening them. */
export function conflictingNotes(briefId = 'brief-fixture-001'): BriefNote[] {
  return [
    {
      id: 'note-1',
      briefId,
      requestId: 'req-note-1',
      text: 'Meeting with the platform team: they now say the CFO already signed off on the cloud budget last quarter, which contradicts the earlier "CFO wants to know the run-rate first" statement.',
      meetingDate: '2026-11-03',
      source: 'In-person meeting, Seoul office',
      savedAt: Date.UTC(2026, 10, 3, 8, 0, 0),
    },
    {
      id: 'note-2',
      briefId,
      requestId: 'req-note-2',
      text: 'They confirmed the 15-minute pipeline requirement and asked for a PoC scoped to the ingestion path only. Kim from the platform team will own the PoC side.',
      meetingDate: '2026-11-03',
      source: 'In-person meeting, Seoul office',
      savedAt: Date.UTC(2026, 10, 3, 8, 5, 0),
    },
    {
      id: 'note-3',
      briefId,
      requestId: 'req-note-3',
      text: 'Follow-up call: the security review is now described as a formality "already in motion", but earlier they said it must approve before production use. Unclear which is true.',
      meetingDate: '2026-11-04',
      source: null,
      savedAt: Date.UTC(2026, 10, 4, 1, 0, 0),
    },
  ];
}

/** A plausible accepted content for a rich brief, used by UI and API tests. */
export function sampleContent(): BriefContent {
  return {
    schemaVersion: BD_BRIEF_SCHEMA_VERSION,
    opportunity: {
      id: 'opportunity',
      text: 'The customer serves 40k daily users in Korea and needs its analytics pipeline under 15 minutes; the CTO is actively evaluating whether MaxCompute can replace the current warehouse. Business impact and timing beyond that are unknown.',
      sourceIds: ['st-1', 'st-3'],
      review: 'confirmed',
      origin: 'model',
      edited: true,
    },
    valuePoints: [
      {
        id: 'vp-1',
        label: 'Managed pipeline',
        text: 'DataWorks orchestration plus MaxCompute warehousing addresses the 15-minute pipeline requirement without new hardware.',
        sourceIds: ['st-1', 'design'],
        review: 'unreviewed',
        origin: 'model',
      },
      {
        id: 'vp-2',
        label: 'Migration path',
        text: 'The CTO asked whether existing SQL can be kept; the design summary suggests MaxCompute as the warehouse replacement, which is the evidence to bring.',
        sourceIds: ['st-3', 'design'],
        review: 'unreviewed',
        origin: 'model',
      },
    ],
    stakeholders: [
      {
        id: 'sh-1',
        kind: 'named',
        name: 'Kim (platform team)',
        role: 'PoC owner on the customer side',
        sourceIds: ['note-2'],
        review: 'confirmed',
        origin: 'model',
      },
      {
        id: 'sh-2',
        kind: 'suggested-role',
        name: null,
        role: 'Group IT committee contact in Seoul (budget approval path)',
        sourceIds: ['st-4'],
        review: 'unreviewed',
        origin: 'model',
      },
    ],
    questions: [
      {
        id: 'q-1',
        text: 'Which SQL dialect features must survive the warehouse migration unchanged?',
        priority: true,
        context: 'The CTO asked about SQL compatibility; the answer scopes the PoC.',
        answer: null,
        sourceIds: ['st-3'],
        review: 'unreviewed',
        origin: 'model',
      },
      {
        id: 'q-2',
        text: 'What does the group IT committee require to approve the monthly run-rate?',
        priority: true,
        context: null,
        answer: null,
        sourceIds: ['st-4'],
        review: 'unreviewed',
        origin: 'model',
      },
      {
        id: 'q-3',
        text: 'Is the security review a gate before production, or already in motion?',
        priority: true,
        context: 'Notes contradict the earlier statement; resolving this changes the timeline.',
        answer: null,
        sourceIds: ['st-2', 'note-3'],
        review: 'conflicted',
        origin: 'model',
      },
    ],
    concerns: [
      {
        id: 'cn-1',
        kind: 'stated',
        text: 'Security review must approve any external data transfer before production use.',
        investigation: 'Ask for the review checklist and offer an architecture pre-read with the SA.',
        sourceIds: ['st-2'],
        review: 'unreviewed',
        origin: 'model',
      },
      {
        id: 'cn-2',
        kind: 'hypothesis',
        text: 'The departing data engineer may reduce the team capacity for a PoC in December.',
        investigation: 'Confirm staffing during the next call before proposing PoC dates.',
        sourceIds: ['st-3'],
        review: 'unreviewed',
        origin: 'model',
      },
    ],
    nextEngagement: {
      id: 'next-1',
      kind: 'poc-scoping',
      decision: 'Agree the PoC scope limited to the ingestion path and who owns each side.',
      owner: 'Kim (platform team) — customer side',
      date: null,
      sourceIds: ['note-2'],
      review: 'unreviewed',
      origin: 'model',
    },
  };
}

/** An accepted brief record built from the rich snapshot and sample content. */
export function sampleBriefRecord(over: Partial<BriefRecord> = {}): BriefRecord {
  return {
    id: 'brief-fixture-001',
    ownerId: 'user-fixture-001',
    sourceKind: 'browser-session',
    sourceKey: 'sess-rich-002',
    schemaVersion: BD_BRIEF_SCHEMA_VERSION,
    lang: 'en',
    version: 2,
    content: sampleContent(),
    snapshotFingerprint: 'fp-fixture-0001',
    sourceRevision: 7,
    createdAt: Date.UTC(2026, 10, 3, 0, 0, 0),
    updatedAt: Date.UTC(2026, 10, 4, 3, 0, 0),
    ...over,
  };
}

/** The empty container every new brief starts from (version 0). */
export function emptyBriefRecord(over: Partial<BriefRecord> = {}): BriefRecord {
  return {
    id: 'brief-fixture-002',
    ownerId: 'user-fixture-001',
    sourceKind: 'browser-session',
    sourceKey: 'sess-thin-001',
    schemaVersion: BD_BRIEF_SCHEMA_VERSION,
    lang: 'en',
    version: 0,
    content: makeEmptyContent(),
    snapshotFingerprint: '',
    sourceRevision: 2,
    createdAt: Date.UTC(2026, 10, 3, 0, 0, 0),
    updatedAt: Date.UTC(2026, 10, 3, 0, 0, 0),
    ...over,
  };
}
