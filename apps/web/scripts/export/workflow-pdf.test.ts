import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../../src/store/reducer.ts';
import { workflowFixture } from '../../src/export/workflow-fixtures.ts';
import { generateFromState, playFixture } from './node-env.ts';
import { checkPdf } from './checks.ts';
import { pageOps } from './inspect.ts';
import { wt } from '../../src/export/workflow-strings.ts';
import type { ProposalDraft } from '@ali/core/types.ts';
import { usd } from '../../src/workflow/panel-model.ts';
import { xt } from '../../src/export/strings.ts';
import { makeT } from '../../src/i18n/t.ts';
import { deploymentSource } from '@ali/core/workflow-deployment.ts';
import { calculateSolutionEstimate, pricingDesignKey } from '@ali/core/solution-pricing.ts';

test('Korean handoff shows the approval decision and priced scope without an empty Connections page or competing estimate', async () => {
  const state = createInitialState({ lang: 'ko', id: 'handoff', now: 0 });
  state.session.mode = 'workflow';
  const memory = state.session.memory;
  memory.workflow = workflowFixture(6, 'ko');
  memory.assumptions = [{ id: 'noise', text: '내부 설정 전체 목록', alt: '대체 설정' }];
  const estimate = calculateSolutionEstimate({ items: [{ label: '검색 저장소', quantity: 1, unit: '개', period: 'monthly',
    unitUsd: 50, basis: 'assumption', source: '검증용 단가' }], assumptions: ['내부 산정 메모'], unknowns: ['모델 사용료 미산정'] });
  state.session.pricing = { designKey: pricingDesignKey(memory), messages: [], estimate };
  const draft: ProposalDraft = { lang: 'ko', complete: true, exec: '승인 전 발송을 차단하도록 제안합니다.',
    cost: '검색 저장소가 월 비용을 결정합니다.', needs: [], outcomes: [], why: {}, tradeoffs: [], next: ['승인 거부 시 발송되지 않는지 확인합니다.'] };
  const { bytes } = await generateFromState(state, { draft });
  const { info } = await checkPdf(bytes, state, { draft });
  const text = info.text.replace(/\s/g, '');
  for (const s of [draft.exec, draft.cost!, draft.next[0], 'USD 50.00', '모델 사용료 미산정']) assert.ok(text.includes(s.replace(/\s/g, '')), s);
  for (const s of ['내부 설정 전체 목록', '내부 산정 메모', xt('ko','workflow.cost'), xt('ko','workflow.questions'), xt('ko','rev.heading')]) {
    assert.ok(!text.includes(s.replace(/\s/g, '')), s);
  }
  assert.ok(!info.pages.some(page => page.text.includes(xt('ko','conn.intro'))));
});

for (const lang of ['en', 'ko', 'zh'] as const) for (const mixed of [false, true]) {
  test(`${lang}: ${mixed ? 'mixed drafted' : 'workflow-only basic'} PDF includes generated sections and readable vector tiles`, async () => {
    const state = mixed ? playFixture('ha', lang).getState() : createInitialState({ lang, id: 'workflow', now: 0 });
    state.session.mode = 'workflow';
    state.session.memory.workflow = workflowFixture(25, lang);
    if (mixed) {
      state.session.memory.deploymentSource = deploymentSource(state.session.memory);
      if (lang === 'ko') state.session.memory.workflow.nodes['step-0'].label += ' (수정됨)';
    }
    const draft: ProposalDraft | null = mixed ? { lang, complete: true, exec: 'Workflow executive summary.', outcomes: [], needs: [], why: {},
      tradeoffs: [], next: [], steps: { 'step-1': 'Explain the first model step.' } } : null;
    const result = await generateFromState(state, { draft });
    const check = await checkPdf(result.bytes, state, { draft });
    assert.deepEqual(check.problems, []);
    const allDiagrams = result.report.diagramPages;
    const diagrams = allDiagrams.filter(d => d.id === 'workflow');
    assert.equal(allDiagrams.length, diagrams.length + Number(mixed));
    if (mixed) {
      const deployment = allDiagrams.at(-1)!;
      assert.equal(deployment.id, 'cloud');
      assert.ok(deployment.page > diagrams.at(-1)!.page);
      const title = makeT(lang)(lang === 'ko' ? 'deployment.outdatedTitle' : 'deployment.title');
      assert.ok(check.info.pages[deployment.page - 1].text.includes(title));
    }
    assert.ok(diagrams[0].overview);
    assert.ok(diagrams.length > 2);
    assert.ok(diagrams.slice(1).every((d) => d.scale * 14 >= 11));
    for (const [index, diagram] of diagrams.entries()) {
      const page = check.info.pages[diagram.page - 1];
      assert.ok(page.text.includes(wt(lang, 'diagram.continued', { page: diagrams[index + 1]?.page ?? 0 }))
        === (index + 1 < diagrams.length));
      if (index + 1 === diagrams.length) {
        assert.ok(!page.text.includes(wt(lang, 'diagram.continued', { page: diagram.page - 1 })));
      } else assert.ok(diagrams[index + 1].page > diagram.page);
      if (!diagram.overview) assert.match(page.text, /step-\d+/);
    }
    assert.equal(result.report.pages, check.info.pages.length);
    for (const page of check.info.pages) assert.ok(page.text.includes(xt(lang, 'page.of', { n: page.n, total: check.info.pages.length })));
    const texts = check.info.text.replace(/\s/g, '');
    assert.equal(texts.includes(wt(lang, 'steps.heading').replace(/\s/g, '')), mixed);
    for (const key of ['cost.coverage', 'cost.unpriced'] as const) {
      assert.ok(texts.includes(wt(lang, key).replace(/\s/g, '')));
    }
    assert.ok(texts.includes('Attachedtool3'));
    assert.ok(check.model.workflow!.cost.lines.length);
    assert.ok(check.model.workflow!.cost.fixed.length);
    assert.ok(texts.includes('$438.00'));
    for (const scenario of [check.model.workflow!.cost.typical, check.model.workflow!.cost.upper]) {
      assert.ok(scenario.perRunUsd > 0);
      assert.notEqual(usd(scenario.perRunUsd), '$0.00');
      assert.ok(texts.includes(usd(scenario.perRunUsd)));
      assert.ok(texts.includes(usd(scenario.monthlyUsd)));
    }
    assert.equal((await pageOps(result.bytes, diagrams[1].page)).images, 0);
  });
}

test('very long runtime cells and questions paginate and repeat headers without footer overflow', async () => {
  const state = createInitialState({ lang: 'en', id: 'long', now: 0 });
  state.session.memory.workflow = workflowFixture(10);
  state.session.memory.workflow.nodes['tool-3'].runs = 'Long runtime detail '.repeat(450);
  state.session.memory.questions = [{ id: 'long-question', text: 'Long payloadquestion text '.repeat(500), options: [] }];
  const result = await generateFromState(state);
  const check = await checkPdf(result.bytes, state);
  assert.deepEqual(check.problems, []);
  assert.ok(check.info.pages.filter((p) => p.text.includes('Runtime')).length >= 4);
  assert.ok(check.info.text.includes('Continued'));
  const text = check.info.text.replace(/\s/g, '');
  assert.equal(text.match(/runtime/g)?.length, 450);
  assert.equal(text.match(/payloadquestion/g)?.length, 500);
});
