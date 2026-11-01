// User-facing copy for fatal codes and status lines, in English, Korean and Chinese. The server picks the language of
// the user's message (detectReplyLanguage); the web app may localize by code instead. First drafts by Qwen
// (tools/qwen/ask.ts), reviewed and corrected by hand: content-filtered, network, first-byte-timeout, total-timeout (ko).
// Nothing here names a model vendor, a backup model or the content filter's second pass: the owner's decision is that
// a browser never learns who finished a turn.
import { detectReplyLanguage } from '../../../packages/core/src/prompt.ts';
import type { StatusCode } from '../../../packages/core/src/llm.ts';

export type Lang = 'en' | 'ko' | 'zh';
type Copy = Record<Lang, string>;

export const FATAL_COPY: Record<string, Copy> = {
  'content-filtered': {
    en: "The model provider's content filter declined this request. Rephrase it and try again. Your diagram is unchanged.",
    ko: '모델 제공업체의 콘텐츠 필터가 이 요청을 거부했습니다. 표현을 바꿔 다시 시도해 주세요. 다이어그램은 변경되지 않았습니다.',
    zh: '模型服务商的内容过滤拒绝了此请求。请换个说法重试。您的图表未更改。',
  },
  // A turn the content filter stopped and the second pass could not finish. 'request-limit': a spending cap stopped the
  // second pass from starting. 'not-completed': it was not started (too little time left, or the cap check failed) or
  // it was asked and could not answer. The words say neither who the second pass is nor why it ran.
  'request-limit': {
    en: "This request couldn't be completed. Rephrase it and try again, or try again tomorrow. Your diagram is unchanged.",
    ko: '이 요청을 완료하지 못했습니다. 표현을 바꿔 다시 시도하거나 내일 다시 시도해 주세요. 다이어그램은 변경되지 않았습니다.',
    zh: '无法完成此请求。请换个说法重试，或明天再试。您的图表未更改。',
  },
  'not-completed': {
    en: "This request couldn't be completed. Rephrase it and try again. Your diagram is unchanged.",
    ko: '이 요청을 완료하지 못했습니다. 표현을 바꿔 다시 시도해 주세요. 다이어그램은 변경되지 않았습니다.',
    zh: '无法完成此请求。请换个说法重试。您的图表未更改。',
  },
  auth: {
    en: 'The server key was rejected. The person running the server must check it. Your diagram is unchanged.',
    ko: '서버 키가 거부되었습니다. 서버 관리자가 키를 확인해야 합니다. 다이어그램은 변경되지 않았습니다.',
    zh: '服务器密钥被拒绝。请服务器管理员检查密钥。您的图表未更改。',
  },
  'no-key': {
    en: 'No server key was set. The person running the server must add one and restart. Your diagram is unchanged.',
    ko: '서버 키가 설정되지 않았습니다. 서버 관리자가 키를 추가하고 다시 시작해야 합니다. 다이어그램은 변경되지 않았습니다.',
    zh: '未设置服务器密钥。请服务器管理员添加密钥并重启。您的图表未更改。',
  },
  'rate-limited': {
    en: 'Too many requests right now. Please try again in a moment. Your diagram is unchanged.',
    ko: '현재 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요. 다이어그램은 변경되지 않았습니다.',
    zh: '当前请求过多。请稍后再试。您的图表未更改。',
  },
  'server-error': {
    en: 'A temporary problem occurred. Please try again. Your diagram is unchanged.',
    ko: '일시적인 문제가 발생했습니다. 다시 시도해 주세요. 다이어그램은 변경되지 않았습니다.',
    zh: '出现临时问题。请重试。您的图表未更改。',
  },
  network: {
    en: 'The server could not reach the model provider. Check the network connection and try again. Your diagram is unchanged.',
    ko: '서버가 모델 제공업체에 연결할 수 없습니다. 네트워크 연결을 확인하고 다시 시도해 주세요. 다이어그램은 변경되지 않았습니다.',
    zh: '服务器无法连接模型服务商。请检查网络连接后重试。您的图表未更改。',
  },
  'first-byte-timeout': {
    en: 'The model did not start answering in time, even after a second try. Please try again. Your diagram is unchanged.',
    ko: '다시 시도했지만 응답이 제때 시작되지 않았습니다. 다시 시도해 주세요. 다이어그램은 변경되지 않았습니다.',
    zh: '即使再次尝试，响应也未能及时开始。请重试。您的图表未更改。',
  },
  'idle-timeout': {
    en: 'The response stopped partway through. Please try again. Your diagram is unchanged.',
    ko: '응답이 중간에 중단되었습니다. 다시 시도해 주세요. 다이어그램은 변경되지 않았습니다.',
    zh: '响应中途停止。请重试。您的图表未更改。',
  },
  'total-timeout': {
    en: 'The response took too long. Try a smaller request or try again. Your diagram is unchanged.',
    ko: '응답에 시간이 너무 오래 걸렸습니다. 더 작은 요청으로 시도하거나 다시 시도해 주세요. 다이어그램은 변경되지 않았습니다.',
    zh: '响应时间过长。请尝试更简单的请求或重试。您的图表未更改。',
  },
  'turn-timeout': {
    en: 'This turn took too long and was stopped. Please try again. Your diagram is unchanged.',
    ko: '작업 시간이 초과되어 중단되었습니다. 다시 시도해 주세요. 다이어그램은 변경되지 않았습니다.',
    zh: '本次操作超时已停止。请重试。您的图表未更改。',
  },
  'empty-reply': {
    en: 'The model returned no diagram changes. Please try again or rephrase your request. Your diagram is unchanged.',
    ko: '모델이 다이어그램 변경 사항을 반환하지 않았습니다. 다시 시도하거나 요청을 다른 표현으로 바꿔 주세요. 다이어그램은 변경되지 않았습니다.',
    zh: '模型没有返回任何图表更改。请重试或换个说法。您的图表未更改。',
  },
  'unexpected-reasoning': {
    en: 'The response was not in the expected format. Please try again. Your diagram is unchanged.',
    ko: '응답 형식이 예상과 다릅니다. 다시 시도해 주세요. 다이어그램은 변경되지 않았습니다.',
    zh: '响应格式不符合预期。请重试。您的图表未更改。',
  },
  'stream-error': {
    en: 'An error occurred while responding. Please try again. Your diagram is unchanged.',
    ko: '응답 중 오류가 발생했습니다. 다시 시도해 주세요. 다이어그램은 변경되지 않았습니다.',
    zh: '响应时发生错误。请重试。您的图表未更改。',
  },
  'session-busy': {
    en: 'This chat is still working on the previous message. Please wait for it to finish.',
    ko: '이전 메시지를 아직 처리 중입니다. 완료될 때까지 기다려 주세요.',
    zh: '仍在处理上一条消息。请等待完成。',
  },
  'server-busy': {
    en: 'The server is handling too many requests. Please try again in a few seconds. Your diagram is unchanged.',
    ko: '서버가 너무 많은 요청을 처리 중입니다. 몇 초 후에 다시 시도해 주세요. 다이어그램은 변경되지 않았습니다.',
    zh: '服务器正在处理过多请求。请几秒后重试。您的图表未更改。',
  },
  internal: {
    en: 'Something went wrong on the server. Please try again. Your diagram is unchanged.',
    ko: '서버에 문제가 발생했습니다. 다시 시도해 주세요. 다이어그램은 변경되지 않았습니다.',
    zh: '服务器出现问题。请重试。您的图表未更改。',
  },
  unknown: {
    en: 'The request could not be completed. Please try again. Your diagram is unchanged.',
    ko: '요청을 완료할 수 없습니다. 다시 시도해 주세요. 다이어그램은 변경되지 않았습니다.',
    zh: '请求无法完成。请重试。您的图表未更改。',
  },
};

export const STATUS_COPY: Record<StatusCode, Copy> = {
  fallback: { en: 'Taking longer than usual, trying another way…', ko: '평소보다 오래 걸려 다른 방법으로 시도하는 중…', zh: '耗时比平时长，正在换一种方式重试…' },
  retry: { en: 'Trying again…', ko: '다시 시도하는 중…', zh: '正在重试…' },
  continue: { en: 'Continuing the answer…', ko: '응답을 이어가는 중…', zh: '正在继续回答…' },
  repair: { en: 'Fixing the diagram…', ko: '다이어그램을 수정하는 중…', zh: '正在修复图表…' },
  summary: { en: 'Summarizing older messages…', ko: '이전 메시지를 요약하는 중…', zh: '正在总结旧消息…' },
  // The second pass that completes an answer the content filter stopped: one calm line for all of it.
  finish: { en: 'Finishing the diagram…', ko: '다이어그램을 마무리하는 중…', zh: '正在完成图表…' },
};

/** The UI language for a message: Korean or Chinese when the message is written in that script, else English. */
export function langOf(text: string): Lang {
  const l = detectReplyLanguage(text);
  return l === 'Korean' ? 'ko' : l === 'Chinese' ? 'zh' : 'en';
}

/** The fatal message for a code (http-4xx and other unlisted codes fall back to 'unknown'). */
export function fatalMessage(code: string, lang: Lang): string {
  return (FATAL_COPY[code] ?? FATAL_COPY.unknown)[lang];
}

/** The status line for a code. */
export function statusMessage(code: StatusCode, lang: Lang): string {
  return STATUS_COPY[code][lang];
}
