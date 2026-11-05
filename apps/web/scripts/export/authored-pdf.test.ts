import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ProposalAudience, ProposalDraft } from '@ali/core/types.ts';
import { calculateSolutionEstimate, pricingDesignKey } from '@ali/core/solution-pricing.ts';
import { createInitialState } from '../../src/store/reducer.ts';
import { inventoryWorkflowFixture } from '../../src/export/workflow-fixtures.ts';
import { xt } from '../../src/export/strings.ts';
import { wt } from '../../src/export/workflow-strings.ts';
import { channelRoute, generateFromState, playFixture } from './node-env.ts';
import { checkPdf } from './checks.ts';
import { pageOps } from './inspect.ts';

const squash = (s: string) => s.replace(/\s+/gu, '');
const copy = {
  en: {
    exec: 'Reduce stock imbalances across stores by combining demand signals before a manager approves any inventory action.',
    value: 'A shared decision process for seasonal demand, stock availability and approved replenishment across regional stores',
    approach: 'From an evidence-backed recommendation to a controlled ERP action with a documented review and correction path',
    paragraph: 'The pilot combines stock balances, recent sales and local events. The store manager reviews the evidence and can return a recommendation for correction. Approval creates a traceable handoff to the ERP team; a rejection leaves existing stock records unchanged.',
    client: 'Alibaba Cloud brings the model and scheduled analysis into one proposed operating flow. The first decision is whether the recommendations are useful to store managers; measurable savings must be validated during the pilot.',
    alibaba: 'The account team should validate ERP integration ownership, data freshness and manager acceptance. Use the pilot to test the proposed solution fit before committing the customer to a production rollout.',
    risk: 'Delayed stock updates can make a sound recommendation obsolete.',
    mitigation: 'Recheck available inventory at approval time and return conflicting actions for review.',
    next: 'Agree a representative pilot store group and nominate the manager who accepts or rejects replenishment advice.',
    cost: 'The saved estimate covers planned servers and a one-time migration support window. Data transfer and the final service mix remain subject to sizing; no additional charge has been invented here.',
  },
  ko: {
    exec: '매장별 수요 신호와 재고 현황을 함께 검토하고 담당자의 승인 이후에만 재고 조치를 실행하여 매장 간 재고 불균형을 줄이는 방안을 제안합니다.',
    value: '지역별 매장의 계절 수요와 재고 가용성을 함께 판단하고 보충 물량을 승인하는 일관된 의사결정 체계의 비즈니스 가치',
    approach: '근거가 있는 재고 이동 권고에서 담당자의 검토와 수정 요청을 거쳐 통제된 ERP 작업으로 이어지는 실행 방식',
    paragraph: '파일럿은 현재 재고, 최근 판매 실적과 지역 행사를 함께 분석합니다. 매장 담당자는 근거를 검토하고 필요하면 권고안을 수정 요청할 수 있습니다. 승인된 결과만 ERP 담당자에게 전달하고 반려된 경우에는 기존 재고 데이터를 변경하지 않습니다.',
    client: 'Alibaba Cloud를 활용하면 모델 분석과 예약 실행을 하나의 제안된 업무 흐름으로 구성할 수 있습니다. 우선 매장 담당자에게 권고가 유용한지 확인하고 실제 절감 효과는 파일럿에서 검증합니다.',
    alibaba: '담당 영업 및 솔루션 팀은 ERP 연동 책임자, 데이터 최신성과 현장 담당자의 수용 여부를 확인해야 합니다. 운영 도입을 약속하기 전에 파일럿으로 솔루션 적합성을 검증합니다.',
    risk: '재고 데이터 갱신이 늦으면 분석 시점에는 적절했던 권고도 실행 시점에는 유효하지 않을 수 있습니다.',
    mitigation: '승인 시 가용 재고를 다시 확인하고 충돌하는 조치는 재검토하도록 합니다.',
    next: '대표 매장군과 보충 권고를 승인하거나 반려할 담당자를 합의합니다.',
    cost: '저장된 추산에는 계획된 서버와 일회성 마이그레이션 지원이 포함됩니다. 데이터 전송과 최종 서비스 구성은 추가 산정이 필요하며 확인되지 않은 요금을 새로 추가하지 않았습니다.',
  },
  zh: {
    exec: '通过汇总各门店的需求信号与库存情况，并在负责人批准后才执行库存操作，减少区域门店之间的库存失衡。',
    value: '结合区域门店季节性需求、可用库存与补货审批的一致决策流程及其对门店运营的业务价值',
    approach: '从有依据的库存调拨建议，经负责人审核与退回修改，到受控执行 ERP 操作的完整工作方式',
    paragraph: '试点结合当前库存、近期销售及本地活动进行分析。门店负责人可以审核依据，并要求修订建议。只有获批结果才会交给 ERP 团队，拒绝建议不会更改已有库存记录。',
    client: '阿里云可将模型分析与定时执行纳入同一拟议业务流程。首先验证建议对门店负责人的实际帮助，任何节约效果都需要通过试点确认。',
    alibaba: '客户团队应确认 ERP 对接负责人、数据新鲜度和门店接受程度。在承诺正式上线前，通过试点验证方案与客户需求的匹配度。',
    risk: '延迟更新的库存可能使原本合理的建议在执行时失效。',
    mitigation: '批准时重新检查可用库存，并将冲突的操作退回审核。',
    next: '确定具有代表性的试点门店，并指定批准或拒绝补货建议的负责人。',
    cost: '已保存的估算包含计划服务器及一次性迁移支持窗口。数据传输和最终服务组合仍需进一步确定，本报告没有新增未经确认的收费。',
  },
};

function authoredDraft(lang: keyof typeof copy, audience: ProposalAudience): ProposalDraft {
  const words = copy[lang];
  return { lang, audience, complete: true, exec: words.exec,
    sections: [{ title: words.value, text: words[audience] }, { title: words.approach,
      // A long paragraph crosses a sheet; every sentence must survive pagination, including its ending.
      text: Array.from({ length: 15 }, (_, k) => `${words.paragraph} (${k + 1})`).join(' ') + '\n\n' + words[audience] }],
    needs: [{ id: 'legacy-need', need: 'LEGACY_NEED_SHOULD_NOT_PRINT', source: 'inferred',
      answer: 'LEGACY_ANSWER_SHOULD_NOT_PRINT', products: ['schedulerx'] }],
    outcomes: [], why: { schedulerx: 'LEGACY_COMPONENT_WHY_SHOULD_NOT_PRINT' },
    steps: { review: 'LEGACY_STEP_SHOULD_NOT_PRINT' }, cost: words.cost,
    tradeoffs: [{ text: words.risk, mitigation: words.mitigation }], next: [words.next] };
}

for (const lang of ['en', 'ko', 'zh'] as const) for (const audience of ['client', 'alibaba'] as const) {
  test(`${lang} ${audience}: authored chapters paginate, keep saved costs, and omit raw technical appendices`, async () => {
    const state = createInitialState({ lang, id: `authored-${lang}-${audience}`, now: 0 });
    state.session.title = lang === 'ko' ? '매장 재고 의사결정' : lang === 'zh' ? '门店库存决策' : 'Store inventory decisions';
    state.session.mode = 'workflow';
    const memory = state.session.memory;
    memory.workflow = inventoryWorkflowFixture();
    memory.assumptions = [{ id: 'raw-assumption', text: 'RAW_CONSOLE_ASSUMPTION_SHOULD_NOT_PRINT' }];
    memory.questions = [{ id: 'raw-question', text: 'RAW_CONSOLE_QUESTION_SHOULD_NOT_PRINT', options: [] }];
    state.session.pricing = { designKey: pricingDesignKey(memory), messages: [], estimate: calculateSolutionEstimate({
      items: [
        { label: 'Planned servers', period: 'monthly', quantity: 1460, quantityNote: 'Two servers at 730 hours',
          unit: 'hour', unitUsd: .23, basis: 'user', source: 'Customer agreement' },
        { label: 'Migration assistance', period: 'one-time', quantity: 8, unit: 'hour', unitUsd: 85,
          basis: 'assumption', source: 'Planning input' },
      ], assumptions: ['RAW_PRICING_ASSUMPTION_SHOULD_NOT_PRINT'], unknowns: ['RAW_PRICING_UNKNOWN_SHOULD_NOT_PRINT'],
    }) };
    const draft = authoredDraft(lang, audience);
    const result = await generateFromState(state, { draft, route: channelRoute });
    const check = await checkPdf(result.bytes, state, { draft });
    assert.deepEqual(check.problems, []);
    const text = squash(check.info.text);
    assert.ok(squash(check.info.pages[0].text).includes(squash(xt(lang, `doc.${audience}`))));
    assert.ok(result.fileName.includes(audience === 'alibaba' ? 'alibaba' : 'proposal'));
    for (const value of ['USD 335.80', 'USD 680.00', '1460', '0.23', 'Customer agreement', 'Planning input', copy[lang].cost]) {
      assert.ok(text.includes(squash(value).replace('1460', '1,460')), `saved financial evidence: ${value}`);
    }
    for (const value of ['RAW_CONSOLE', 'RAW_PRICING', 'LEGACY_', xt(lang, 'summary.requirementsNone'),
      xt(lang, 'conn.intro'), xt(lang, 'components.why'), wt(lang, 'steps.heading'), check.model.workflow!.mappingTitle,
      check.model.workflow!.costTitle, check.model.workflow!.questionsTitle]) {
      assert.ok(!text.includes(squash(value)), `unrequested appendix or empty placeholder: ${value}`);
    }
    const prosePages = check.info.pages.filter(p => p.width < p.height && p.text.includes('(15)'));
    assert.ok(prosePages.length, 'the final sentence of the long chapter survives');
    const diagrams = result.report.diagramPages.filter(p => p.id === 'workflow');
    assert.equal(diagrams.length, 3);
    assert.ok(diagrams.slice(1).every(p => p.scale * 14 >= 11));
    assert.equal((await pageOps(result.bytes, diagrams[1].page)).images, 0);
    assert.ok(check.summary.links > 0, 'the compact service reference still links official documentation');
  });
}

test('an authored cloud proposal omits legacy component inventory and withholds stale pricing', async () => {
  const state = playFixture('ha', 'en').getState();
  state.session.pricing = { designKey: 'outdated-design', messages: [], estimate: calculateSolutionEstimate({
    items: [{ label: 'STALE_PRICE_ITEM', quantity: 1, unit: 'server', period: 'monthly', unitUsd: 123.45,
      basis: 'user', source: 'STALE_PRICE_SOURCE' }], assumptions: [], unknowns: [],
  }) };
  const draft = authoredDraft('en', 'client');
  const result = await generateFromState(state, { draft, route: channelRoute });
  const check = await checkPdf(result.bytes, state, { draft });
  assert.deepEqual(check.problems, []);
  assert.equal(result.report.diagramPages.length, 1);
  assert.match(check.info.text, /design changed after pricing/);
  assert.doesNotMatch(check.info.text, /STALE_PRICE|123\.45|LEGACY_/);
  assert.ok(!squash(check.info.text).includes(squash(draft.cost!)));
  assert.ok(check.info.links.length > 0);
});
