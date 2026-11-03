import type { Lang } from '../i18n/t.ts';
import content from './discovery-content.json' with { type: 'json' };

export type DiscoveryAnswer = { kind: 'choice'; id: string } | { kind: 'text'; text: string };

export interface DiscoveryQuestion {
  title: string;
  placeholder: string;
  choices: { id: string; label: string }[];
}

type Topic = (typeof content.topics)[number];
type FollowUp = typeof content.general;

// Only a clear topic should narrow a free-form answer. Mixed or unfamiliar work gets the open follow-up.
const topicHints: Record<string, RegExp> = {
  support: /\b(?:customer|client)\s+(?:e-?mails?|enquir(?:y|ies)|inquir(?:y|ies)|questions?|requests?|support|tickets?)\b|\bsupport\s+(?:emails?|requests?|tickets?)\b|고객\s*(?:메일|문의|상담|이메일|요청)|(?:客户|客服|顾客)(?:的)?(?:邮件|咨询|问题|来信|请求|工单)/iu,
  documents: /\b(?:paperwork|invoices?|receipts?|document intake)\b|청구서|송장|영수증|서류\s*(?:접수|처리)|发票|收据|单据|文档录入/iu,
  knowledge: /\b(?:coworkers?|colleagues?)\b.{0,32}\b(?:ask|asking|questions?)\b|\bquestions?\s+from\s+(?:coworkers?|colleagues?)\b|동료.{0,16}(?:문의|질문)|同事.{0,12}(?:问|咨询)/iu,
};

function topicFor(first: DiscoveryAnswer): Topic | undefined {
  if (first.kind === 'choice') return content.topics.find((topic) => topic.id === first.id);
  const text = first.text.trim();
  const matches = content.topics.filter((topic) =>
    Object.values(topic.label).includes(text) || topicHints[topic.id]?.test(text));
  return matches.length === 1 ? matches[0] : undefined;
}

export function discoveryQuestion(lang: Lang, first?: DiscoveryAnswer): DiscoveryQuestion {
  if (!first) {
    return {
      title: content.question[lang],
      placeholder: content.placeholder[lang],
      choices: content.topics.map(({ id, label }) => ({ id, label: label[lang] })),
    };
  }
  const followUp: FollowUp = topicFor(first) ?? content.general;
  return {
    title: followUp.title[lang],
    placeholder: followUp.placeholder[lang],
    choices: followUp.choices.map(({ id, label }) => ({ id, label: label[lang] })),
  };
}

/** Choices stay translatable if the language changes; a prospect's own words stay verbatim. */
export function buildDiscoveryBrief(lang: Lang, first: DiscoveryAnswer, second: DiscoveryAnswer): string {
  const topic = topicFor(first);
  const work = first.kind === 'text' ? first.text.trim() : topic?.label[lang];
  if (!work) return '';
  const context = [content.workLabel[lang], work].join('\n');
  if (second.kind === 'text') {
    const focus = second.text.trim();
    if (!focus) return '';
    return [content.customBrief[lang], context, [content.focusLabel[lang], focus].join('\n')].join('\n\n');
  }
  const followUp: FollowUp = topic ?? content.general;
  const suggestion = followUp.choices.find(({ id }) => id === second.id)?.brief[lang];
  if (!suggestion) return '';
  return first.kind === 'text' ? [context, suggestion].join('\n\n') : suggestion;
}
