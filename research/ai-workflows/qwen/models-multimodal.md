I'll research this systematically, starting with the Model Studio international model catalog.

The results suggest newer model generations exist than I assumed. Let me dig into the official pages.

Now let me get pricing details for each modality from the official pricing page.

Let me clarify the pricing page structure (Singapore vs "International" scope) and regional availability.

# Model Studio non‑text model catalog — international site (Singapore first)

Research date 2026‑11‑02. All prices are USD list prices from `alibabacloud.com` unless marked otherwise. Nothing I found contradicts the facts verified on 2026‑10‑31; the international region list I found is the same five (Singapore, US (Virginia), Germany (Frankfurt), Japan (Tokyo), China (Hong Kong)) [https://www.alibabacloud.com/help/en/model-studio/model-pricing] [https://www.alibabacloud.com/help/en/model-studio/regions].

---

## 0. Read this first: how Model Studio prices are keyed (affects your cost engine)

Two independent axes, and the docs conflate them:

| Concept | Meaning | Source |
|---|---|---|
| **Region** | Access point + where static data is stored. Singapore = `ap-southeast-1`. | [https://www.alibabacloud.com/help/en/model-studio/regions] |
| **Service deployment scope** | Where inference actually executes. Values seen: `International`, `Global`, `US`, `Chinese mainland` / `China (Beijing)`. | [https://www.alibabacloud.com/help/en/model-studio/regions] |
| `International` scope | "model inference compute resources are dynamically scheduled worldwide, excluding the Chinese mainland. Static data is stored in your selected region." | [https://www.alibabacloud.com/help/en/model-studio/use-video-generation] |
| Singapore region | "The Singapore region uses the International deployment scope" | [https://www.alibabacloud.com/help/en/model-studio/singapore-regional-access-information] |

**Trap for the catalog:** every *Model Info* page has **two** price tables — first `China (Beijing)` (shown in USD on the English site), then `Singapore / Scope: International`. Confirmed by comparing `qwen-audio-3.1-asr-flash`, where the model page shows $0.113/$0.382 (Beijing) and the Singapore figures are $0.15/$0.47 [https://www.alibabacloud.com/help/en/model-studio/qwen-audio-3-1-asr-flash] [https://ai-tldr.dev/models/qwen-audio-3-1-asr/]. **Your app must take the second table, or the "Deployment scope = International" row on the pricing page.**

Other billing rules that matter for cost estimates:
- Batch = **50 % of the real‑time price** for both input and output, on models that support batch [https://www.alibabacloud.com/help/en/model-studio/model-pricing].
- Context cache discounts **input tokens only**; batch and cache discounts **cannot be combined** [https://www.alibabacloud.com/help/en/model-studio/model-pricing].
- Tiered pricing: the tier is chosen by **total input tokens in the request**, and **all** tokens in the request are billed at that tier [https://www.alibabacloud.com/help/en/model-studio/model-pricing].
- Image token formula for vision models: `tokens = h × w / (32 × 32) + 2`; most models accept up to **16 million pixels per image**; keep resolution within 8K (7680×4320) to avoid timeouts [https://www.alibabacloud.com/help/en/model-studio/vision-model/] [https://www.alibabacloud.com/help/en/model-studio/vision].
- Audio shorter than 1 second is billed as 25 tokens (Beijing table note) [https://help.aliyun.com/zh/model-studio/model-pricing] — **China site only**, treat as unconfirmed internationally.
- Free quota: **"Only models in the Singapore region with the service deployment scope set to International are eligible for a free quota"**; typically 1,000,000 tokens per model, valid 90 days [https://www.alibabacloud.com/help/en/model-studio/new-free-quota].

---

## 1. Vision‑language and OCR / document parsing

### 1a. Dedicated VL line (Qwen3‑VL)

| Model id | Use in a workflow step | In → Out | Limits | Price, Singapore (`International`) | Intl regions | Status |
|---|---|---|---|---|---|---|
| `qwen3-vl-plus` (snapshots `qwen3-vl-plus-2025-09-23`, `-2025-12-19`) | "Read this image/PDF page/screenshot and decide/extract" — the default high‑quality vision step | text, image, video → text | Context window **262,144**; max input 260,096; max output 32,768; thinking‑mode max input 258,048 [https://www.alibabacloud.com/help/en/model-studio/qwen3-vl-plus] | Tiered per 1M tokens: **0<Token≤32K $0.20 in / $1.60 out** (free quota 1M tokens); **32K–128K $0.30 / $2.40**; **128K–256K $0.60 / $4.80**. Non‑thinking and thinking modes priced the same; context‑cache discount; batch half price [https://www.alibabacloud.com/help/tc/model-studio/model-pricing] [https://www.alibabacloud.com/help/ja/model-studio/model-pricing] [https://www.alibabacloud.com/help/en/model-studio/qwen3-vl-plus] | Singapore listed; other intl regions on the same pricing page (HK, Frankfurt, Virginia, Tokyo tables) [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | GA; `-us` snapshot `qwen3-vl-flash-2026-01-22-us` appears in a retirement notice [https://www.alibabacloud.com/en/notice/model_studio_notice_of_retirement_for_selected_legacy_models_7d9?_p_lc=1] |
| `qwen3-vl-flash` (snapshots `-2025-10-15`, `-2026-01-22`) | Cheap/fast captioning, VQA, object grounding, 2D/3D localization, high‑volume image triage | text, image, video → text | Context window **262,144**; max input 260,096; max output 32,768 [https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen3-vl-flash] | **Tiered from $0.05 in / $0.40 out per 1M tokens**, top of range **$0.12 / $0.96** [https://www.alibabacloud.com/en/notice/model_studio_notice_of_retirement_for_selected_legacy_models_7d9?_p_lc=1] [https://www.alibabacloud.com/en/campaign/ai-landing-page-token?_p_lc=1] [https://www.morphllm.com/qwen-api] | same | GA |

Note: `qwen3-vl-plus` is quoted at $0.20/$1.60 by many third‑party trackers and by the Alibaba campaign page range "$0.4 ~ $1.2 in / $1.6 ~ $4.8 out (20 % off)" [https://www.alibabacloud.com/en/campaign/ai-landing-page-token?_p_lc=1]; the tier tables above are the pricing‑page values. Treat the campaign page range as **unconfirmed** for the catalog.

### 1b. Native‑multimodal text models that also read images/video (the ones the docs now recommend)

| Model id | Use in a workflow step | Limits | Price, Singapore (`International`) | Status |
|---|---|---|---|---|
| `qwen3.7-plus` | **Docs' first recommendation for image and video understanding**: "Start with qwen3.7-plus, the flagship Qwen model. It supports 1M context window, up to 2‑hour videos, function calling, and built‑in tools." Use when a step must see an attachment *and* call tools. | 1M context, ≤2 h video [https://www.alibabacloud.com/help/en/model-studio/vision-model/] | 0<Token≤256K: list **$0.40 in / $1.60 out** (non‑thinking and thinking), flagged "Limited‑time 20 % off"; free quota 1M tokens [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | GA |
| `qwen3.7-flash` | Cheap multimodal step | 1M context | 0<Token≤32K **$0.030 / $0.130**; 32K–256K **$0.100 / $0.400**; 256K–1M **$0.200 / $0.800** [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | GA |
| `qwen3.8-max`, `qwen3.8-flash`, `qwen3.6-plus`, `qwen3.6-flash`, `qwen3.5-flash` | Newer/older native vision‑language generations; `qwen3.8-flash` is described as "the latest multimodal model … natively supports" vision [https://www.alibabacloud.com/help/en/model-studio/newly-released-models] | — | `qwen3.8-flash` International **$0.15 in / $0.016 cache‑hit / $0.47 out** [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | GA |
| `gui-plus` | GUI grounding / computer‑use step (mobile + desktop UI understanding, multi‑step tasks) [https://help.aliyun.com/en/model-studio/gui-plus] — **China site only** description page | — | **unconfirmed** | Listed in the intl Vision model list [https://www.alibabacloud.com/help/en/model-studio/model-list-visual-understanding/] |

The intl "Vision" model list contains exactly: `qwen3-vl-plus`, `qwen-vl-ocr`, `qwen3.5-ocr`, `gui-plus` [https://www.alibabacloud.com/help/en/model-studio/model-list-visual-understanding/].

### 1c. OCR / document parsing

| Model id | Use in a workflow step | In → Out | Limits | Price, Singapore | Regions | Status |
|---|---|---|---|---|---|---|
| `qwen-vl-ocr` (= `qwen-vl-ocr-2025-11-20`) | "Extract text/tables/fields from this scan, receipt, invoice, screenshot" — a dedicated OCR step before an LLM step | image → text (+ structured extraction) | Max input **30,000** tokens; max output **8,192**; context **38,192** [https://www.alibabacloud.com/help/en/model-studio/qwenvl-ocr]. Image width and height must each be **> 10 px**; aspect ratio must not exceed **200:1** or **1:200** [https://www.alibabacloud.com/help/en/model-studio/qwen-vl-ocr]. Qwen3‑VL adds Markdown parsing output [https://www.alibabacloud.com/help/en/model-studio/vision] | **$0.07 in / $0.16 out per 1M tokens**, `International`, free quota 1M tokens; the `qwen-vl-ocr-2025-11-20` snapshot row shows **no free quota** [https://www.alibabacloud.com/help/en/model-studio/model-pricing]. A `Global`‑scope row also exists at **$0.043 / $0.072** [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | Singapore + the other intl regions on the pricing page; also `US` and `Global` scopes | GA. Free quota 1M tokens valid 90 days [https://www.alibabacloud.com/help/en/model-studio/qwen-vl-ocr] |
| `qwen3.5-ocr` | Upgraded OCR: "enhanced document parsing, text localization, and key information extraction"; docs recommend it for documents, tables, exam papers, handwriting [https://www.alibabacloud.com/help/en/model-studio/vision-model/] [https://www.alibabacloud.com/help/en/model-studio/newly-released-models] | image → text | — | Pricing page shows it **only in the China (Beijing) table**: **$0.069 in / $0.275 out** [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | **China (Beijing) only** — third‑party rate‑card reads confirm it is absent from Singapore/Virginia/Frankfurt [https://invoiceextractor.ai/qwen-ocr-pricing] [https://ai-api-hub.com/providers/alibaba/pricing/] | **Not sellable to international customers.** Do not draw it. |
| `qwen3-vl-plus` / `qwen3.7-plus` as OCR | For general text extraction from images the docs point to the VL models rather than `qwen3.5-ocr` [https://docs.modelstudio.console.alibabacloud.com/en/model-studio/vision-model] | | | see 1a/1b | | |

---

## 2. Omni and realtime (voice conversation)

Three distinct product lines, all documented under a single "Speech‑to‑speech" overview that contrasts the **single‑model S2S approach (Omni, Qwen‑Audio Realtime, Livetranslate)** with the **pipeline approach (ASR → LLM → TTS)** [https://www.alibabacloud.com/help/en/model-studio/s2s-model].

### 2a. Qwen‑Omni over HTTP (non‑realtime audio/video understanding)

| Model id | Use in a workflow step | In → Out | Limits | Price, Singapore (`International`), per 1M tokens | Status |
|---|---|---|---|---|---|
| `qwen3.8-omni-flash` | "Analyse this call recording / meeting video and summarise or tag it" — batch audio+video understanding step | text, image, audio, video → **text only** [https://www.alibabacloud.com/help/en/model-studio/qwen3-8-omni-flash] | 1M context; **audio up to 3 h, video up to 2 h** for content analysis [https://www.alibabacloud.com/help/en/model-studio/omni/]; max output 131,072; up to 2 h audio/video per file and 64 files per request [https://www.digitalapplied.com/blog/qwen3-8-omni-flash-omnimodal-agents-audio-video-cost] (**unconfirmed** — third party) | **$0.15 input / $0.016 cache‑hit input / $0.47 output** [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | GA (launched 2026‑09‑18) [https://qwen.ai/blog?id=qwen3.8-omni-flash] |
| `qwen3.5-omni-plus` | Higher‑quality audio/video understanding, and the recommended path when you need **non‑realtime audio output** [https://www.alibabacloud.com/help/en/model-studio/models] | text, image, audio, video → text (+ audio) | Max input **196,608**; max output **65,536** [https://www.alibabacloud.com/help/en/model-studio/qwen3-5-omni-plus.md]; audio ≤3 h, video ≤1 h per request [https://www.alibabacloud.com/help/en/model-studio/omni/] | **$1.40** text/image/video in, **$11** audio in, **$8.30** text out, **$44** audio out; free quota 1M tokens [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | Supported regions: **China (Beijing) and Singapore** [https://www.alibabacloud.com/help/en/model-studio/qwen-omni] |
| `qwen3.5-omni-flash` | Cheap omni understanding | same | 256K context [https://www.facebook.com/alibabacloud/posts/1385969770241778/] (**unconfirmed**) | **$0.40** text/image/video in, **$3.00** audio in, **$2.20** text out, **$11.90** audio out [https://www.alibabacloud.com/en/campaign/ai-landing-page-token?_p_lc=1] [https://www.therundown.ai/tools/qwen3-5-omni] | GA |
| `qwen3-omni-flash` | Legacy omni; **HTTP only** (no WebSocket) [https://www.alibabacloud.com/help/en/model-studio/omni/] | text, image, audio, video → text, audio | 65,536 context [https://qwen.ai/apiplatform] | Beijing table $0.315/$2.709/$0.559… [https://www.alibabacloud.com/help/en/model-studio/model-pricing]; International row **not captured — unconfirmed** | Free quota only in Singapore for the Qwen3.5‑Omni and Qwen3‑Omni series [https://www.alibabacloud.com/help/en/model-studio/model-pricing] |

### 2b. Qwen‑Omni‑Realtime (WebSocket / WebRTC voice conversation)

Access: "Use Qwen‑Omni‑Realtime through **WebSocket or WebRTC**" [https://www.alibabacloud.com/help/en/model-studio/realtime].

| Model id | Use in a workflow step | In → Out | Limits | Price, Singapore (`International`), per 1M tokens | Status |
|---|---|---|---|---|---|
| `qwen3.8-omni-flash-realtime` | **The realtime voice/video agent node** — full‑duplex voice bot, phone agent, live video assistant. "supports full‑duplex interaction, accepts text, images, streaming audio…" [https://www.alibabacloud.com/help/en/model-studio/realtime] | streaming text, image, audio, video → **text + audio** | Total input token limit **196,608** per session [https://www.alibabacloud.com/help/en/model-studio/client-events]; 60 RPM / 2,000,000 TPM in both Beijing and Singapore [https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen3-8-omni-flash-realtime] | Beijing table: **$0.212 text/image/video in, $0.848 audio in, $0.636 text out, $1.696 audio out** [https://www.alibabacloud.com/help/en/model-studio/model-pricing] [https://www.alibabacloud.com/help/en/model-studio/qwen3-8-omni-flash-realtime]. **International row not captured — unconfirmed**; the sibling `qwen-audio-3.1-realtime-flash` International price is $0.23/$0.93/$0.70/$1.87. Free quota 1M tokens, Singapore only [https://www.alibabacloud.com/help/en/model-studio/qwen3-8-omni-flash-realtime] | GA. Billing quirk: **bills both the audio and its corresponding text at their respective output rates** [https://www.alibabacloud.com/help/en/model-studio/model-pricing] |
| `qwen3.5-omni-plus-realtime` (= `-2026-03-15`) | Higher‑quality realtime voice | text, image, audio, video → text + audio | — | **International $2.1 / $16.5 / $12.4 / …** [https://www.alibabacloud.com/help/en/model-studio/model-pricing]. Beijing: audio in $11, text+audio out $41.26, text/image/video in $1.38 [https://www.alibabacloud.com/help/en/model-studio/qwen3-5-omni-plus-realtime] | 60 RPM / 100,000 TPM [https://www.alibabacloud.com/help/en/model-studio/rate-limit]. **Bills only the audio; corresponding text is not charged** [https://www.alibabacloud.com/help/en/model-studio/model-pricing] |
| `qwen3.5-omni-flash-realtime` (`-2026-03-15`) | Cheap realtime voice | same | — | **International $0.55 / $4.50 / $3.30 / $17.70**, no free quota [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | GA |

### 2c. Qwen‑Audio Realtime (newer S2S line, function calling + web search + voice cloning)

| Model id | Use in a workflow step | In → Out | Limits | Price, Singapore (`International`), per 1M tokens | Status |
|---|---|---|---|---|---|
| `qwen-audio-3.1-realtime-flash` | Realtime voice agent with **tool calls** — this is the node to draw when the voice bot must call a CRM/helpdesk tool mid‑conversation | text + audio → text + audio | 60 RPM / 100,000 TPM [https://www.alibabacloud.com/help/en/model-studio/qwen-audio-3-1-realtime-flash] | **$0.23 text in / $0.93 audio in / $0.70 text out / $1.87 audio out** [https://www.alibabacloud.com/help/en/model-studio/model-pricing] [https://www.alibabacloud.com/help/en/model-studio/qwen-audio-3-1-realtime-flash]. Beijing: $0.212/$0.848/$0.636/$1.696 [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | GA; WebSocket + WebRTC [https://help.aliyun.com/en/model-studio/qwen-audio-3-1-realtime-flash] |
| `qwen-audio-3.1-realtime-plus` | Premium realtime voice | text + audio → text + audio | 262K context [https://ai-tldr.dev/models/qwen-audio-3-1-realtime/] (**unconfirmed**); 60 RPM / 100,000 TPM [https://www.alibabacloud.com/help/en/model-studio/qwen-audio-3-1-realtime-plus] | **$0.80 / $6.40 / $6.40 / $24.00** [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | GA |
| `qwen3.8-livetranslate-flash-realtime`, `qwen3.5-livetranslate-flash-realtime` | Simultaneous interpretation step (live audio + video → translated text and speech) [https://www.alibabacloud.com/help/en/model-studio/qwen3-8-livetranslate-flash-realtime] | audio, image → text, audio | 53,248 context [https://ai-tldr.dev/models/qwen3-8-livetranslate/] (**unconfirmed**) | Beijing table $5.653 / $0.466 / $14.133 / $22.613 [https://www.alibabacloud.com/help/en/model-studio/model-pricing]; **International row not captured — unconfirmed** | GA |

### 2d. WebSocket endpoints (needed for the app's "how it connects" annotation)

| Region | Realtime base URL |
|---|---|
| Singapore (international) | `wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime?model=<model>` [https://qwen.ai/blog?id=qwen3.8-omni-flash] [https://github.com/nadeembinshajahan/stado/blob/main/backend/app/voice_qwen.py] |
| China (Beijing) | `wss://dashscope.aliyuncs.com/api-ws/v1/realtime` / `wss://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api-ws/v1/realtime` [https://www.alibabacloud.com/help/en/model-studio/realtime] |
| Workspace‑dedicated (recommended) | `wss://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api-ws/v1/realtime`; Alibaba is migrating HTTP from `dashscope-intl.aliyuncs.com` to `{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com` [https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-dashscope] [https://www.alibabacloud.com/help/en/model-studio/regions] |

Protocol: `/api-ws/v1/realtime` is **session‑based**, `/api-ws/v1/inference` is **task‑based** [https://www.alibabacloud.com/help/en/model-studio/realtime-websocket-overview]. First client event must be `session.update` [https://www.alibabacloud.com/help/en/model-studio/client-events]. Java/Python can use the DashScope SDK to skip raw WebSocket handling [https://www.alibabacloud.com/help/en/model-studio/interactive-process-of-qwen-tts-realtime-synthesis].

---

## 3. Speech recognition (ASR)

Selector page: [https://www.alibabacloud.com/help/en/model-studio/asr-model]. Full model list: [https://www.alibabacloud.com/help/en/model-studio/model-list-speech-recognition/].

| Model id | Workflow step | Streaming | Languages (KR/JP/EN/TH/VI/ID/MS coverage) | Audio limits | Price, Singapore (`International`) | Status |
|---|---|---|---|---|---|---|
| `qwen-audio-3.1-asr-flash` | Short‑audio transcription (voice note, IVR utterance) | No (HTTP) | Chinese + multilingual; the 3.1 family is optimized for **Indonesian, Japanese, Thai, Filipino, Vietnamese, Korean, Malay** [https://www.alibabacloud.com/help/en/model-studio/qwen-audio-3-1-asr-flash-message] | 8,192‑token short‑audio window [https://ai-tldr.dev/models/qwen-audio-3-1-asr/] (**unconfirmed**) | **$0.15 in / $0.47 out per 1M tokens** (Beijing $0.113/$0.382) [https://www.alibabacloud.com/help/en/model-studio/qwen-audio-3-1-asr-flash] [https://ai-tldr.dev/models/qwen-audio-3-1-asr/] | GA — current recommended |
| `qwen-audio-3.1-asr-flash-filetrans` | Offline transcription of recordings/meetings | No | as above | **≤2 GB and ≤12 h per file** [https://www.alibabacloud.com/help/en/model-studio/non-realtime-speech-recognition-user-guide] | Beijing $0.113 / $0.382 per 1M tokens; **International $0.15 / $0.47** [https://www.alibabacloud.com/help/en/model-studio/qwen-audio-3-1-asr-flash-filetrans] | GA. Call it with a **Singapore‑region API key** [https://www.alibabacloud.com/help/en/model-studio/non-realtime-speech-recognition-user-guide] |
| `qwen-audio-3.1-asr-flash-streaming` | Live subtitles, real‑time conferencing | **Yes** (WebSocket) | as above | — | Beijing **$0.848 in / $0.636 out**; International table starts **$0.93 in** — **International output price unconfirmed** [https://www.alibabacloud.com/help/en/model-studio/qwen-audio-3-1-asr-flash-streaming] | GA |
| `qwen-audio-3.1-asr-flash-message` | Voice‑message / voice‑input transcription | Yes | "Chinese, English, and other languages, with optimizations for Indonesian, Japanese, Thai, Filipino, Vietnamese, Korean, and Malay" [https://www.alibabacloud.com/help/en/model-studio/qwen-audio-3-1-asr-flash-message] | — | **unconfirmed** | GA. Returns sentence‑ and word‑level timestamps [https://www.alibabacloud.com/help/en/model-studio/real-time-speech-recognition-user-guide] |
| `qwen-audio-3.0-asr-flash`, `-streaming`, `-filetrans` | Previous generation | both | 30 languages incl. English, Japanese, Korean, Vietnamese, Thai, Indonesian, Malay, Filipino, Hindi [https://www.alibabacloud.com/help/en/model-studio/qwen-audio-3-0-asr-flash.md] | — | `-streaming` billed per second of audio; `-filetrans` billed per second [https://www.alibabacloud.com/help/en/model-studio/model-pricing]; **exact intl numbers unconfirmed** | GA |
| `qwen3-asr-flash` | File/short‑audio transcription, billed per audio second | No | 11 languages: Arabic, Chinese, English, French, German, Italian, **Japanese, Korean**, Portuguese, Spanish + 1 [https://qwen.ai/blog?id=41e4c0f6175f9b004a03a07e42343eaaf48329e7] | — | **$0.000035 / second**, scopes `International` and `US` [https://www.alibabacloud.com/help/en/model-studio/model-pricing]. Beijing $0.000032/s [https://www.alibabacloud.com/help/en/model-studio/qwen3-asr-flash] | GA (being superseded by Qwen‑Audio‑3.1) |
| `qwen3-asr-flash-realtime` | Live dictation / call transcription | **Yes** | as above | — | **$0.000090 / second**, free quota **36,000 s (10 h)** [https://www.alibabacloud.com/help/en/model-studio/model-pricing] [https://www.alibabacloud.com/en/campaign/qwen-ai-landing-page?_p_lc=1]. Beijing $0.000047/s [https://www.alibabacloud.com/help/en/model-studio/qwen3-asr-flash-realtime] | GA |
| `qwen3-asr-flash-filetrans` | Async file transcription | No | as above | — | Beijing $0.000032/s; International **$0.000035/s** [https://www.alibabacloud.com/help/en/model-studio/qwen3-asr-flash-filetrans] | GA |
| `fun-asr` | Bulk audio‑file transcription with **speaker diarization** | No | "language support expanded to include English, **Japanese, Korean, Vietnamese, Thai, Indonesian, Malay**, Filipino, Hindi, Arabic" [https://www.alibabacloud.com/help/en/model-studio/fun-asr] | **5 minutes / 2 GB** for the multilingual‑with‑dialects variant [https://www.alibabacloud.com/help/en/model-studio/asr-model] | **$0.000035 / second** (`International`) [https://www.developersdigest.tech/models/speech/alibaba] reading the intl pricing page; Beijing $0.000032/s [https://www.alibabacloud.com/help/en/model-studio/fun-asr] — **International figure needs verification on the page** | GA |
| `fun-asr-realtime` | Realtime dictation, Chinese call centre | **Yes** | Chinese (Mandarin, Cantonese, Wu, Hokkien, Hakka, …) + flexible Chinese/English switching [https://www.alibabacloud.com/help/en/model-studio/asr-model] [https://help.aliyun.com/en/model-studio/fun-asr-realtime] | — | **$0.000047 / second** [https://docs.modelstudio.console.alibabacloud.com/en/model-studio/fun-asr-realtime]; 1,200 RPM [https://www.alibabacloud.com/help/en/model-studio/fun-asr-realtime] | GA. Outputs sentence + word timestamps [https://www.alibabacloud.com/help/en/model-studio/real-time-speech-recognition-user-guide] |
| `fun-asr-mtl` / `fun-asr-mtl-realtime` | Multilingual free language switching | both | **31+ languages** [https://www.alibabacloud.com/help/doc-detail/3044658.html] | — | `fun-asr-mtl-realtime` $0.000047/s [https://ai-api-hub.com/providers/alibaba/pricing/] (**unconfirmed**) | GA |
| `fun-asr-flash-8k-realtime` | 8 kHz telephony, Mandarin call centres | **Yes** | Mandarin only [https://www.alibabacloud.com/help/en/model-studio/fun-asr-flash-8k-realtime] | — | Beijing **$0.000032 / second** [https://www.alibabacloud.com/help/en/model-studio/fun-asr-flash-8k-realtime] | GA (snapshot `-2026-01-28`) |
| `paraformer-v2`, `paraformer-8k-v2` | Legacy file transcription | No | — | — | **$0.000012 / second** [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | **"Paraformer is an older‑generation ASR model family. Migrate to Fun‑ASR or Qwen‑ASR when possible."** [https://www.alibabacloud.com/help/en/model-studio/asr-model] |
| `paraformer-realtime-v2`, `paraformer-realtime-8k-v2` | Legacy realtime | Yes | Mandarin (incl. dialects), English, **Japanese, Korean** (+ German, French, Spanish) [https://www.alibabacloud.com/help/en/model-studio/asr-model] [https://help.aliyun.com/en/model-studio/paraformer-realtime-v2] | — | **$0.000035 / second**, no free quota [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | Legacy — do not draw for new designs |

Cross‑cutting: word‑level timestamps are supported only for Chinese, English, Japanese, Korean, German, French, Spanish, Italian, Portuguese… [https://www.alibabacloud.com/help/en/model-studio/non-realtime-speech-recognition-user-guide]. Async file models (Qwen‑Audio‑ASR‑Filetrans, Fun‑ASR, Qwen3‑ASR‑Filetrans, Paraformer) **do not support streaming output** [https://www.alibabacloud.com/help/en/model-studio/non-realtime-speech-recognition-user-guide].

---

## 4. Speech synthesis (TTS)

Selector page: [https://www.alibabacloud.com/help/en/model-studio/tts-model]. Realtime guide: [https://www.alibabacloud.com/help/en/model-studio/realtime-tts-user-guide].

| Model id | Workflow step | Streaming | Languages (target markets) | Price unit | Price, Singapore (`International`) | Status |
|---|---|---|---|---|---|---|
| `qwen-audio-3.1-tts-flash` | Speak the agent's reply in a realtime or near‑realtime step | **Yes** ("designed for real‑time interactions … streaming speech synthesis") [https://www.alibabacloud.com/help/en/model-studio/qwen-audio-3-1-tts-flash] | **Japanese, Korean, French, German, Portuguese, Italian, Vietnamese, Indonesian** [https://www.alibabacloud.com/help/en/model-studio/qwen-audio-tts-voice-list] | **per 1M tokens** (billed separately for input and output tokens — the only TTS billed this way) [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | **$0.23 in / $1.87 out per 1M tokens** [https://www.developersdigest.tech/models/speech/alibaba] [https://xenospectrum.com/en/qwen-audio-model-comparison/] — **verify the row on the pricing page**; 180 RPM [https://www.alibabacloud.com/help/en/model-studio/rate-limit] | GA — current recommended |
| `qwen-audio-3.1-tts-plus` | Premium brand voice, narration, content creation | Yes | as above; supports natural‑language style instructions [https://www.alibabacloud.com/help/en/model-studio/realtime-tts-user-guide] | **per 10,000 characters** | **$0.30 / 10,000 characters** [https://www.alibabacloud.com/help/en/model-studio/model-pricing]; 180 RPM [https://www.alibabacloud.com/help/en/model-studio/rate-limit] | GA |
| `qwen-audio-3.0-tts-plus` | Previous‑gen premium TTS | Yes | 16 languages: Arabic, Chinese, English, French, German, **Indonesian**, Italian, **Japanese, Korean, Malay**, Portuguese, Russian, Spanish, **Thai, Vietnamese** +2 [https://www.alibabacloud.com/blog/qwen-audio-3-0-tts-more-multilingual-easier-to-direct_603379] | per 10,000 characters | **$0.20 / 10,000 characters**, no free quota [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | GA. A `Mainland China` row also exists ($0.19253) [https://www.alibabacloud.com/help/en/model-studio/model-pricing] |
| `qwen-audio-3.0-tts-flash` | Previous‑gen low‑latency TTS (~300 ms first packet) | Yes | 16 languages as above | per 10,000 characters | **$0.15 / 10,000 characters**, no free quota [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | GA |
| `qwen3-tts-flash` | Cheap offline/batch narration ("read this article aloud") | No (non‑realtime) | 10 languages: Chinese, English, **Japanese, Korean**, German, French, Russian, Portuguese, Spanish, Italian [https://www.alibabacloud.com/blog/qwen3-tts-family-is-now-open-sourced-voice-design-clone-and-generation_602826] — **no Thai/Vietnamese/Indonesian/Malay** | per 10,000 characters, **output free** | **$0.10 / 10,000 characters**; free quota **110,000 characters** [https://www.alibabacloud.com/help/en/model-studio/model-pricing] [https://www.alibabacloud.com/help/id/model-studio/model-pricing] | GA (open‑sourced) |
| `qwen3-tts-flash-realtime` | Stream speech while the LLM generates text | **Yes** | Voice list: Chinese (Mandarin), English, French, German, Russian, Italian, Spanish, Portuguese… [https://www.alibabacloud.com/help/en/model-studio/qwen-tts-voice-list] | per 10,000 characters, output free | **$0.13 / 10,000 characters** [https://www.alibabacloud.com/help/zh/model-studio/model-pricing] [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | GA |
| `cosyvoice-v3-plus` | Voice cloning + expressive multilingual TTS | Yes | **Chinese, English, French, German, Japanese, Korean, Russian, Portuguese, Thai, Indonesian, Vietnamese** [https://www.alibabacloud.com/help/en/model-studio/realtime-tts-user-guide] — best SEA/KR/JP coverage of the CosyVoice line | per 10,000 characters, output free | **$0.26 / 10,000 characters** [https://www.alibabacloud.com/help/en/model-studio/model-pricing] [https://www.alibabacloud.com/help/en/model-studio/cosyvoice-v3-plus]; Beijing $0.286706 | GA |
| `cosyvoice-v3-flash` | Cheap CosyVoice | Yes | as above | per 10,000 characters | **$0.13 / 10,000 characters** [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | GA |
| `cosyvoice-v3.5-plus` | Newest CosyVoice, enhanced cloning/design | Yes | Chinese, English, German, French, Russian, Japanese, Korean… [https://help.aliyun.com/en/model-studio/cosyvoice-v3-5-plus] | per 10,000 characters | **$0.22** — but **"currently available only in the Beijing region"** [https://www.alibabacloud.com/help/en/model-studio/ssml-latex-user-guide] [https://www.alibabacloud.com/help/id/model-studio/model-pricing] | **China site only for practical purposes** |
| `cosyvoice-v3.5-flash` | — | Yes | — | per 10,000 characters | **$0.116** — **Beijing region only** [https://www.alibabacloud.com/help/en/model-studio/ssml-latex-user-guide] [https://www.alibabacloud.com/help/en/model-studio/cosyvoice-v3-5-flash] | **China site only** |

Voice features (relevant for a "brand voice" upsell):
- **Voice cloning**: `qwen-voice-enrollment`, `International`, **$0.01 per voice clone**, 1,000 voices per account [https://www.alibabacloud.com/help/en/model-studio/model-pricing]. But for **Qwen‑Audio‑TTS / Qwen‑Audio‑Realtime / CosyVoice, voice creation is free** — synthesis with the cloned voice is billed at the target model's rate [https://www.alibabacloud.com/help/en/model-studio/voice-cloning-user-guide].
- **Voice design** (create a voice from a ≤200‑character natural‑language description, Chinese and English only): creation free, synthesis billed at target model rate [https://www.alibabacloud.com/help/en/model-studio/voice-design-user-guide] [https://www.alibabacloud.com/help/en/model-studio/voice-design-api-references].
- Account cap: **1,000 custom voices**, shared between cloning and design [https://www.alibabacloud.com/help/en/model-studio/voice-design-user-guide].
- **Voice availability is region‑dependent**: "Multilingual and dialect voices, premium English voices, and additional language voices are available in **Beijing and Singapore**. All other [regions]…" [https://www.alibabacloud.com/help/en/model-studio/qwen-audio-tts-voice-list] — important for Frankfurt/Tokyo/Virginia customers.
- SSML and LaTeX supported for pauses, number reading, pronunciation [https://www.alibabacloud.com/help/en/model-studio/non-realtime-tts-user-guide].

---

## 5. Embedding models

Selector page: [https://www.alibabacloud.com/help/en/model-studio/embedding]. List: [https://www.alibabacloud.com/help/en/model-studio/vector-and-sort/].

### 5a. Text embedding

| Model id | Workflow step | Dimensions | Max input | Price, Singapore (`International`) | Batch price | Status |
|---|---|---|---|---|---|---|
| `text-embedding-v4` | Default "embed the help‑centre article / the ticket" retrieval step | User‑defined **64 → 2048** (supported values 2048, 1536, 1024, 768, 512, 256, 128, 64); 1024 recommended as the performance/cost sweet spot [https://www.alibabacloud.com/help/en/model-studio/text-embedding-v4] [https://www.alibabacloud.com/help/en/model-studio/text-embedding-synchronous-api] [https://www.alibabacloud.com/help/en/model-studio/embedding] | **8,192 tokens per text**; sync API batch = **up to 10 texts per request** [https://www.alibabacloud.com/help/en/model-studio/embedding] [https://www.alibabacloud.com/help/en/model-studio/text-embedding-synchronous-api] | **$0.07 per 1M input tokens**, free quota 1M tokens [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | **$0.035 / 1M** (50 % rule) [https://www.alibabacloud.com/help/en/model-studio/model-pricing]; the model page's Beijing table shows $0.072 real‑time / $0.036 batch [https://www.alibabacloud.com/help/en/model-studio/text-embedding-v4] | GA — docs say "Use text‑embedding‑v4 — it is faster, more cost‑effective, and offers more dimension options" [https://www.alibabacloud.com/help/en/model-studio/embedding-rerank-model/] |
| `text-embedding-v3` | Legacy / existing index compatibility | 1024 default; 768, 512, 256, 128, 64 [https://www.alibabacloud.com/help/en/model-studio/text-embedding-synchronous-api] | 8,192 tokens; up to 10 items per request [https://www.alibabacloud.com/help/en/model-studio/text-embedding-synchronous-api] | **$0.07 per 1M input tokens**, **no free quota** [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | $0.035 / 1M | Legacy |
| `qwen3.7-text-embedding` | Newest text embedding, long documents (contracts, long tickets) | Customizable **256 – 2560** [https://www.alibabacloud.com/help/en/model-studio/qwen3-7-text-embedding] | **131,072 tokens** [https://www.alibabacloud.com/help/en/model-studio/qwen3-7-text-embedding] | Model page: **$0.07 per 1M tokens (Text Input)** [https://www.alibabacloud.com/help/en/model-studio/qwen3-7-text-embedding]; China pricing page lists CNY 0.525 [https://help.aliyun.com/en/model-studio/model-pricing] — **International row on the EN pricing page not captured, treat as unconfirmed** | Batch half price [https://help.aliyun.com/zh/model-studio/model-pricing] | GA |
| `qwen3.7-text-embedding-flash` | High‑volume cheap embedding | 256, 512, 768, 1024 (default 1024) [https://help.aliyun.com/en/model-studio/qwen3-7-text-embedding-flash] | 131,072 tokens [https://help.aliyun.com/en/model-studio/qwen3-7-text-embedding-flash] | China ¥0.125/1M [https://help.aliyun.com/zh/model-studio/model-pricing] — **International price unconfirmed** | Batch half price | GA |

`qwen3.7-text-embedding`, `qwen3.7-text-embedding-flash`, `text-embedding-v4` and `text-embedding-v3` support **three vector output types** (dense/sparse style retrieval strategies) [https://www.alibabacloud.com/help/en/model-studio/embedding]. Text embedding models are **OpenAI‑compatible** [https://www.alibabacloud.com/help/en/model-studio/embedding-interfaces-compatible-with-openai].

### 5b. Multimodal embedding

| Model id | Workflow step | Dimensions | Limits | Price, Singapore (`International`) | Status |
|---|---|---|---|---|---|
| `qwen3-vl-embedding` | Cross‑modal retrieval over screenshots, product photos, video + text in one index | **256 – 2560** (default 2560) [https://help.aliyun.com/en/model-studio/embedding-rerank-model/] | Max input length **32,000** [https://www.alibabacloud.com/help/en/model-studio/qwen3-vl-embedding]; supports **fused** embedding (`enable_fusion=true`) to collapse all inputs into one vector [https://www.alibabacloud.com/help/en/model-studio/multimodal-embedding-api-reference] | **Image/video $0.258, text $0.10 per 1M tokens** [https://www.alibabacloud.com/help/en/model-studio/model-pricing] (PAI Token Service Singapore lists $0.3096 / $0.12 — a different product) [https://www.alibabacloud.com/help/en/pai/product-overview/billing-of-pai-token-service] | GA |
| `tongyi-embedding-vision-plus` | Cost‑effective image/video search | **1152** | **1,024 tokens**, up to **3 MB per image** [https://www.alibabacloud.com/help/en/model-studio/embedding] | **$0.09 per 1M tokens** (image input and text input both $0.09) [https://www.alibabacloud.com/help/en/model-studio/model-pricing] [https://docs.modelstudio.console.alibabacloud.com/en/model-studio/tongyi-embedding-vision-plus] | GA |
| `tongyi-embedding-vision-flash` | Same shape, 3× cheaper on image/video | 64 – 768 (default 768) [https://help.aliyun.com/en/model-studio/embedding-rerank-model/] | 1,024 tokens | **Image/video $0.03, text $0.09 per 1M tokens** [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | GA |
| `multimodal-embedding-v1` | Legacy; generates **separate** vectors per input (no fusion) [https://www.alibabacloud.com/help/en/model-studio/rag-knowledge-base] | — | 1 image + 1 video + 20 text entries max per request, sharing the total limit [https://www.alibabacloud.com/help/en/model-studio/multimodal-embedding-api-reference] | **"Free trial. No token quota limit"** on the intl pricing page [https://www.alibabacloud.com/help/en/model-studio/model-pricing]; China site lists CNY 0.7 / CNY 0.9 [https://help.aliyun.com/en/model-studio/model-pricing] | Legacy |

**Multimodal embedding models do NOT support the OpenAI‑compatible API** — only DashScope native [https://www.alibabacloud.com/help/en/model-studio/embedding-interfaces-compatible-with-openai]. This is a real integration constraint to surface in the proposal export.

---

## 6. Rerank

API page: [https://www.alibabacloud.com/help/en/model-studio/text-rerank-api]. Accepted `model` values: `qwen3-rerank`, `gte-rerank-v2`, `qwen3-vl-rerank` [https://www.alibabacloud.com/help/en/model-studio/text-rerank-api] [https://help.aliyun.com/zh/model-studio/text-rerank-api].

| Model id | Workflow step | In → Out | Limits | Price, Singapore (`International`) | Status |
|---|---|---|---|---|---|
| `qwen3-rerank` | Re‑score the top‑N retrieved help‑centre chunks before the answer step | query + documents → relevance scores | **100+ languages**, long‑text inputs [https://www.alibabacloud.com/help/en/model-studio/qwen3-rerank]; up to **500 documents** per query [https://empiriolabs.ai/pricing] (**unconfirmed**); max tokens per item on the API page [https://www.alibabacloud.com/help/en/model-studio/text-rerank-api] | **$0.10 per 1M input tokens**, free quota 1M tokens [https://www.alibabacloud.com/help/en/model-studio/model-pricing]. Model page Beijing table $0.069/1M [https://www.alibabacloud.com/help/en/model-studio/qwen3-rerank] | GA — **the migration target**: "The gte‑rerank model will be discontinued on May 30, 2026. Switch to qwen3‑rerank." [https://www.alibabacloud.com/help/en/model-studio/text-rerank-api] [https://www.alibabacloud.com/notice/detail?_p_lc=1&id=1873]. Released to `International` scope 2026‑01‑27 [https://www.alibabacloud.com/help/en/model-studio/newly-released-models] |
| `gte-rerank-v2` | Legacy multilingual rerank | same | up to 500 docs, 4K max input per third parties [https://ai.gotry.io/models/gte-rerank-v2] (**unconfirmed**) | **Text input $0.115 per 1M tokens** [https://www.alibabacloud.com/help/id/model-studio/model-pricing] [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | Still sold, but `gte-rerank` (v1) is retired 2026‑05‑30 |
| `qwen3-vl-rerank` | Rerank a **mixed** candidate set of text, images and videos (e.g. search over screenshots + articles) | query + text/image/video docs → scores | — | **Text input $0.10, image input $0.258 per 1M tokens** [https://www.alibabacloud.com/help/en/model-studio/model-pricing] [https://www.alibabacloud.com/help/id/model-studio/model-pricing]; Beijing CNY 0.5 / CNY 0.5 [https://help.aliyun.com/en/model-studio/model-pricing] | GA |
| `qwen3.7-text-rerank` | Newest text reranker | — | — | **unconfirmed** | Listed in Model Studio's public model list per a release tracker [https://www.linkedin.com/posts/your-llm-radar_ai-llm-ainews-activity-7505266742466818049-lGx6] — **unconfirmed** |

---

## 7. Image generation and editing

Selector page: [https://www.alibabacloud.com/help/en/model-studio/image-model/]. Docs' recommendation: **"Start with `qwen-image-3.0-pro` — it supports negative prompts, up to 6 outputs per call, and uses the same model ID for generation and editing."** [https://www.alibabacloud.com/help/en/model-studio/image-model/]

Billing for the Qwen image family: **"Billed by the number of input and output images"** — i.e. an edit pays for the reference image *and* the result [https://www.alibabacloud.com/help/en/model-studio/model-pricing]. Wanx image models bill **output only** [https://www.alibabacloud.com/help/en/model-studio/model-pricing].

| Model id | Workflow step | In → Out | Limits | Price, Singapore (`International`) | Free quota | Status |
|---|---|---|---|---|---|---|
| `qwen-image-3.0-pro` | Flagship generate **and** edit; best complex text rendering (posters, diagrams with labels) | text + up to 3 reference images → PNG | Up to **6 outputs per call**; negative prompts; 2048×2048 max [https://www.alibabacloud.com/help/en/model-studio/image-model/] [https://www.cometapi.com/what-is-qwen-image-3-0/] | 1K: **$0.003 per input image + $0.04 per output image**; 2K: **$0.075 per output image** [https://www.alibabacloud.com/help/en/model-studio/model-pricing] [https://www.therundown.ai/tools/qwen-image-3-0] | **10 images** [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | GA (released 2026‑07‑20, `International`) [https://www.alibabacloud.com/help/en/model-studio/newly-released-models] |
| `qwen-image-3.0` | Standard tier of the same family | text + image → PNG | 1K / 2K | `Global` scope: 1K **$0.002750 in / $0.034380 out**, 2K **$0.068761 out** [https://www.alibabacloud.com/help/en/model-studio/model-pricing]. The retirement notice lists it at **$0.03/image** [https://www.alibabacloud.com/en/notice/model_studio_notice_of_retirement_for_selected_legacy_models_7d9?_p_lc=1] — **reconcile before publishing** | — | GA; 20 RPM, scope `Global` [https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen-image-3-0] |
| `qwen-image-2.1-pro` | Quality tier of the 7B open‑weight family; unified generate + edit, native transparent images | text + image → image | 1K/2K/4K [https://www.alibabacloud.com/help/en/model-studio/text-to-image] | **$0.04 / image** [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | 10 images [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | GA (2026‑10‑02, `International`) [https://www.alibabacloud.com/help/en/model-studio/newly-released-models] |
| `qwen-image-2.1-turbo` | **Cheapest current Qwen image model** — bulk thumbnails, variations | text + image → image | 1K/2K/4K | **$0.016 / image** [https://www.alibabacloud.com/help/en/model-studio/model-pricing] [https://x.com/alibaba_cloud/status/2114939728705327343] | 10 images | GA; 120 RPM |
| `qwen-image-2.0-pro` | Legacy | — | — | **$0.075 / image** [https://www.alibabacloud.com/help/zh/model-studio/model-pricing] [https://www.alibabacloud.com/help/en/model-studio/qwen-image-2-0-pro] | 100 images | Legacy |
| `qwen-image-2.0` | Legacy | — | — | **$0.035 / image** [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | 100 images | Legacy |
| `qwen-image-edit`, `qwen-image-edit-plus`, `qwen-image-edit-max` | Dedicated editing steps (local edit, style transfer, object replacement) | image + instruction → image | — | `qwen-image-edit-max(-2026-01-16)` **$0.075/image** [https://www.alibabacloud.com/en/notice/model_studio_notice_of_retirement_for_selected_legacy_models_7d9?_p_lc=1]; `qwen-image-edit` **$0.043–0.045/image** and `qwen-image-edit-plus` **$0.03/image** [https://ai-api-hub.com/providers/alibaba/pricing/] [https://unifuncs.com/s/Ci5ukbJ8] — **third party, unconfirmed** | All three are in the Singapore free‑quota list [https://www.alibabacloud.com/help/en/model-studio/new-free-quota] | `qwen-image-edit` released 2025‑08‑18, `International` [https://www.alibabacloud.com/help/en/model-studio/newly-released-models] |
| `wan2.7-image-pro` | Wan line: text rendering, brand colours, character‑consistent multi‑image generation and multi‑image editing | text + multi‑image → image | **1K / 2K / 4K shorthands or custom sizes** [https://www.alibabacloud.com/help/en/model-studio/text-to-image] | **$0.075 / image** [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | **50 images** [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | GA (2026‑04‑01, `International`); 5 RPM [https://www.alibabacloud.com/help/en/model-studio/rate-limit] |
| `wan2.7-image` | Cheaper Wan image | text + image → image | 1K/2K/4K | **$0.03 / image** [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | 50 images | GA (2026‑04‑01, `International`); 5 RPM |
| `wan2.6-image` | Wan2.6 generate + edit; **multi‑image input, image editing, interleaved text‑image output** [https://www.alibabacloud.com/help/en/model-studio/wan-image-generation-api-reference] | text + multi‑image → image + text | — | `Global` scope **$0.028671 / image** [https://www.alibabacloud.com/help/en/model-studio/model-pricing]; `International` row not captured — **unconfirmed** | In the Singapore free‑quota list [https://www.alibabacloud.com/help/en/model-studio/new-free-quota] | GA (2025‑12‑15, `International`); 5 RPM |
| `wan2.6-t2i` | Text‑to‑image only | text → image | — | `Global` **$0.028671 / image** [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | yes | GA (2025‑12‑15, `International`) |
| `wan2.5-t2i-preview`, `wan2.5-i2i-preview`, `wan2.2-t2i`, `wanx2.1-t2i-turbo` | Legacy/preview | — | — | — | — | Listed in the image model list [https://www.alibabacloud.com/help/en/model-studio/image-model/] |

There is also an unnamed `Singapore`‑table row at **1K $0.10 / 2K $0.16 / 4K $0.24 per image, no free quota** [https://www.alibabacloud.com/help/en/model-studio/model-pricing] — I could not attribute it to a model id. **Unconfirmed.**

---

## 8. Video generation and editing

Selector page: [https://www.alibabacloud.com/help/en/model-studio/video-generate-edit-model/]. Formula: **Cost = video unit price × duration in seconds**; only output is billed; videos **with sound and silent videos are priced differently** [https://www.alibabacloud.com/help/en/model-studio/model-pricing] [https://www.alibabacloud.com/help/en/model-studio/legacy-image-to-video-api-reference/].

| Model id | Workflow step | Modes | Limits | Price, Singapore (`International`), per output second | Free quota | Status |
|---|---|---|---|---|---|---|
| `wan3.0-video` | The flagship media‑generation step: text/image/audio/video/**documents (PPT, PDF)** → finished clip with native dialogue, BGM and SFX | T2V, I2V (first frame, first+last frame), reference‑to‑video, video editing, video extension [https://www.alibabacloud.com/help/en/model-studio/wan3-video-generation-api-reference] | **≤30 s per generation, 30 fps**, up to **20 multimodal reference assets** per request [https://docs.modelstudio.console.alibabacloud.com/en/model-studio/wan3-video-generation-guide] | **480P $0.05 · 720P $0.10 · 1080P $0.20** (list, flagged "Limited‑time 30 % off") [https://www.alibabacloud.com/help/en/model-studio/model-pricing] [https://www.alibabacloud.com/blog/wan3-0-30-second-ai-video-generation-from-any-input_603452] | **30 seconds** [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | GA [https://www.alibabacloud.com/blog/wan3-0-at-general-availability-capabilities-benchmarks-pricing-and-the-workflows-it-changes_603505] |
| `wan3.0-video-prime` | Same capability, faster — pick when latency matters more than cost | same | same | **480P $0.068 · 720P $0.14 · 1080P $0.28** [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | **No free quota** [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | GA; "significantly" faster, ~40 % more per second at 720P/1080P [https://www.alibabacloud.com/blog/wan3-0-vs--wan3-0-prime-speed-price-and-which-one-your-workflow-needs_603618] |
| `wan2.7-t2v` | Text‑to‑video, previous generation | T2V | 1080P, clips ≤15 s [https://www.alibabacloud.com/help/en/model-studio/video-generate-edit-model/] | **720P $0.10 · 1080P $0.15** [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | **No free quota** (snapshots `-2026-06-12`, `-2026-04-25`) [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | GA |
| `wan2.7-i2v` | Image‑to‑video (first frame / first+last frame) | I2V | ≤15 s | `International`: **720P $0.10 · 1080P $0.15** [https://www.alibabacloud.com/help/en/model-studio/wan2-7-i2v] [https://help.aliyun.com/en/model-studio/model-pricing]. `Global` scope: 720P $0.086012 · 1080P $0.143353 [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | — | GA |
| `wan2.7-r2v` | Reference‑to‑video (character consistency) | R2V | — | ~$0.10/s at 720P [https://www.developersdigest.tech/models/video-generation/alibaba] — **unconfirmed** | — | GA |
| `wan2.6-t2v` | Text‑to‑video with **audio sync and multi‑shot narrative**, intelligent shot scheduling | T2V | 720P/1080P | `International` **720P $0.10 · 1080P $0.15**; a separate `US` scope row is also 720P $0.10 / 1080P $0.15 [https://www.alibabacloud.com/help/en/model-studio/model-pricing] [https://vidofy.ai/en/models/wan/wan-2-6] | yes [https://www.alibabacloud.com/help/en/model-studio/new-free-quota] | GA |
| `wan2.6-i2v` | Image‑to‑video | I2V | ≤15 s at 1080P | `International` **720P $0.10 · 1080P $0.15** [https://vidofy.ai/en/models/wan/wan-2-6] — **verify on the pricing page** | yes | GA |
| `wan2.6-i2v-flash` | **Cheapest video node** — silent or audio clips at scale | I2V | — | `International`: **audio=true → 720P $0.05, 1080P $0.075**; **audio=false → 720P $0.025, 1080P $0.0375**; **no free quota** [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | none | GA |
| `wan2.6-r2v`, `wan2.6-r2v-flash` | Reference‑to‑video | R2V | — | **unconfirmed** | in the Singapore free‑quota list [https://www.alibabacloud.com/help/en/model-studio/new-free-quota] | GA |
| `happyhorse-1.0-t2v` | "Highly realistic dynamic rendering" T2V | T2V | — | `International`: **480P $0.07 · 720P $0.14 · 1080P $0.18** [https://www.alibabacloud.com/help/zh/model-studio/model-pricing] [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | **10 seconds / 90 d** [https://www.alibabacloud.com/help/zh/model-studio/model-pricing]; one row says "No free quota" [https://www.alibabacloud.com/help/en/model-studio/model-pricing] — **conflicting** | GA |
| `happyhorse-1.0-i2v` | Same family, image‑to‑video | I2V | — | `International` 720P … **unconfirmed** [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | — | GA |
| `wan-pro` (professional mode) | — | — | — | **$0.18/second** [https://www.alibabacloud.com/help/zh/model-studio/model-pricing] — **unconfirmed** | — | — |
| `wanx2.1-i2v-*` / Wanx image‑to‑video | Legacy | I2V | 1–5 s [https://help.aliyun.com/en/model-studio/use-video-generation] | — | — | **Legacy API** (2.1–2.6) [https://www.alibabacloud.com/help/en/model-studio/legacy-image-to-video-api-reference/] |

---

## 9. Which of these are China‑site / Beijing‑only (do not draw for international customers)

| Model | Evidence |
|---|---|
| `qwen3.5-ocr` | Only a `China (Beijing)` row on the intl pricing page ($0.069 / $0.275) [https://www.alibabacloud.com/help/en/model-studio/model-pricing]; third‑party rate‑card reads place it in China (Beijing) and note it is absent from Singapore/Virginia/Frankfurt [https://ai-api-hub.com/providers/alibaba/pricing/] [https://invoiceextractor.ai/qwen-ocr-pricing] |
| `cosyvoice-v3.5-plus`, `cosyvoice-v3.5-flash` | "currently available only in the Beijing region" [https://www.alibabacloud.com/help/en/model-studio/ssml-latex-user-guide]; model pages show a `China (Beijing)` rate‑limit block only [https://www.alibabacloud.com/help/en/model-studio/cosyvoice-v3-5-flash] |
| `qwen-audio-3.0-tts-plus` / `-flash`, `qwen-audio-3.1-tts-plus` — **NOT China‑only** | The intl pricing page shows both a `Mainland China` row ($0.19253 / $0.137521 / $0.20) **and** `International` rows ($0.20 / $0.15 / $0.30 per 10,000 characters) [https://www.alibabacloud.com/help/en/model-studio/model-pricing]; the rate‑limit page lists them as `International` 180 RPM [https://www.alibabacloud.com/help/en/model-studio/rate-limit]. Report the International row. |
| Voice library breadth | "Multilingual and dialect voices, premium English voices, and additional language voices are available in **Beijing and Singapore**" — i.e. Frankfurt/Tokyo/Virginia get a reduced voice list [https://www.alibabacloud.com/help/en/model-studio/qwen-audio-tts-voice-list] |
| Legacy models already decommissioned | Model Studio decommissioned a batch of mainline models on **2026‑10‑10** for Beijing and Singapore [https://www.alibabacloud.com/notice/detail?_p_lc=1&id=1841] [https://www.alibabacloud.com/notice/detail?_p_lc=1&id=1938]; a "Selected Legacy Qwen3.5 Models Decommissioning Notice" is dated 2026‑10‑19 [https://www.alibabacloud.com/en/notice/detail?_p_lc=1&id=2217]. Check [https://www.alibabacloud.com/help/en/model-studio/model-depreciation] before shipping any id into the catalog. |

---

## 10. Free quota (Singapore, `International` scope only)

Rule: granted on first activation of Model Studio in Singapore; **only** Singapore region + International scope qualifies; typically **1,000,000 tokens per model, 90 days**, and each snapshot has its own independent quota [https://www.alibabacloud.com/help/en/model-studio/new-free-quota] [https://www.alibabacloud.com/help/en/model-studio/model-pricing].

Non‑token quotas I found: `qwen3-asr-flash-realtime` **36,000 s (10 h)** [https://www.alibabacloud.com/help/en/model-studio/model-pricing]; `qwen3-tts-flash` **110,000 characters** [https://www.alibabacloud.com/help/id/model-studio/model-pricing]; `cosyvoice-v3-plus`/`-flash` **10,000 characters / 90 d** [https://cosyvoice.org/cosyvoice-api] (**third party**); image models **10–100 images** (§7); `wan3.0-video` **30 s**, `happyhorse-1.0-t2v` **10 s** (§8). Qwen3.5‑Omni and Qwen3‑Omni free quota is **Singapore‑only** [https://www.alibabacloud.com/help/en/model-studio/model-pricing].

---

## 11. Open items I could not confirm (verify on the page before publishing)

1. `qwen3.8-omni-flash-realtime` **International** row (I only captured the `Chinese mainland` row $0.212/$0.848/$0.636/$1.696) [https://www.alibabacloud.com/help/en/model-studio/model-pricing].
2. `qwen-audio-3.1-asr-flash-streaming` International **output** price [https://www.alibabacloud.com/help/en/model-studio/qwen-audio-3-1-asr-flash-streaming].
3. `qwen3.7-text-embedding` / `-flash` International price (only the Beijing model‑page $0.07 and China‑site CNY rows captured).
4. `qwen-audio-3.1-tts-flash` International $0.23/$1.87 — sourced from two independent trackers reading the intl page, not from a clean official snippet [https://www.developersdigest.tech/models/speech/alibaba] [https://xenospectrum.com/en/qwen-audio-model-comparison/].
5. `qwen-image-edit`, `qwen-image-edit-plus` per‑image prices; and the unidentified `Singapore` image row at 1K $0.10 / 2K $0.16 / 4K $0.24 [https://www.alibabacloud.com/help/en/model-studio/model-pricing].
6. `qwen-image-3.0`: reconcile $0.03/image (retirement notice) vs `Global`‑scope $0.002750 in / $0.034380 out (1K) and $0.068761 (2K).
7. `wan2.6-t2v` / `wan2.6-i2v` **International** per‑second prices (only `US` scope and third‑party readings captured).
8. `qwen3-omni-flash` and the `livetranslate` models' International rows.
9. `qwen3-vl-plus` **256K<Token≤1M** tier — the pricing page snippet cut off before it; the campaign page implies a top of $1.00 in / $4.00 out, the tier progression implies higher.
10. `gui-plus` price and international availability.
11. Whether `fun-asr` International is $0.000035/s (tracker) or another value — the official snippet I captured only showed the Beijing $0.000032/s.
12. One LinkedIn post claims `tongyi-embedding-vision-plus` was delisted [https://www.linkedin.com/posts/your-llm-radar_ai-llm-ainews-activity-7505265520401604608-iHsy]; the model page and pricing row still resolve — **treat as unconfirmed noise**.

---

## 12. Implications for the app's drawing rules (short)

- **Two‑price trap.** Every Model Info page shows Beijing first. The diagram/cost engine must bind to `Deployment scope = International` (or read the second, "Singapore" table). Getting this wrong understates ASR/TTS costs by ~7–15 % and misstates omni audio by ~4×.
- **Different price units per modality** — the cost estimator needs four units, not one: per 1M tokens (VL, omni, embedding, rerank, Qwen‑Audio‑3.1 ASR/TTS), per second of audio (Qwen3‑ASR, Fun‑ASR, Paraformer), per 10,000 characters (Qwen3‑TTS, CosyVoice, Qwen‑Audio‑3.0/3.1‑Plus TTS), per image / per output second (Wan, Qwen‑Image).
- **Realtime is a different protocol node.** A realtime voice step is not an HTTP call: it is a WebSocket session (`/api-ws/v1/realtime`, `session.update` first) or WebRTC [https://www.alibabacloud.com/help/en/model-studio/realtime-websocket-overview] [https://www.alibabacloud.com/help/en/model-studio/client-events]. Draw it differently from the ASR→LLM→TTS pipeline, which the docs present as the alternative S2S architecture [https://www.alibabacloud.com/help/en/model-studio/s2s-model].
- **Rerank has a hard migration date.** Any diagram still showing `gte-rerank` is wrong after 2026‑05‑30 [https://www.alibabacloud.com/notice/detail?_p_lc=1&id=1873]. Default to `qwen3-rerank`; use `qwen3-vl-rerank` only when candidates include images/video.
- **Region gating is model‑level, not product‑level.** `qwen3.5-ocr` and `cosyvoice-v3.5-*` will fail for a Singapore customer even though the product is "available". The catalog needs a per‑model `regions[]` field, plus a per‑model voice‑list caveat for non‑Singapore intl regions.
- **For the support‑email example in the brief**, none of the media models are needed except OCR/VL for attachments: `qwen-vl-ocr` ($0.07/$0.16) to parse an attached invoice, `text-embedding-v4` ($0.07/1M) + `qwen3-rerank` ($0.10/1M) over help‑centre articles, and `qwen-audio-3.1-tts-flash` only if the reply is spoken.

---

## Searches run (234)

- Alibaba Cloud Model Studio models list qwen3-vl-plus
- alibabacloud.com Model Studio vision language models pricing Singapore
- Model Studio qwen-vl-ocr pricing
- Alibaba Cloud Model Studio text-embedding-v4 pricing dimensions
- Model Studio gte-rerank-v2 pricing
- CosyVoice Model Studio international pricing
- alibabacloud.com model-studio models "vision understanding" qwen3-vl qwen3.6-vl supported models overview
- alibabacloud.com help en model-studio vision qwen3-vl-plus pricing per 1M tokens Singapore
- alibabacloud.com model-studio qwen-vl-ocr model info price max image
- alibabacloud.com model-studio Qwen-Omni realtime WebSocket API qwen3-omni
- alibabacloud.com model-studio speech recognition Fun-ASR Paraformer pricing
- alibabacloud.com model-studio qwen3-tts CosyVoice pricing per 10000 characters languages
- alibabacloud.com model-pricing "qwen3-vl-plus" input output price per million tokens international
- alibabacloud.com model-pricing "qwen3-vl-flash" price
- alibabacloud.com model-pricing visual understanding tiered pricing 0-32K 32K-128K qwen vl
- alibabacloud.com model-pricing "wan2.6" OR "wan3.0" image generation price per image
- alibabacloud.com model-pricing video generation wan2.6-t2v price per second
- alibabacloud.com model-studio qwen-image generation model info price
- "model-studio/vision-model" alibabacloud qwen3.8-vl qwen3.7-vl model list context
- alibabacloud.com model-studio "qwen3.8-vl-plus" OR "qwen3.7-vl-plus" model info
- alibabacloud help en model-studio image generation editing model list wan2.6-image qwen-image
- alibabacloud.com model-studio multimodal embedding tongyi-embedding-vision-plus price
- alibabacloud.com model-pricing text-embedding-v4 batch price per 1M tokens international Singapore
- alibabacloud.com model-pricing gte-rerank-v2 qwen3-rerank price per 1000 tokens
- alibabacloud.com "model-studio/models" supported models capabilities overview visual understanding qwen3.7-vl qwen-vl-ocr list
- alibabacloud.com model-studio qwen-vl-ocr "qwen-vl-ocr" model info max input price per 1M tokens
- alibabacloud.com model-studio vision-model qwen3-vl-plus 1M context pricing tier 0-32K 32K-128K 128K-256K
- alibabacloud.com model-studio model-list-speech-recognition fun-asr paraformer qwen3-asr-flash languages
- alibabacloud.com model-studio asr-model "Fun-ASR" real-time file transcription price per second
- alibabacloud.com model-pricing speech recognition fun-asr price per second international
- alibabacloud.com asr-model "qwen-audio-3.1-asr-flash" languages price real-time file
- alibabacloud.com model-studio speech recognition model list qwen-audio-3.0-asr-flash fun-asr-flash paraformer-realtime-v2 price
- alibabacloud.com model-pricing Qwen3-ASR-Flash price per second international audio duration
- alibabacloud.com realtime-tts-user-guide Qwen TTS CosyVoice languages Korean Japanese Thai Vietnamese Indonesian Malay
- alibabacloud.com model-studio cosyvoice-v3-plus price per 10000 characters international
- alibabacloud.com model-pricing CosyVoice price per 10,000 characters international Singapore
- alibabacloud.com model-pricing Qwen-Omni-Realtime qwen3.8-omni-flash-realtime price text image audio video input output
- alibabacloud.com model-studio realtime Qwen-Omni-Realtime WebSocket WebRTC model list qwen3.5-omni-plus-realtime
- alibabacloud.com model-studio qwen-omni HTTP API text image audio video understanding model list qwen3-omni-flash
- alibabacloud.com model-studio tts-model speech synthesis models voice cloning voice design qwen-audio-3.0-tts cosyvoice-v3.5 list
- alibabacloud.com model-pricing Qwen3-TTS-Flash input price per 10,000 characters international
- alibabacloud.com model-pricing qwen-audio-3.0-tts-flash qwen-audio-3.0-tts-plus price
- alibabacloud.com model-pricing "qwen-audio-3.0-tts" "Mainland China" deployment scope
- alibabacloud.com model-pricing "qwen-audio-3.1-tts" international price per 10,000 characters
- alibabacloud.com tts-model qwen-audio-3.1-tts-flash qwen-audio-3.0-tts-flash international availability Singapore
- alibabacloud.com model-studio image-model image generation editing qwen-image-3.0-pro wan2.6-image list price
- alibabacloud.com model-studio video-generate-edit-model wan3.0 wan2.7 wan2.6 text-to-video image-to-video price per second
- alibabacloud.com model-pricing wan3.0-video wan3.0-video-prime 480P 720P 1080P price per second international
- alibabacloud.com model-studio model-pricing "Deployment scope" International "China (Beijing)" what does deployment scope mean
- alibabacloud.com model-studio supported regions Singapore Virginia Frankfurt Tokyo Hong Kong model availability differs by region
- alibabacloud.com model-studio qwen3-tts-flash model info rate limits Singapore price per 10,000 characters scope international
- alibabacloud.com model-studio embedding text-embedding-v4 2048 dimensions 8192 tokens max batch price Singapore
- alibabacloud.com model-studio qwen3.7-text-embedding model info dimensions price
- alibabacloud.com model-studio vector-and-sort embedding model list text-embedding-v4 v3 multimodal rerank
- alibabacloud.com model-studio regions endpoints "service deployment scope" International Singapore Beijing list
- alibabacloud.com help en model-studio regions "International" "Mainland China" deployment scope endpoint dashscope-intl
- alibabacloud.com model-studio model-pricing "Scope: International" "Singapore" price table region difference
- alibabacloud.com model-studio multimodal-embedding-api-reference tongyi-embedding-vision dimensions max input price
- alibabacloud.com model-pricing text-embedding-v4 "$0.07" international 1 million tokens text-embedding-v3 price
- alibabacloud.com model-pricing qwen3.7-text-embedding qwen3.7-text-embedding-flash price international
- alibabacloud.com model-pricing "qwen3-asr-flash" "$0.000035/second" international
- alibabacloud.com model-pricing "fun-asr" audio file recognition "per second" international free quota 36,000 seconds
- alibabacloud.com model-pricing "qwen-audio-3.1-asr-flash" input tokens output tokens price international
- alibabacloud.com model-pricing qwen3.8-omni-flash-realtime "$0.212" "$0.848" input audio output audio
- alibabacloud.com model-pricing qwen3.5-omni-plus input text image video audio output text audio international price
- alibabacloud.com model-studio realtime Qwen-Omni-Realtime model list qwen3.8-omni-flash-realtime qwen3.5-omni-plus-realtime context 196608
- alibabacloud.com model-pricing "qwen3.5-omni-plus" International input text image video audio output text audio per million tokens
- alibabacloud.com model-pricing qwen3-omni-flash price international input output tokens
- alibabacloud.com model-studio qwen3-5-omni-flash-realtime model info price Singapore international
- alibabacloud.com model-pricing "qwen3-rerank" price international 1 million tokens rerank
- alibabacloud.com model-pricing "gte-rerank-v2" international price per 1 million tokens
- alibabacloud.com model-pricing "qwen3-vl-embedding" price international 1 million tokens
- alibabacloud.com model-studio text-embedding-v4 dimensions 2048 1536 1024 768 512 256 128 64 max input 8192 tokens languages
- alibabacloud.com model-pricing text-embedding-v4 text-embedding-v3 International input price batch 50%
- alibabacloud.com model-studio text-embedding-v3 model info price dimensions 1024 max 8192
- alibabacloud.com model-pricing "qwen-image-3.0-pro" price per image 1k 2k international
- alibabacloud.com model-pricing "wan2.6-image" "wan2.7-image" international price per image
- alibabacloud.com model-studio qwen-image-edit price international image editing model
- alibabacloud.com model-studio regions "service deployment scope" International Global Mainland China definition workspace
- alibabacloud.com model-studio base-url select region service deployment scope access domain International Global
- alibabacloud.com model-pricing "Global" deployment scope wan2.6-image qwen-image-3.0 price per image
- alibabacloud.com model-pricing video generation "wan3.0-video" International 480P 720P 1080P per second free quota
- alibabacloud.com model-pricing "wan2.7-t2v" "wan2.6-t2v" "wan2.6-i2v" international price per second 720P 1080P
- alibabacloud.com model-studio video-generate-edit-model wan3.0-video wan2.7-t2v wan2.6-i2v resolution duration limits
- alibabacloud.com model-studio vision-model "qwen3-vl-plus" "qwen3-vl-flash" context window max output price choose model image video OCR
- alibabacloud.com model-pricing qwen3-vl-plus tiered 0-32K 32K-128K input output price international thinking
- alibabacloud.com model-pricing qwen3-vl-flash international input price output price tiered
- alibabacloud.com model-studio qwen-vl-ocr text extraction Qwen-OCR model list qwen3.5-ocr languages document parsing
- alibabacloud.com model-studio qwen-vl-ocr max input tokens image size limit pixels price international
- alibabacloud.com model-studio vision image token calculation 16 million pixels per image video length limit
- "alibabacloud.com/help/en/model-studio/model-pricing" visual understanding qwen3.7-plus input price output price international
- alibabacloud.com model-pricing "qwen3.6-vl" OR "qwen3.6-plus" vision input price per million tokens international
- alibabacloud.com model-studio qwen3-vl-plus Model Info price Singapore scope international max input tokens
- alibabacloud.com model-studio qwen3-vl-flash Model Info price per 1M tokens Singapore international context
- alibabacloud.com model-studio qwen-vl-ocr Model Info price Singapore scope international max input
- alibabacloud.com model-studio newly-released-models qwen3-vl-plus-2025-12-19 international visual understanding
- alibabacloud.com model-pricing "qwen3-vl-plus" "International" "$0.2" "$1.6" input output price 1 million tokens
- alibabacloud.com model-pricing "qwen3-vl-flash" "International" input price output price
- alibabacloud.com model-pricing qwen3.7-plus vision International 0<Token<=256K input output price
- cloudzero.com qwen api pricing 2026 international vision qwen3-vl-plus qwen3-vl-flash per million tokens table
- maximem.ai qwen api pricing 2026 vision qwen3-vl-plus tiers 32K 128K 256K
- benchlm.ai alibaba api-pricing qwen3-vl-plus qwen3-vl-flash international price
- alibabacloud.com model-pricing qwen3-vl-plus "0<Token≤32K" "32K<Token≤128K" input output
- alibabacloud.com model-pricing qwen3-vl-plus "128K<Token≤256K" "256K<Token≤1M"
- alibabacloud.com model-pricing qwen3-vl-flash "0<Token≤32K" international price
- alibabacloud.com model-studio qwen3-vl-plus model info max input length context window 262144 rate limits international
- alibabacloud.com model-studio qwen3-vl-flash model info max input 1M context price per 1M tokens international
- alibabacloud.com model-studio vision-model qwen3.8-vl qwen3.7-vl newest vision language models list 2026
- "qwen3-vl-plus" International "0<Token≤32K" "$0.3" "$1.5" alibabacloud model-pricing
- qwen3-vl-plus price increase 1M context 256K<Token≤1M $1.6 $9.6 alibaba
- alibabacloud model-pricing qwen3-vl-flash International 0<Token≤32K 32K<Token≤128K input output price
- alibabacloud.com model-studio newly-released-models qwen3-vl-plus-2025-12-19 1 million token context tiered pricing
- qwen3-vl-plus pricing 2026 "$0.30" "$1.50" per million tokens 32K
- alibabacloud qwen3-vl-plus 262144 context 1M context update December 2025 price
- alibabacloud.com model-pricing "qwen3-vl-flash" International "$0.05" "$0.4" 0<Token≤32K
- alibabacloud.com vision-model "Image and video understanding" qwen3.7-plus qwen3.8-max qwen3-vl-plus qwen3-vl-flash model table
- alibabacloud.com model-studio vision-model "OCR" qwen-vl-ocr qwen3.5-ocr models list
- alibabacloud.com model-studio models supported models capabilities overview vision understanding list qwen3.8-max qwen3.7-plus qwen3-vl
- alibabacloud.com model-studio models "Speech recognition" "Speech synthesis" "Embeddings & reranking" "Image generation" list
- alibabacloud.com model-studio models page Qwen-Omni speech-to-speech qwen3.8-omni-flash list
- alibabacloud.com model-studio qwen3-5-ocr Model Info price Singapore international max input languages
- alibabacloud.com model-pricing "qwen3.5-ocr" international input output price per 1 million tokens
- alibabacloud.com model-studio gui-plus model info price visual agent GUI
- alibabacloud.com model-studio vision-model qwen3-vl-plus qwen3-vl-flash qwen3.7-plus qwen3.8-max list of visual understanding models table
- alibabacloud.com model-studio s2s-model speech-to-speech overview Qwen-Audio-Realtime models
- alibabacloud.com model-studio qwen-omni model list qwen3.8-omni-flash qwen3.5-omni-plus qwen3-omni-flash HTTP API limits audio 3 hours video 1 hour
- alibabacloud.com newly-released-models "qwen3.5-ocr" International OR "Mainland China" service scope
- alibabacloud.com model-pricing "qwen3.5-ocr" International deployment scope price
- alibabacloud.com model-studio qwen3.5-ocr model info document parsing text localization price rate limits
- alibabacloud.com model-studio qwen-audio-realtime-user-guides qwen-audio-3.1-realtime-flash duplex voice WebSocket price
- alibabacloud.com model-studio s2s-model speech-to-speech models Omni Qwen-Audio Realtime Livetranslate list
- alibabacloud.com model-pricing qwen-audio-3.1-realtime-flash international price input output audio tokens
- alibabacloud.com model-pricing qwen3.8-omni-flash International input output price per million tokens
- alibabacloud.com model-pricing qwen3.8-omni-flash-realtime International price text image video audio input output
- alibabacloud.com model-pricing qwen3.5-omni-flash International input text image video audio output text audio price
- alibabacloud.com model-pricing qwen-audio-3.1-asr-flash International input output price per million tokens
- alibabacloud.com model-pricing qwen-audio-3.1-realtime-plus International price per million tokens
- alibabacloud.com model-pricing qwen-audio-3.1-tts-flash qwen-audio-3.1-tts-plus International price per 10,000 characters
- alibabacloud.com model-pricing qwen3.5-omni-flash International "$0.4" audio input output price per million tokens
- alibabacloud.com model-pricing qwen3-omni-flash International input output price per million tokens free quota
- alibabacloud.com model-pricing livetranslate qwen3.8-livetranslate-flash-realtime International price
- alibabacloud.com model-pricing text-embedding-v4 International "$0.07" batch "$0.035" text-embedding-v3
- alibabacloud.com model-pricing multimodal embedding "multimodal-embedding-v1" price international
- alibabacloud.com model-studio multimodal embedding qwen3-vl-embedding tongyi-embedding-vision-plus dimensions max input image video limits
- alibabacloud.com model-pricing video generation "wan3.0-video" "wan2.7-t2v" "wan2.7-i2v" "wan2.6-t2v" "wan2.6-i2v" International 480P 720P 1080P per second
- alibabacloud.com model-pricing "happyhorse-1.0-t2v" international price per second
- alibabacloud.com model-pricing Wanx image-to-video wanx2.1-i2v-turbo price per second video generation international
- alibabacloud.com model-pricing "text-embedding-v4" International input price batch price per 1 million tokens
- alibabacloud.com model-studio embedding text-embedding-v4 text-embedding-v3 languages supported 100 price batch 50% discount
- alibabacloud.com model-pricing "qwen3.7-text-embedding" International price per 1 million tokens batch
- alibabacloud.com model-pricing "wan3.0-video" "International" "480P" "$0.05/second" "720P" "$0.1/second" "1080P"
- alibabacloud.com model-pricing wan2.6-t2v wan2.6-i2v International 480P 720P 1080P price per second silent audio
- alibabacloud.com model-studio video-generate-edit-model choose model text-to-video image-to-video reference-to-video wan3.0 wan2.7 wan2.6 duration resolution
- alibabacloud.com model-pricing image generation "qwen-image-3.0" "qwen-image-2.1" "wan2.6-t2i" International price per image
- alibabacloud.com model-studio image-model qwen-image-3.0-pro qwen-image-3.0 qwen-image-2.1-pro qwen-image-2.1-turbo wan2.7-image choose model
- alibabacloud.com model-pricing "qwen3-vl-flash" International input price output price per million tokens free quota
- alibabacloud model-pricing "qwen3-vl-flash" "International" "0<Token≤32K" "$0.05" "$0.4"
- economize.cloud llm cost calculator qwen3-vl-plus qwen3-vl-flash singapore international tiered 32K 128K 256K
- ai-api-hub.com alibaba qwen3-vl-flash pricing tiers international singapore 0<Token<=32K
- alibabacloud.com model-pricing "qwen3-vl-flash" "$0.05" "$0.4" 32K<Token≤256K
- alibabacloud.com model-pricing qwen3-vl-flash International 256K<Token≤1M input output price
- alibabacloud.com model-studio qwen3-vl-flash model info context window 1M max output 65536 international
- alibabacloud.com notice model studio retirement selected legacy models qwen-vl-ocr qwen3-vl-flash tiered pricing from 0.05
- alibabacloud.com model-studio model decommissioning policy discontinued models 2026 list
- alibabacloud.com model-studio text-rerank-api gte-rerank discontinued May 30 2026 qwen3-rerank gte-rerank-v2 qwen3-vl-rerank supported
- alibabacloud.com model-studio multimodal-embedding-api-reference qwen3-vl-embedding tongyi-embedding-vision-plus dimensions 1152 max input image video
- alibabacloud.com model-studio qwen3-vl-embedding Model Info dimensions max input price Singapore international
- alibabacloud.com model-studio embedding multimodal tongyi-embedding-vision-flash dimensions price limits
- docs.modelstudio.console.alibabacloud.com qwen3-vl-plus Model Info pricing input output per 1M tokens Singapore scope international max input length
- docs.modelstudio.console.alibabacloud.com qwen3-vl-flash pricing Singapore scope international tiered
- alibabacloud.com qwen3-vl-plus model info "Max Input Length" "Context Window" 1000000 rate limits International
- alibabacloud.com model-studio qwen3-tts-flash languages supported Chinese English German Italian Portuguese Spanish Korean Japanese French Russian dialects
- alibabacloud.com model-studio tts-model Qwen-Audio-TTS CosyVoice Qwen3-TTS model list supported languages Korean Japanese Thai Vietnamese Indonesian Malay
- alibabacloud.com model-studio qwen-audio-tts-voice-list languages Japanese Korean French German Portuguese Italian Vietnamese Indonesian
- "qwen3-vl-plus" alibabacloud Model Info Pricing "Input" "Per 1M tokens" "Output" "Input(Implicit Cache)" "Input(Batch File)"
- alibabacloud.com model-pricing "qwen3-vl-plus" "$0.3" "$1.5" "$0.5" "$2.5" "$0.8" "$4" "$1.6" "$9.6"
- qwen3-vl-plus Singapore international price 0.3 1.5 0.5 2.5 0.8 4 1.6 9.6 tiered
- alibabacloud.com model-studio tts-model speech synthesis models table CosyVoice qwen-audio-3.1-tts qwen3-tts voice cloning voice design price
- alibabacloud.com model-studio realtime-tts-user-guide cosyvoice-v3-plus languages Chinese English French German Japanese Korean Russian Portuguese Thai Indonesian Vietnamese streaming
- alibabacloud.com model-studio voice-cloning-user-guide qwen-voice-enrollment price voice clone cosyvoice
- alibabacloud.com help tc model-studio model-pricing qwen3-vl-flash 國際 0<Token≤32K 32K<Token≤128K 128K<Token≤256K
- alibabacloud.com help ja model-pricing qwen3-vl-flash 国際 input output price
- alibabacloud.com model-pricing qwen3-vl-flash International "$0.05" "$0.4" "$0.12" "$0.96"
- alibabacloud.com help tc model-pricing wan3.0-video 國際 480P 720P 1080P 每秒 wan2.7-t2v wan2.6-t2v
- alibabacloud.com help id model-pricing video generation wan3.0-video wan2.7-t2v wan2.7-i2v wan2.6-i2v International 480P 720P 1080P per second
- alibabacloud.com model-pricing "wan2.7-t2v" International 720P 1080P price per second free quota
- alibabacloud.com model-pricing "qwen-image-3.0" International 1k 2k price per image free quota
- alibabacloud.com model-pricing "qwen-image-2.1-pro" "qwen-image-2.1-turbo" International price per image
- alibabacloud.com model-pricing "wan2.6-image" "wan2.6-t2i" "qwen-image-edit" International output price per image
- alibabacloud.com model-pricing "wan2.6-i2v" International audio video silent 720P 1080P price per second
- alibabacloud.com model-pricing "wan2.7-i2v" International 720P 1080P price per second audio
- alibabacloud.com model-pricing "wan3.0-video" International "List price $0.05/second" 30% off 30 seconds free quota
- alibabacloud.com model-pricing "qwen-image-edit" "qwen-image-edit-plus" "qwen-image-edit-max" International price per image
- alibabacloud.com model-pricing image generation "wan2.7-image-pro" "wan2.7-image" "wan2.6-image" "wan2.6-t2i" International output price free quota
- alibabacloud.com model-pricing "1K. $0.1/image" "2K. $0.16/image" "4K. $0.24/image" model
- alibabacloud.com model-studio asr-model supported languages Korean Japanese Thai Vietnamese Indonesian Malay Fun-ASR Qwen-ASR Paraformer
- alibabacloud.com model-studio fun-asr languages supported multilingual fun-asr-mtl 31 languages
- alibabacloud.com model-studio paraformer-realtime-v2 languages Chinese English Japanese Korean Yue price
- alibabacloud.com model-studio asr-model Qwen-ASR qwen3-asr-flash 11 languages list Chinese English Japanese Korean Arabic
- alibabacloud.com model-studio asr-model Fun-ASR fun-asr-realtime languages Chinese Cantonese audio length limit 12 hours 2GB
- alibabacloud.com model-pricing paraformer-realtime-v2 paraformer-v2 international price per second free quota
- alibabacloud.com model-studio realtime WebSocket wss dashscope-intl.aliyuncs.com api-ws v1 realtime Qwen-Omni-Realtime endpoint
- alibabacloud.com model-studio embedding qwen3-vl-embedding dimensions 2048 1024 max input 32000 image video limits
- alibabacloud.com model-studio multimodal-embedding-api-reference tongyi-embedding-vision-plus dimensions 1152 max input tokens image video
- alibabacloud.com model-pricing "fun-asr" International "$0.000035/second" audio file recognition free quota
- alibabacloud.com model-pricing Fun-ASR real-time "fun-asr-realtime" International price per second
- alibabacloud.com model-pricing Qwen-ASR "qwen3-asr-flash" "US" "International" input price per second deployment scope
- alibabacloud.com model-studio realtime-websocket-overview WebSocket endpoints authentication wss dashscope-intl.aliyuncs.com/api-ws/v1/realtime
- alibabacloud.com model-studio realtime Qwen-Omni-Realtime supported models qwen3.8-omni-flash-realtime qwen3.5-omni-plus-realtime WebRTC
- alibabacloud.com model-studio asr-model table model real-time file transcription audio limit language Fun-ASR Qwen-ASR Paraformer choose
- alibabacloud.com help id model-pricing "qwen3.5-omni-plus" Internasional "$1.4" "$11" "$8.3" "$44" qwen3.5-omni-flash
- alibabacloud.com model-pricing "qwen3.5-omni-flash" International input text image video audio output price
- alibabacloud.com model-pricing "qwen3-omni-flash" International price free quota Singapore
- alibabacloud.com model-studio omni Qwen3.8-Omni-Flash audio up to 3 hours video up to 2 hours Qwen3.5-Omni content analysis limits
- alibabacloud.com model-studio realtime-websocket-overview service endpoint wss://dashscope-intl.aliyuncs.com api-ws v1 realtime model
- alibabacloud.com model-studio new-free-quota free quota Singapore 1 million tokens 90 days models list vision speech embedding
- alibabacloud.com model-studio websocket connection overview endpoint "wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime"
- alibabacloud.com model-studio qwen3.5-ocr availability Singapore International deployment scope rate limit
- alibabacloud.com model-pricing "qwen3-vl-rerank" International text input image input price per 1 million tokens
- alibabacloud.com model-pricing cosyvoice-v3.5-plus cosyvoice-v3.5-flash International price per 10,000 characters
- alibabacloud.com model-studio cosyvoice-v3-5-plus Model Info languages voice cloning price rate limits international
- alibabacloud.com model-pricing CosyVoice voice cloning qwen-voice-enrollment price per voice clone international
- alibabacloud.com model-pricing "cosyvoice-v3.5-plus" International price 10,000 characters
- alibabacloud.com model-pricing "qwen-audio-3.1-tts-flash" International input output price per million tokens
- alibabacloud.com model-pricing "qwen-audio-3.1-tts-plus" International price per 10,000 characters
- alibabacloud.com model-studio models available only China Beijing not international multimodal models list
- alibabacloud.com model-studio qwen3.5-ocr "China (Beijing)" only availability region
- alibabacloud.com model-pricing "multimodal-embedding-v1" International deployment scope price
- alibabacloud.com model-pricing "qwen-audio-3.0-tts-flash" International price 10,000 characters qwen3-tts-flash International
- alibabacloud.com model-pricing "qwen3-tts-flash" International "$0.1" "qwen3-tts-flash-realtime" International "$0.13"
- alibabacloud.com model-pricing qwen3.8-omni-flash-realtime International input text images video audio output price
- alibabacloud.com model-studio realtime WebSocket endpoint "api-ws/v1/realtime" dashscope-intl Singapore Qwen-Omni-Realtime
- alibabacloud.com model-studio base-url Singapore endpoint dashscope-intl.aliyuncs.com workspace-dedicated domain maas
- alibabacloud.com model-pricing "qwen-image-edit" International price per image "qwen-image-edit-plus" "qwen-image-edit-max"

## Sources returned by search (778)

- https://www.alibabacloud.com/help/en/model-studio/models
- https://www.alibabacloud.com/help/en/model-studio/model-pricing
- https://www.alibabacloud.com/help/en/model-studio/vision
- https://help.aliyun.com/en/model-studio/qwen3-vl-plus
- https://www.alibabacloud.com/en/solutions/generative-ai/qwen?_p_lc=1
- https://www.alibabacloud.com/help/en/model-studio/newly-released-models
- https://en.wikipedia.org/wiki/Qwen
- https://www.youtube.com/watch?v=QmB2qxcQx88&vl=en-US
- https://qwen.ai/research
- https://opencode.ai/data/alibaba
- https://modelstudio.alibabacloud.com/
- https://www.facebook.com/alibabacloud/posts/model-studio-price-drop-up-to-92-savingswe-heard-you-and-reduced-prices-for-cert/1284659137039509/
- https://www.alibabacloud.com/blog/model-studio-token-plan-for-individual-one-subscription-for-every-ai-model-up-to-3x-more-value_603426
- https://www.alibabacloud.com/help/en/model-studio/coding-plan
- https://modelstudio.alibabacloud.com/intl/blog/
- https://aimlapi.com/providers/alibaba-cloud
- https://www.developersdigest.tech/models/fine-tuning/alibaba-model-studio
- https://www.alibabacloud.com/product/model-studio
- https://www.alibabacloud.com/help/en/model-studio/qwen-vl-ocr
- https://www.alibabacloud.com/blog/deploy-ocr-in-function-compute-using-qwen-vl-and-model-studio_602079
- https://custom.typingmind.com/tools/estimate-llm-usage-costs/alibaba/qwen-vl-ocr
- https://try-qwen-ai.com/models/qwen-ocr-models-api/
- https://cloudprice.net/models/alibaba-qwen-vl-ocr
- https://llmpricing.dev/m/alibaba/qwen-vl-ocr/
- https://computeprices.com/models/qwen3-vl-30b-a3b
- https://www.alibabacloud.com/help/en/model-studio/text-embedding-synchronous-api
- https://www.alibabacloud.com/help/en/model-studio/embedding
- https://www.alibabacloud.com/help/en/model-studio/text-embedding-v4
- https://help.aliyun.com/en/model-studio/text-embedding-v4
- https://www.alibabacloud.com/help/en/model-studio/qwen3-7-text-embedding
- https://www.alibabacloud.com/help/en/model-studio/vector-and-sort/
- https://help.aliyun.com/en/model-studio/embedding-rerank-model/
- https://www.requesty.ai/models/alibaba
- https://www.alibabacloud.com/help/en/model-studio/text-rerank-api
- https://aihubmix.com/model/gte-rerank-v2
- https://cloudprice.net/models/alibaba-gte-2-rerank
- https://help.aliyun.com/zh/model-studio/text-rerank-api
- https://www.alibabacloud.com/blog/601776
- https://omniakey.com/pricing
- https://modelslab.com/pricing
- https://ai.gotry.io/models/gte-rerank-v2
- https://apimodels.app/pricing
- https://www.alibabacloud.com/help/en/model-studio/cosyvoice-python-sdk
- https://www.cosyvoice.net/
- https://cloudprice.net/models/alibaba-cosyvoice-3-5-plus
- https://arxiv.org/html/2505.17589v2
- https://cosyvoice.org/
- https://ai.gotry.io/models/cosyvoice-v3-plus
- https://www.reddit.com/r/LocalLLaMA/comments/1pnusp9/alibaba_opensources_cosyvoice_3_a_new_tts_model/
- https://ai-tldr.dev/tools/cosyvoice/
- https://unifiedtts.com/en/pricing
- https://modelstudio.console.alibabacloud.com/eu-central-1/model/market
- https://modelstudio.console.alibabacloud.com/model/market
- https://help.aliyun.com/en/model-studio/newly-released-models
- https://qwen.ai/blog?id=qwen3.7-plus
- https://www.alibabacloud.com/help/en/model-studio/cli/vision
- https://qwen3-vl.com/
- https://qwen.readthedocs.io/
- https://sourceforge.net/software/product/Qwen3-VL/alternatives
- https://www.siliconflow.com/models
- https://www.alibabacloud.com/help/en/model-studio/new-free-quota
- https://www.facebook.com/fb-answers/alibaba-cloud-model-studio-pricing-per-model-token-cost/
- https://www.eesel.ai/blog/qwen-pricing
- https://www.alibabacloud.com/help/en/model-studio/qwenvl-ocr
- https://www.alibabacloud.com/help/en/model-studio/vision-model/
- https://www.alibabacloud.com/help/en/model-studio/qwen-omni
- https://www.alibabacloud.com/help/en/model-studio/realtime
- https://www.alibabacloud.com/help/en/model-studio/omni/
- https://www.alibabacloud.com/help/en/model-studio/client-events
- https://www.alibabacloud.com/blog/603580
- https://qwen.ai/blog?id=fdfbaf2907a36b7659a470c77fb135e381302028&from=research.research-list
- https://qwen.ai/blog?id=qwen3.8-omni-flash
- https://www.alibabacloud.com/help/en/model-studio/non-realtime-speech-recognition-user-guide
- https://www.alibabacloud.com/help/en/model-studio/model-list-speech-recognition/
- https://www.alibabacloud.com/help/en/model-studio/asr-model
- https://www.alibabacloud.com/help/en/model-studio/speech-recognition-api-reference/
- https://www.developersdigest.tech/models/speech/alibaba
- https://www.alibabacloud.com/help/en/model-studio/non-realtime-asr-model-apis/
- https://models.litellm.ai/providers/dashscope
- https://www.alibabacloud.com/blog/alibaba-introduces-fun-asr1-5-advancing-multi-language-speech-recognition_603138
- https://ai.gotry.io/models/fun-asr
- https://www.alibabacloud.com/help/en/model-studio/realtime-tts-user-guide
- https://www.therundown.ai/tools/qwen3-tts
- https://www.alibabacloud.com/help/en/model-studio/qwen3-tts-flash
- https://www.buildfastwithai.com/blogs/qwen-audio-3-tts
- https://www.alibabacloud.com/blog/qwen3-tts-family-is-now-open-sourced-voice-design-clone-and-generation_602826
- https://www.alibabacloud.com/help/en/model-studio/non-realtime-tts-user-guide
- https://apimart.ai/blog/qwen-audio-3-0-tts-api-guide-pricing-voice-controls
- https://www.alibabacloud.com/en/campaign/ai-landing-page-token?_p_lc=1
- https://www.morphllm.com/qwen-api
- https://www.maximem.ai/blog/qwen-api-pricing-2026
- https://qwen.ai/apiplatform
- https://developer.puter.com/tutorials/qwen-api-pricing/
- https://www.secondtalent.com/resources/every-qwen-ai-model-explained-compared/
- https://www.alibabacloud.com/help/en/model-studio/model-training-and-deployment-billing
- https://orq.ai/models/alibaba-qwen3-vl-flash
- https://www.alibabacloud.com/help/en/model-studio/model-release-notes
- https://aimlapi.com/models/qwen3-vl-flash
- https://benchlm.ai/alibaba/api-pricing
- https://developer.puter.com/ai/qwen/qwen3-vl-flash/
- https://trustedrouter.com/providers/alibaba
- https://www.alibabacloud.com/blog/wan3-0-30-second-ai-video-generation-from-any-input_603452
- https://www.alibabacloud.com/help/en/model-studio/wan-image-generation-api-reference
- https://www.alibabacloud.com/blog/wan3-0-vs--wan3-0-prime-speed-price-and-which-one-your-workflow-needs_603618
- https://www.alibabacloud.com/blog/603617
- https://www.therundown.ai/tools/wan-2-6
- https://www.facebook.com/alibabacloud/posts/how-do-creators-actually-use-wan-30-in-real-projects-beyond-pressing-generatewe-/1520833096755444/
- https://deepinfra.com/blog/wan-3-0-pricing-guide
- https://www.alibabacloud.com/blog/603505
- https://www.facebook.com/alibabacloud/posts/wan30-is-now-on-token-plan-one-subscription-one-monthly-credit-pool-and-wans-lat/1567081932130560/
- https://www.alibabacloud.com/help/en/model-studio/text-to-video-api-reference
- https://www.alibabacloud.com/help/en/model-studio/wan2-6-t2v
- https://www.alibabacloud.com/help/en/model-studio/video-generate-edit-model/
- https://vidofy.ai/en/models/wan/wan-2-6
- https://www.alibabacloud.com/en/press-room/alibaba-unveils-wan2-6-series-enabling-everyone?_p_lc=1
- https://www.facebook.com/alibabacloud/videos/wan30-is-now-generally-available/1541471560499822/
- https://www.mindstudio.ai/blog/what-is-wan-2-6-image
- https://lumenfall.ai/models/alibaba/wan-2.6
- https://www.alibabacloud.com/help/en/model-studio/qwen-image-2-0.md
- https://www.alibabacloud.com/help/en/model-studio/qwen-image-api
- https://slashdot.org/software/comparison/Alibaba-Cloud-Model-Studio-vs-Qwen-Image-3.0/
- https://arxiv.org/html/2608.30760v1
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/vision-model
- https://www.alibabacloud.com/help/en/model-studio/image-model/
- https://www.alibabacloud.com/blog/qwen-image-2-1-compact-efficient-and-unified-image-creation_603586
- https://help.aliyun.com/en/model-studio/qwen-image-api
- https://www.alibabacloud.com/help/en/model-studio/qwen-image-api-reference/
- https://aihubmix.com/model/qwen-image-edit
- https://runware.ai/creators/alibaba
- https://www.atlascloud.ai/models/qwen-image
- https://qwen.ai/blog?id=qwen-image-edit
- https://www.alibabacloud.com/help/en/model-studio/multimodal-embedding-api-reference
- https://www.alibabacloud.com/help/en/model-studio/tongyi-embedding-vision-plus
- https://www.linkedin.com/posts/your-llm-radar_ai-llm-ainews-activity-7505266742466818049-lGx6
- https://alibaba-cloud.medium.com/developing-multimodal-services-using-qwen-and-model-studio-ab9eb3b91459
- https://help.aliyun.com/en/model-studio/model-pricing
- https://cabina.ai/blog/qwen-api-pricing/
- https://www.alibabacloud.com/help/en/model-studio/qwen3-rerank
- https://openrouter.ai/qwen/qwen3-reranker-8b
- https://www.alibabacloud.com/blog/mastering-text-embedding-and-reranker-with-qwen3_602308
- https://www.alibabacloud.com/help/en/model-studio/gte-rerank-v2.md
- https://api.airforce/models/qwen3-rerank/
- https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-dashscope
- https://github.com/cinience/alicloud-skills/blob/main/README.md
- https://context7.com/qwenlm/qwen3-vl
- https://www.facebook.com/groups/599560989717455/posts/1018962464443970/
- https://www.alibabacloud.com/help/en/model-studio/first-api-call-to-qwen
- https://news.ycombinator.com/item?id=46766741
- https://developer.puter.com/ai/qwen/qwen-vl-ocr-2025-11-20/
- https://seminal.ai/providers/alibaba-qwen/
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwenvl-ocr
- https://www.funvisiontutorials.com/blog/automated-document-understanding-intelligence-qwen-35-series/
- https://big-agi.com/alibaba
- https://qwen.ai/blog?id=qwen3.5
- https://opper.ai/alibaba/qwen3-vl-plus
- https://help.aliyun.com/en/model-studio/qwen3-asr-flash
- https://www.alibabacloud.com/help/en/model-studio/real-time-speech-recognition-user-guide
- https://modelstudio.console.alibabacloud.com/us-east-1
- https://qwen.ai/blog?id=e199227023e8ebaac5f348f97fa804d1858ffc8a&from=research.research-list
- https://www.reddit.com/r/aicuriosity/comments/1nbrynj/qwen3asrflash_alibabas_new_speech_recognition/
- https://www.alibabacloud.com/blog/qwen3-asr-%26-qwen3-forcedaligner-is-now-open-sourced-robust-streaming-and-multilingual_602843
- https://www.alibabacloud.com/help/en/model-studio/fun-asr-recorded-speech-recognition-http-api.md
- https://www.lecsync.com/blog/lecsync-vs-alibaba-cloud-realtime-asr-api
- https://blog.cubed.run/qwens-voice-stack-got-cheap-and-the-open-version-is-somewhere-else-567bb096ea2c
- https://www.alibabacloud.com/help/en/model-studio/fun-asr-recorded-speech-recognition-java-sdk
- https://huggingface.co/Qwen/Qwen3-ASR-1.7B
- https://modelstudio.alibabacloud.com/intl/blog/model-studio-token-plan-individual/
- https://www.alibabacloud.com/help/en/model-studio/fun-asr
- https://www.alibabacloud.com/help/en/model-studio/fun-asr-realtime
- https://www.alibabacloud.com/help/en/model-studio/fun-asr-flash-8k-realtime
- https://www.alibabacloud.com/help/doc-detail/3044658.html
- https://scx.ai/models/fun-asr
- https://www.nocode.mba/ai-release-tracker/releases/qwen-audio-3-1-speech-suite
- https://www.alibabacloud.com/help/en/model-studio/qwen-asr-message-python-sdk
- https://www.beri.net/article/qwen-audio-3-1-asr-price-cut-token-billing-per-hour-deepgram-assemblyai-renewal
- https://ai-tldr.dev/models/qwen-audio-3-1-asr/
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen-audio-3-1-asr-flash-streaming
- https://xenospectrum.com/en/qwen-audio-model-comparison/
- https://alphasignal.ai/news/alibaba-s-qwen-audio-3-0-asr-flash-hits-95-accuracy-on-medical-jargon
- https://help.aliyun.com/en/model-studio/qwen-audio-3-1-asr-flash-message
- https://baike.baidu.com/en/item/Qwen-Audio-3.0-ASR-Flash/4165937
- https://qwen.ai/blog?id=41e4c0f6175f9b004a03a07e42343eaaf48329e7&from=research.latest-advancements-list
- https://www.alibabacloud.com/help/en/model-studio/qwen3-asr-flash
- https://www.alibabacloud.com/help/en/model-studio/qwen3-asr-flash-filetrans
- https://www.facebook.com/groups/aifire.co/posts/1803580556913912/
- https://www.alibabacloud.com/help/en/model-studio/qwen3-asr-flash-realtime
- https://ai.gotry.io/models/qwen-audio-3-0-asr-flash
- https://cloudprice.net/models/alibaba-qwen3-asr-flash-realtime
- https://www.alibabacloud.com/blog/qwen-audio-3-0-tts-more-multilingual-easier-to-direct_603379
- https://qwen.ai/blog?id=qwen3tts-0115
- https://www.alibabacloud.com/help/en/model-studio/tts-model
- https://github.com/QwenLM/Qwen3-TTS
- https://www.alibabacloud.com/help/en/model-studio/qwen-audio-tts-voice-list
- https://qwen.ai/blog?id=qwen3-tts-1128
- https://www.youtube.com/watch?v=o22vFJzPSJY
- https://dev.to/czmilo/qwen3-tts-the-complete-2026-guide-to-open-source-voice-cloning-and-ai-speech-generation-1in6
- https://www.alibabacloud.com/help/en/model-studio/cosyvoice-v3-plus
- https://www.alibabacloud.com/help/en/model-studio/cosyvoice-v3-5-plus
- https://github.com/jakemanger/whatmodel/blob/main/pages/model/cosyvoice-v3-plus.md
- https://www.alibabacloud.com/help/en/model-studio/cosyvoice-v3-flash
- https://help.aliyun.com/en/model-studio/cosyvoice-v3-plus
- https://www.alibabacloud.com/help/en/model-studio/cosyvoice-v3-5-flash.md
- https://www.alibabacloud.com/en/pricing?_p_lc=1
- https://www.alibabacloud.com/help/en/model-studio/qwen3-8-omni-flash
- https://www.facebook.com/groups/1283855437217819/posts/1429358669334161/
- https://explainx.ai/blog/qwen-3-8-omni-flash-launch-2026
- https://help.aliyun.com/en/model-studio/qwen3-8-omni-flash-realtime
- https://www.alibabacloud.com/help/en/model-studio/omni
- https://qwen.ai/blog?id=qwen3.5-omni
- https://www.tiktok.com/@alibaba__cloud/video/7623424227269479701
- https://www.therundown.ai/tools/qwen3-5-omni
- https://www.facebook.com/AlibabaCloudSEA/posts/-qwen35-omni-is-liveplus-flash-variants-now-on-model-studio-native-omni-modal-te/964191919508708/
- https://www.alibabacloud.com/help/en/model-studio/qwen3-5-omni-flash
- https://github.com/QwenLM/Qwen3-Omni
- https://www.alibabacloud.com/help/en/model-studio/voice-cloning-user-guide
- https://alphasignal.ai/news/alibaba-s-qwen-audio-3-0-tts-tops-speech-arena-with-16-language-voice-cloning
- https://www.alibabacloud.com/help/en/model-studio/speech-synthesis/
- https://qwen.ai/blog?id=qwen3-tts-vc-voicedesign
- https://www.alibabacloud.com/help/en/model-studio/qwen3-tts-flash-realtime
- https://www.requesty.ai/models/alibaba/qwen3.8-flash
- https://www.alibabacloud.com/help/en/model-studio/qwen-audio-3-0-tts-plus
- https://x.com/ArtificialAnlys/status/2077140161335631957?lang=en
- https://openrouter.ai/compare/qwen/qwen-audio-3.0-tts-flash/qwen/qwen-audio-3.0-tts-plus
- https://techjacksolutions.com/ai-tools/qwen/qwen-audio-3-tts/
- https://www.facebook.com/alibabacloud/posts/qwen-audio-30-tts-is-here-%EF%B8%8Four-latest-text-to-speech-model-in-two-flavors-flash-/1486362963535791/
- https://help.aliyun.com/en/model-studio/token-plan-team-overview
- https://www.alibabacloud.com/help/id/model-studio/model-pricing
- https://codingplan.cyberwald.com/
- https://www.eggstriker.com/en
- https://llmlearner.com/models/qwen-audio-3-1-tts-flash
- https://help.aliyun.com/en/model-studio/qwen-audio-3-1-tts-plus
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen-audio-3-0-tts-plus
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen-audio-3-1-tts-plus
- https://www.alibabacloud.com/help/en/model-studio/rate-limit
- https://benchmarks.speko.ai/tts/qwen-qwen-audio-3-1-tts-plus/
- https://www.alibabacloud.com/help/en/model-studio/qwen-audio-3-1-tts-flash
- https://qwen.ai/blog?id=b4264e11fb80b5e37350790121baf0a0f10daf82
- https://openrouter.ai/compare/google/gemini-3.1-flash-tts-preview/qwen/qwen-audio-3.0-tts-flash
- https://www.alibabacloud.com/blog/qwen-image-3-0-rich-content-authentic-details-deep-knowledge_603385
- https://www.alibabacloud.com/help/en/model-studio/qwen-image-generation-and-editing-api-reference
- https://help.aliyun.com/en/model-studio/image-model/
- https://myclaw.ai/blog/qwen-image-2-0-vs-3-0
- https://wiro.ai/models/alibaba/qwen-image-3-0-pro
- https://www.facebook.com/AlibabaCloudSEA/posts/this-is-wan30simple-input-smart-creation-where-imagination-meets-realitywan30-is/1085326894061876/
- https://www.alibabacloud.com/help/en/model-studio/wan3-video-generation-api-reference
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/wan3-video-generation-api-reference
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/wan3-video-generation-guide
- https://modelstudio.alibabacloud.com/intl/blog/wan3-ai-video-generation-model/
- https://modelstudio.console.alibabacloud.com/model-releases/wan3.0-video
- https://www.alibabacloud.com/help/en/model-studio/wan3-0-video-prime
- https://help.aliyun.com/en/model-studio/wan3-0-video-prime
- https://models.litellm.ai/models/wan3.0-video-prime
- https://www.developersdigest.tech/models/video-generation/alibaba
- https://ofox.ai/blog/wan-3-0-api-pricing-2026/
- https://www.eachlabs.ai/alibaba/wan-3-0/alibaba-wan-3-0-prime-text-to-video
- https://www.alibabacloud.com/help/en/model-studio/regions
- https://www.alibabacloud.com/help/en/model-studio/web-search
- https://try-qwen-ai.com/safety/qwen-studio-api-local-privacy/
- https://www.digitalapplied.com/blog/qwen3-8-omni-flash-omnimodal-agents-audio-video-cost
- https://github.com/jakemanger/whatmodel/blob/main/pages/model/qwen3-8-omni-flash.md
- https://www.developersdigest.tech/models/data-retention/qwen
- https://www.alibabacloud.com/help/en/model-studio/germany-frankfurt-global
- https://help.aliyun.com/en/model-studio/what-is-model-studio
- https://stackoverflow.com/questions/52562959/where-does-ali-cloud-keep-a-full-list-of-availability-zones
- https://www.alibabacloud.com/help/en/cloud-migration-guide-for-beginners/latest/regions-and-zones
- https://help.aliyun.com/en/model-studio/qwen3-tts-flash
- https://www.facebook.com/alibabacloud/posts/qwen38-flash-is-now-available-in-the-european-union-on-alibaba-cloud-model-studi/1582315680607185/
- https://www.alibabacloud.com/help/en/model-studio/embedding-interfaces-compatible-with-openai
- https://www.sandbase.ai/model/alibaba/text-embedding-v4
- https://help.aliyun.com/en/model-studio/text-embedding-synchronous-api
- https://www.facebook.com/alibabacloud/videos/model-studio-finalmp4/874348851197500/
- https://pecollective.com/tools/text-embedding-models-compared/
- https://help.aliyun.com/en/model-studio/qwen3-7-text-embedding-flash
- https://modelstudio.console.alibabacloud.com/ap-northeast-1?tab=doc
- https://www.alibabacloud.com/help/en/model-studio/embedding-rerank-model/
- https://www.alibabacloud.com/blog/qwen3-vl-embedding-and-qwen3-vl-reranker-for-the-next-generation-of-multimodal-retrieval_602796
- https://k-farruh.medium.com/mastering-text-embedding-and-reranker-with-qwen3-3284e7ae14c7
- https://milvus.io/blog/hands-on-rag-with-qwen3-embedding-and-reranking-models-using-milvus.md
- https://arxiv.org/abs/2506.05176
- https://www.youtube.com/watch?v=hize6rD6Afk
- https://www.modelscope.cn/models/Qwen/Qwen3-Embedding-8B
- https://www.alibabacloud.com/help/en/model-studio/base-url
- https://help.aliyun.com/en/model-studio/base-url
- https://www.francisokafor.com/field-notes/china-available-llm-apis-from-mainland
- https://docs.litellm.ai/docs/providers/dashscope
- https://docs.api7.ai/ai-gateway/providers/qwen
- https://qwenlm.github.io/qwen-code-docs/en/users/configuration/model-providers/
- https://therouter.ai/blog/qwen3-7-max-multimodal-vs-gpt-4o-claude-sonnet-4-comparison/
- https://github.com/3sk1nt4n/Sentinel-Ensemble-Qwen
- https://www.skillsdirectory.com/skills/clawic-qwen
- https://www.alibabacloud.com/help/en/model-studio/qwen3-8-max
- https://www.alibabacloud.com/help/en/model-studio/qwen3-8-27b.md
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/newly-released-models?ref=cms.llms.blog
- https://community.cometapi.com/t/qwen-image-2-1-turbo-lands-at-0-016-an-image-what-actually-changes-for-a-team-picking-an-image-model/1807
- https://modelglass.com.au/models/alibaba--qwen-3.8-2.4t-a95b?srsltid=AYCX9vKa41_gwheX6j-0oNqYsW31LeB_shDe8DcXfsy8SoquQD2-WJzA
- https://help.aliyun.com/en/model-studio/qwen3-8-max
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen3-8-max?ref=siliconsnark.com
- https://help.aliyun.com/en/model-studio/qwen3-8-27b
- https://help.aliyun.com/en/model-studio/tongyi-embedding-vision-plus
- https://help.aliyun.com/en/model-studio/multimodal-embedding-v1
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/model-training-and-deployment-billing
- https://empiriolabs.ai/pricing
- https://chierhu.medium.com/the-economics-of-chinese-llm-pricing-unit-economics-and-the-competitive-endgame-b04fc5aab128
- https://aimultiple.com/llm-pricing
- https://naga.ac/models
- https://pricepertoken.com/
- https://mofcloud.com/tools/model-picker
- https://www.requesty.ai/models/alibaba/qwen3.7-max
- https://openrouter.ai/qwen/qwen3.7-plus:batch
- https://orq.ai/models/alibaba-qwen3.7-flash
- https://artificialanalysis.ai/providers/alibaba_cloud
- https://www.alibabacloud.com/pt-BR/campaign/qwen-ai-landing-page?_p_lc=1
- https://www.alibabacloud.com/es/campaign/ai-landing-page-token?_p_lc=1
- https://ai.gotry.io/models/qwen3-asr-flash-filetrans
- https://llmlearner.com/models/qwen3-asr
- https://www.alibabacloud.com/campaign/new-region-brazil
- https://www.alibabacloud.com/campaign/ai-tools-for-e-commerse-and-advertising
- https://www.developersdigest.tech/models/speech/speech-to-text
- https://opengauntlet.com/asr-survey.html
- https://www.alibabacloud.com/help/en/model-studio/qwen-audio-3-1-asr-flash-streaming
- https://www.alibabacloud.com/help/en/model-studio/qwen-audio-3-1-asr-flash
- https://www.alibabacloud.com/help/en/model-studio/qwen-audio-3-1-asr-flash-filetrans
- https://www.alibabacloud.com/help/en/model-studio/qwen-audio-3-1-asr-flash-message
- https://bailian.console.alibabacloud.com/
- https://try-qwen-ai.com/models/qwen3-8-omni-flash/
- https://ai-api-hub.com/providers/alibaba/pricing/
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen-audio-3-1-realtime-flash
- https://www.orcarouter.ai/es/blog/lfm3-audio-vs-qwen-audio-3-1
- https://ai-api-hub.com/changelog/
- https://www.alibabacloud.com/help/en/model-studio/qwen3-5-omni-plus-realtime
- https://www.alibabacloud.com/help/en/model-studio/qwen3-5-omni-plus.md
- https://www.facebook.com/alibabacloud/posts/qwen-35-omni-redefining-multimodal-intelligenceexperience-the-power-of-a-truly-n/1386406420198113/
- https://scx.ai/models/qwen3-5-omni-plus-realtime
- https://venturebeat.com/technology/alibabas-qwen3-7-plus-supports-text-video-and-imagery-inputs-at-low-cost-of-0-4-1-6-per-1m-token-but-its-proprietary
- https://techjacksolutions.com/ai-brief/alibaba-qwen3-8-omni-flash-real-time-voice-benchlm/
- https://ai-tldr.dev/models/qwen3-8-omni-flash/
- https://www.alibabacloud.com/help/en/pai/product-overview/billing-of-pai-token-service
- https://arxiv.org/html/2604.15804v2
- https://news.aibase.com/news/31158
- https://www.facebook.com/alibabacloud/posts/-qwen35-omni-is-liveplus-flash-variants-now-on-model-studio-native-omni-modal-te/1385969770241778/
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen3-8-omni-flash-realtime
- https://orq.ai/models/alibaba-qwen3.8-omni-flash
- https://wavespeed.ai/blog/posts/qwen3-5-omni-api-pricing-2026/
- https://www.alibabacloud.com/help/en/model-studio/qwen3-8-omni-flash-realtime
- https://www.alibabacloud.com/help/en/model-studio/qwen3-5-omni-flash-realtime
- https://x.com/alibaba_cloud/status/2038816712401752141
- https://www.alibabacloud.com/help/tr/pai/product-overview/billing-of-pai-token-service
- https://www.facebook.com/groups/DeepNetGroup/posts/2745376735855191/
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/newly-released-models
- https://help.aliyun.com/en/polardb/polardb-for-mysql/polardb-agent-memory-billing-description
- https://aihubmix.cyou/models
- https://help.aliyun.com/zh/model-studio/model-pricing
- https://www.alibabacloud.com/help/en/emr/emr-serverless-starrocks/ai-function-billing
- https://www.alibabacloud.com/blog/from-models-to-momentum-how-alibaba-turned-artificial-intelligence-into-a-real-world-utility-in-2025_602797
- https://huggingface.co/papers?q=Qwen
- https://docs.aimlapi.com/api-references/embedding-models/alibaba-cloud/qwen-text-embedding-v4
- https://docs.avalai.ir/en/api-reference/embeddings
- https://www.alibabacloud.com/help/en/model-studio/text-embedding-v3
- https://huggingface.co/Qwen/Qwen3-Embedding-8B
- https://www.alibabacloud.com/help/en/model-studio/qwen-image-3-0-pro
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen-image-3-0
- https://felloai.com/qwen-image-generator/
- https://www.alibabacloud.com/help/en/model-studio/text-to-image
- https://www.therundown.ai/tools/qwen-image-3-0
- https://seminal.ai/reference/models/alibaba-qwen-qwen-image-3-0-pro/
- https://www.cometapi.com/what-is-qwen-image-3-0/
- https://www.glbgpt.com/hub/qwen-image-3-0-vs-pro/
- https://kie.ai/blog/what-is-qwen-image-3-0
- https://help.aliyun.com/en/model-studio/wan2-7-image
- https://www.alibabacloud.com/help/en/model-studio/qwen-image-edit-api
- https://www.alibabacloud.com/help/en/model-studio/qwen-image-2-1-pro
- https://www.alibabacloud.com/help/en/model-studio/qwen-image-edit-plus
- https://www.facebook.com/alibabacloud/photos/-introducing-qwen-image-edit-the-future-of-ai-powered-image-editingbuilt-on-our-/1198442728994484/
- https://www.alibabacloud.com/help/en/model-studio/singapore-regional-access-information
- https://help.aliyun.com/en/model-studio/web-search
- https://genmagic.co/blog/wan-3-0-api
- https://wtfistrending.com/model-comparisons/qwen3-7-max-vs-deepseek-v4-pro/
- https://www.alibabacloud.com/help/en/model-studio/get-api-key
- https://www.alibabacloud.com/help/en/model-studio/beijing-access-information
- https://www.alibabacloud.com/help/en/model-studio/qwen-image-2-0-pro
- https://help.aliyun.com/en/model-studio/qwen-image-3-0
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/wan3-0-video-prime
- https://github.com/gracech0322-cmd/free-wan-3-0-api
- https://nanobananavideo.com/blog/wan-3-0-prime-vs-wan-3-0
- https://framesurfer.com/blogs/wan-ai-video-generator
- https://blog.picassoia.com/wan-api-pricing-wan-3-0-key-free-access-and-alibaba-docs
- https://www.alibabacloud.com/help/en/model-studio/use-video-generation
- https://docs.bailian.console.aliyun.com/zh/model-studio/wan2-6-i2v
- https://docs.bailian.console.aliyun.com/zh/model-studio/wan2-7-i2v
- https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_wan2_7_i2v.json
- https://github.com/Comfy-Org/workflow_templates/blob/main/templates/video_wan2_2_14B_i2v.json
- https://braindetox.kr/en/posts/ai_video_generation_tools_2026_comparison.html
- https://github.com/Comfy-Org/workflow_templates/blob/main/templates/video_hunyuan_video_1.5_720p_i2v.json
- https://www.facebook.com/DotDailyDose/posts/alibaba-recently-rolled-out-the-beta-version-of-wan30-an-advanced-video-generati/1506682008142481/
- https://www.alibabacloud.com/blog/alibaba-unveils-wan2-7-video-to-elevate-creators-from-executors-to-directors_603009
- https://help.aliyun.com/en/model-studio/use-video-generation
- https://therouter.ai/models/qwen--qwen3.7-flash/
- https://www.alibabacloud.com/en/iat/qwen-ai-landing-page-b?_p_lc=1
- https://1min.ai/qwen3-vl-plus
- https://developer.puter.com/ai/models/
- https://github.com/cinience/alicloud-skills
- https://jia.je/kb/en/software/coding_plan.html
- https://models.sulat.com/models/merge-gateway-qwenqwen3-vl-flash-8fe52c4f
- https://getdeploying.com/llms/qwen3-vl-plus
- https://llmgateway.io/models/qwen3-vl-flash
- https://techjacksolutions.com/ai-tools/qwen/qwen-pricing/
- https://www.alibabacloud.com/help/en/model-studio/qwen-vl-ocr-api-reference.md
- https://qwen.ai/blog?id=99f0335c4ad9ff6153e517418d48535ab6d8afef
- https://www.youtube.com/watch?v=Im1defY9pUU
- https://www.llamaindex.ai/glossary/what-is-qwen-vl
- https://developer.puter.com/ai/qwen/qwen-vl-plus/
- https://www.alibabacloud.com/help/en/model-studio/token-plan-personal-overview
- https://www.alibabacloud.com/blog/one-key-one-cli-%E2%80%94-manage-your-alibaba-cloud-model-studio-token-plan-from-terminal-or-ai-agent_603453
- https://help.aliyun.com/en/model-studio/vision-model/
- https://forum.moonshot.ai/t/question-about-vision-model-image-token-calculation-resolution-above-4k-recommendation/450
- https://geotoolbox.ai/blog/qwen3-8-max
- https://ofox.ai/blog/qwen-3-8-max-price-context-window-api-access-open-weights-2026/
- https://hokai.io/hub/models/qwen3.8-27b
- https://chinaai.dev/models/qwen/qwen3.7-plus/
- https://arxiv.org/html/2610.14397v2
- https://jesusiniesta.es/blog/generative-ai-token-pricing-2026-full-comparison
- https://modilingua.com/ai-lab/best-openclaw-models/
- https://benchr.org/price-history
- https://geotoolbox.ai/blog/what-is-qwen
- https://www.cloudzero.com/blog/qwen-api-pricing/
- https://www.requesty.ai/model/alibaba/qwen3.6-plus
- https://llm-stats.com/models/qwen3.6-plus
- https://www.alibabacloud.com/help/en/model-studio/qwen3-5-flash
- https://aicost.tools/llm-cost/alibaba/
- https://www.promptfoo.dev/docs/providers/alibaba/
- https://www.edenai.co/providers/qwen
- https://www.alibabacloud.com/help/en/model-studio/qwen3-7-plus
- https://openrouter.ai/qwen/qwen3.7-plus
- https://deepinfra.com/blog/qwen-api-pricing-2026-guide
- https://www.requesty.ai/model/alibaba/qwen3.7-plus
- https://llm-stats.com/models/qwen3.7-plus
- https://www.alibabacloud.com/blog/qwen3-7-the-agent-frontier_603154
- https://www.edenai.co/models/qwen3-vl-plus
- https://www.spheron.network/blog/qwen-api-pricing-vs-self-hosted-llms-cost-privacy-2026/
- https://developer.puter.com/ai/qwen/qwen3-vl-flash-2026-01-22/
- https://openrouter.ai/qwen/qwen3.5-flash-02-23/api
- https://pricepertoken.com/pricing-page/model/qwen-qwen3-vl-8b-thinking
- https://www.aipricing.guru/models/novita-qwen-qwen3-vl-235b-a22b-thinking/
- https://openrouter.ai/qwen/qwen3.5-plus-02-15/api
- https://aihubmix.com/model/qwen3-max-2026-01-23
- https://www.activepieces.com/blog/qwen-api-pricing-costs-tiers-and-models-2026
- https://felloai.com/qwen-pricing/
- https://benchlm.ai/model-updates/providers/alibaba
- https://concentrate.ai/providers/alibaba
- https://benchlm.ai/models/qwen3-7-flash
- https://www.alibabacloud.com/help/id/milvus/product-overview/ai-center-billing.md
- https://help.aliyun.com/en/milvus/product-overview/ai-center-billing
- https://www.alibabacloud.com/help/zh/model-studio/model-pricing
- https://www.alibabacloud.com/help/ja/model-studio/model-pricing
- https://unifuncs.com/s/AW23G1uK
- https://www.alibabacloud.com/help/tc/model-studio/model-pricing
- https://ai-api-hub.com/providers/alibaba/models/alibaba-qwen3-vl-flash-2025-10-15/
- https://ai-api-hub.com/choose/
- https://www.alibabacloud.com/help/en/model-studio/qwen3-7-max
- https://github.com/QwenLM/qwen-code/issues/709
- https://huggingface.co/Qwen/Qwen3.5-27B
- https://www.facebook.com/fb-answers/alibaba-cloud-model-studio-qwen-pricing-per-million-tokens/
- https://www.facebook.com/AlibabaCloudSEA/videos/accelerate-your-ai-applications-with-native-vision-language-flash-models-%EF%B8%8F/2886156934920522/
- https://lmstudio.ai/models
- https://www.alibabacloud.com/blog/qwen3-vl-sharper-vision-deeper-thought-broader-action_602584
- https://www.mindstudio.ai/blog/what-is-qwen-3-6-plus-alibaba-1m-token-agentic-coding-model
- https://llmapi.ai/models/alibaba-qwen-vl-plus/
- https://pub.towardsai.net/qwen3-coder-has-a-1m-token-context-window-claude-has-200k-why-am-i-still-paying-for-claude-6546fe73c5de
- https://getdeploying.com/llms/qwen3.8-flash-next
- https://ai-api-hub.com/providers/alibaba/models/alibaba-qwen3-vl-flash/
- https://www.alibabacloud.com/blog/602536
- https://www.alizila.com/alibaba-cloud-releases-latest-ai-models-for-enhanced-visual-understanding-and-long-context-inputs/
- https://benchlm.ai/hosts/openrouter
- https://deepinfra.com/pricing
- https://openrouter.ai/qwen/qwen3.8-27b/api
- https://llmlearner.com/compare/gemini-3-1-flash-lite-image-vs-qwen3-vl-plus
- https://getdeploying.com/llms
- https://infron.ai/provider/alibaba/sg
- https://www.economize.cloud/resources/llm-cost-calculator/
- https://www.promptzone.com/llm-api-pricing
- https://www.subconscious.dev/providers/alibaba-cloud
- https://opencode.ai/data/alibaba/qwen3-vl-flash
- https://www.facebook.com/AlibabaCloudSEA/posts/introducing-ai-spotlight-a-new-series-where-we-go-deep-on-the-models-and-product/1079327334661832/
- https://www.alibabacloud.com/help/en/model-studio/error-code
- https://huggingface.co/Qwen/Qwen3.8-27B
- https://www.alibabacloud.com/help/en/model-studio/model-list-visual-understanding/
- https://www.alibabacloud.com/help/en/model-studio/qwen3-5-ocr
- https://help.aliyun.com/en/model-studio/model-list-visual-understanding/
- https://www.facebook.com/alibabacloud/videos/accelerate-your-ai-applications-with-native-vision-language-flash-models-%EF%B8%8F/1276000647742234/
- https://www.alibabacloud.com/blog/qwen3-7-plus-multimodal-agent-intelligence_603206
- https://sourceforge.net/software/compare/Alibaba-Cloud-Model-Studio-vs-Qwen3.7-Plus/
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/models
- https://www.alibabacloud.com/help/en/model-studio/omni-voice-list
- https://www.alibabacloud.com/help/en/model-studio/s2s-model
- https://help.aliyun.com/en/model-studio/qwen3-8-omni-flash
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen3-8-omni-flash
- https://www.alibabacloud.com/help/en/model-studio/qwen-omni-voice-cloning.md
- https://www.alibabacloud.com/help/en/model-studio/faq-about-alibaba-cloud-model-studio
- https://help.aliyun.com/en/model-studio/faq-about-alibaba-cloud-model-studio
- https://invoiceextractor.ai/qwen-ocr-pricing
- https://therouter.ai/news/
- https://arxiv.org/html/2610.33066v1
- https://moark.ai/serverless-api
- https://help.aliyun.com/en/model-studio/gui-plus
- https://www.instagram.com/reel/DWojhXpEgHd/?hl=en
- https://github.com/qwenlm/qwen3-vl
- https://artificialanalysis.ai/models/creators/alibaba
- https://www.alibabacloud.com/help/en/model-studio/qwen-audio-realtime-user-guides
- https://www.alibabacloud.com/help/en/model-studio/speech-recognition/
- https://qwen.ai/blog?id=qwen2-audio
- https://help.aliyun.com/en/model-studio/qwen-audio-3-1-realtime-flash
- https://x.com/Alibaba_Qwen/status/2100785962414702599
- https://arxiv.org/html/2609.29754v1
- https://www.researchgate.net/publication/416918700_OvisOCR3_Technical_Report/fulltext/6ae022160231bf3f3427650b/OvisOCR3-Technical-Report.pdf?origin=scientificContributions
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen3-vl-plus
- https://help.aliyun.com/en/model-studio/qwenvl-ocr
- https://www.alibabacloud.com/help/en/model-studio/qwen-audio-3-1-realtime-flash
- https://www.alibabacloud.com/help/en/model-studio/qwen-audio-3-1-realtime-plus
- https://www.datastudios.org/post/alibaba-launches-qwen-audio-3-1-realtime-plus-262k-context-real-time-voice-agents
- https://wavespeed.ai/blog/cost-and-billing/qwen-audio-3-realtime-pricing/
- https://cloudprice.net/models/alibaba-qwen-audio-3-1-flash-realtime
- https://empiriolabs.ai/models/qwen-audio-3-1-realtime-plus
- https://qwen.ai/blog?id=4266edf7f3718f2d3fda098b3f4c48f3573215d0&from=home.latest-research-list
- https://arxiv.org/html/2609.25707v1
- https://llmtimeline.org/
- https://chatforest.com/
- https://www.gradually.ai/en/ai-models/qwen-audio-3.1-realtime-flash/
- https://www.alibabacloud.com/blog/603503
- https://www.activepieces.com/blog/qwen38-flash-next-api-pricing-token-costs-2026
- https://openrouter.ai/compare/qwen/qwen3.8-max-0902/qwen/qwen3.8-omni-flash
- https://superpowerdaily.com/posts/alibaba-releases-qwen3-8-omni-flash-for-tool-using-media-tasks
- https://x.com/alibaba_cloud/status/2115343138193822068
- https://ai-tldr.dev/models/qwen-audio-3-1-realtime/
- https://www.alibabacloud.com/help/en/model-studio/qwen-audio-3-1-tts-next
- https://artificialanalysis.ai/text-to-speech/models/qwen-audio-3-1-tts-plus
- https://www.cometapi.com/qwen-3-api/
- https://sourceforge.net/software/product/Qwen-Cloud/alternatives
- https://slashdot.org/software/comparison/Qwen-Cloud-vs-Qwen3.5-Plus/
- https://www.atlascloud.ai/
- https://cloudprice.net/models/alibaba-qwen3-omni-flash
- https://markaicode.com/pricing/qwen-25-pricing/
- https://www.alibabacloud.com/help/en/model-studio/qwen3-omni-flash
- https://aitokenusagecalculator.com/providers/qwen
- https://www.alibabacloud.com/help/en/model-studio/qwen3-8-livetranslate-flash-realtime
- https://www.alibabacloud.com/help/en/model-studio/qwen3-5-livetranslate-flash-realtime
- https://help.aliyun.com/en/model-studio/qwen3-8-livetranslate-flash-realtime
- https://aireiter.com/blog/qwen3-8-livetranslate-api-pricing
- https://www.facebook.com/alibabacloud/posts/meet-qwen38-livetranslate-qwens-next-generation-real-time-simultaneous-interpret/1542182924620461/
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen3-8-livetranslate-flash-realtime
- https://ai-tldr.dev/models/qwen3-8-livetranslate/
- https://stdapi.ai/models/
- https://openrouter.ai/models
- https://datafloq.com/the-complete-ai-model-guide-2026-llms-real-pricing-and-the-five-competing-arenas-reshaping-the-market/
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/text-embedding-v3
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/tongyi-embedding-vision-plus
- https://www.alibabacloud.com/help/en/model-studio/rag-knowledge-base
- https://huggingface.co/Qwen/Qwen3-VL-Embedding-8B
- https://www.alibabacloud.com/help/en/model-studio/qwen3-vl-embedding
- https://pub.towardsai.net/alibaba-built-embedding-models-that-actually-understand-images-and-video-not-just-text-71133119908b
- https://mixpeek.com/model/Qwen/Qwen3-VL-Embedding-8B
- https://deepinfra.com/models/embeddings/
- https://docs.laozhang.ai/announcements/wan-3-0-pricing-2026-10
- https://www.alibabacloud.com/help/en/model-studio/happyhorse-1-0-t2v
- https://www.alibabacloud.com/help/en/hologres/user-guide/managed-models-billing
- https://help.aliyun.com/en/model-studio/happyhorse-1-0-t2v
- https://help.apiyi.com/en/happyhorse-pricing-vs-seedance-2-comparison-en.html
- https://www.facebook.com/groups/stablediffusionkorea/posts/2152739212235581/
- https://genspend.io/model/happyhorse-1
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/happyhorse-1-0-t2v
- https://www.glbgpt.com/resources/what-is-happyhorse-1-0/
- https://www.alibabacloud.com/help/en/model-studio/legacy-image-to-video-api-reference/
- https://github.com/Wan-Video/Wan2.1
- https://www.alizila.com/alibaba-cloud-open-sources-its-ai-models-for-video-generation/
- https://rits.shanghai.nyu.edu/ai/wan2-2-alibabas-open%E2%80%91source-breakthrough-in-ai-video-generation/
- https://aimlapi.com/models/alibaba-wan2-6-i2v-flash
- https://github.com/vxcontrol/pentagi/blob/main/README.md
- https://jina.ai/embeddings/
- https://aihubmix.com/model/text-embedding-v4
- https://crazyrouter.com/en/blog/ai-embeddings-comparison-2026-guide
- https://www.alibabacloud.com/en/product/modelstudio?_p_lc=1
- https://genspend.io/model/wan-3.0
- https://www.developersdigest.tech/models/video-generation
- https://kling4.tv/blog/kling-alternative
- https://www.alibabacloud.com/help/en/model-studio/wan2-6-i2v-flash
- https://gate.ai/blog/wan-2-6-i2v-flash-alibaba-specs-pricing-api-use-cases
- https://www.alibabacloud.com/blog/603452
- https://models.litellm.ai/models/wan2.7-t2v
- https://www.facebook.com/alibabacloud/posts/wan30-has-claimed-the-1-spot-in-the-video-edit-by-arenaaiwith-1414-ps-wan30-lead/1520554430116644/
- https://www.alibabacloud.com/help/en/model-studio/cli/video
- https://www.facebook.com/alibabacloud/posts/ai-spotlight-is-back-this-time-with-wan-30-our-latest-video-modelthe-premise-is-/1518262037012550/
- https://picsart.com/ai-models/wan-2-7/
- https://www.alibabacloud.com/en/campaign/ai-scene-video?_p_lc=1
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen-image-2-1-pro
- https://whichchineseai.com/compare/chinese-ai-image/
- https://x.com/alibaba_cloud/status/2114939728705327343
- https://www.eesel.ai/blog/qwen-image-2-1
- https://cellcog.ai/blog/qwen-image-2-1/
- https://help.aliyun.com/en/model-studio/qwen-image-2-1-pro
- https://www.linkedin.com/pulse/qwen-image-21-pro-turbo-apis-live-one-7b-model-generate-49xfe
- https://www.facebook.com/groups/AIUGM/posts/3962928493988116/
- https://www.alibabacloud.com/en/notice/model_studio_notice_of_retirement_for_selected_legacy_models_7d9?_p_lc=1
- https://custom.typingmind.com/tools/estimate-llm-usage-costs/llmgateway/qwen3-vl-plus
- https://mofcloud.com/tools/llm-explorer/qwen3-vl-plus
- https://www.economize.cloud/
- https://pricepertoken.com/token-counter/model/qwen-qwen3-vl-8b-thinking
- https://www.getmaxim.ai/bifrost/llm-cost-calculator/provider/qwencloud/model/qwen3-vl-235b-a22b-thinking
- https://cloud.google.com/products/calculator
- https://www.cloudzero.com/blog/llm-cost-calculator/
- https://getdeploying.com/llm-cost-calculator
- https://ai-api-hub.com/providers/alibaba/models/alibaba-qwen3-5-flash/
- https://llm.svc-utility-belt.optimizely.com/providers/alibaba
- https://kie.ai/blog/what-is-qwen3-8-flash
- https://qwen.ai/blog?id=qwen3.6
- https://www.alibabacloud.com/notice/detail?id=2009
- https://x.com/Alibaba_Qwen/status/1978841775411503304
- https://help.aliyun.com/en/model-studio/model-release-notes
- https://www.alibabacloud.com/en/notice/detail?_p_lc=1&id=2217
- https://github.com/anomalyco/models.dev/issues/2121
- https://www.alibabacloud.com/help/en/model-studio/model-depreciation
- https://help.aliyun.com/en/model-studio/model-depreciation
- https://www.alibabacloud.com/notice/detail?_p_lc=1&id=1938
- https://www.alibabacloud.com/notice/detail?_p_lc=1&id=1841
- https://statusgator.com/services/alibaba-cloud/alibaba-cloud-model-studio
- https://help.aliyun.com/en/model-studio/rerank
- https://www.alibabacloud.com/notice/detail?_p_lc=1&id=1873
- https://reranker.uk/guides/rerank-in-china
- https://github.com/diegosouzapw/OmniRoute/issues/13030
- https://www.linkedin.com/posts/your-llm-radar_ai-llm-ainews-activity-7505265520401604608-iHsy
- https://www.alibabacloud.com/help/en/model-studio/tongyi-embedding-vision-flash
- https://www.alibabacloud.com/blog/603613
- https://www.alibabacloud.com/help/en/model-studio/qwen3-vl-plus
- https://www.alibabacloud.com/help/en/model-studio/qwen3-5-122b-a10b
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen3-vl-32b-thinking
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen3-vl-flash
- https://github.com/ChanChiChoi/llm-from-zero-to-interview/blob/main/research/model-update-2026-09/qwen3.7-plus-source-notes.md
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen3-6-35b-a3b
- https://help.aliyun.com/en/model-studio/qwen3-5-122b-a10b
- https://www.alibabacloud.com/help/en/model-studio/qwen-tts-voice-list
- https://help.aliyun.com/en/model-studio/qwen-tts-voice-list
- https://www.marktechpost.com/2026/07/20/alibabas-tongyi-lab-releases-qwen-audio-3-0-tts-a-hosted-text-to-speech-model-in-flash-and-plus-tiers-across-16-languages/
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen-vl-plus
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen-vl-max
- https://guptadeepak.com/ai-models/qwen/qwen3-vl-plus/
- https://aihubmix.com/model/qwen3-vl-plus
- https://www.vals.ai/models/alibaba_qwen3-vl-plus-2025-09-23
- https://huggingface.co/collections/Qwen/qwen3-vl
- https://opencode.ai/data/compare/alibaba/qwen3-vl-plus/alibaba/qwen3-7-plus
- https://zenmux.ai/qwen/qwen3-vl-plus
- https://www.facebook.com/alibabacloud/videos/qwen-meet-the-new-qwen3-tts-lineup-voicedesign-voiceclone/1241883684460473/
- https://alphasignal.ai/news/alibaba-s-qwen-audio-3-1-slashes-voice-api-prices-by-up-to-95
- https://help.aliyun.com/en/model-studio/cosyvoice-v3-5-plus
- https://github.com/QwenAudio/CosyVoice
- https://cosyvoice.org/cosyvoice-3
- https://www.alibabacloud.com/help/en/model-studio/voice-design-user-guide
- https://help.aliyun.com/en/model-studio/qwen-omni-voice-cloning-user-guide
- https://note.com/npaka/n/n98557f21b253?hl=en
- https://www.youtube.com/watch?v=D4sd-9ZSM3M
- https://www.alibabacloud.com/es/campaign/qwen-ai-landing-pageb?_p_lc=1
- https://www.alibabacloud.com/en/campaign/qwen-ai-landing-page?_p_lc=1
- https://llmprice.cn/
- https://www.alibabacloud.com/help/en/model-studio/wan3-0-video
- https://www.facebook.com/alibabacloud/videos/wan30-livestream-client-sharing-clip-falai/1360090262875247/
- https://www.alibabacloud.com/blog/wan3-0-at-general-availability-capabilities-benchmarks-pricing-and-the-workflows-it-changes_603505
- https://myclaw.ai/blog/wan-2-7-review
- https://fuser.studio/articles/wan-3-0-guide
- https://www.alibabacloud.com/blog/603504
- https://www.alibabacloud.com/help/en/model-studio/wan2-7-t2v
- https://blog.laozhang.ai/en/posts/wan-2-7-vs-seedance-2-0
- https://oakgen.ai/blog/wan-2-7-complete-guide
- https://aireiter.com/blog/qwen-image-3-pro
- https://pixo.video/blog/ai-image-generation-pricing
- https://blog.laozhang.ai/en/posts/qwen-image-2-1-turbo-api
- https://movcl.com/blog/comparisons/ai-image-api-prices-compared/
- https://kingy.ai/blog/qwen-image-2-1-turbo-eight-steps-license/
- https://x.com/alibaba_cloud/with_replies
- https://openrouter.ai/provider/alibaba
- https://arxiv.org/html/2609.33399v1
- https://help.aliyun.com/en/model-studio/new-free-quota
- https://chat.dev/blog/video-generation-apis-cost-quality-control
- https://www.alibabacloud.com/help/en/model-studio/image-to-video-general-api-reference
- https://www.alibabacloud.com/help/en/model-studio/wan2-7-i2v
- https://www.glbgpt.com/hub/wan-2-7-review/
- https://opper.ai/alibaba/wan2-7-i2v
- https://unifuncs.com/s/Ci5ukbJ8
- https://nolist.ai/item/image-gen-tongyi-wanxiang-alibaba-qwen-image-edit-plus-2511
- https://ja.wikipedia.org/wiki/Qwen
- https://modelsmarter.com/models/
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/wanx2-1-t2i-turbo
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/image-model
- https://www.alibabacloud.com/help/en/model-studio/qwen-image-3-0
- https://www.alibabacloud.com/help/en/model-studio/wan-image-generation-finetune-guide
- https://www.alibabacloud.com/help/en/model-studio/qwen-image-2-1-turbo.md
- https://www.modelscope.cn/models/Qwen/Qwen3-ASR-1.7B
- https://help.aliyun.com/en/model-studio/qwen-audio-3-0-asr-flash
- https://qwen.ai/blog?id=qwen3asr
- https://pub.towardsai.net/this-asr-can-handle-52-languages-b0f4fe202e8f
- https://www.alibabacloud.com/help/en/model-studio/cli/speech.md
- https://help.aliyun.com/en/model-studio/fun-asr-realtime
- https://www.alibabacloud.com/help/en/model-studio/paraformer-real-time-speech-recognition-python-sdk
- https://www.alibabacloud.com/help/en/model-studio/paraformer-recorded-speech-recognition-restful-api
- https://help.aliyun.com/en/model-studio/paraformer-realtime-v2
- https://www.alibabacloud.com/help/en/model-studio/qwen-audio-3-0-asr-flash.md
- https://www.alibabacloud.com/help/en/model-studio/qwen-asr-api-reference
- https://www.marktechpost.com/2025/09/09/alibaba-qwen-team-releases-qwen3-asr-a-new-speech-recognition-model-built-upon-qwen3-omni-achieving-robust-speech-recogition-performance/
- https://github.com/alibaba-damo-academy/FunASR?spm=a2c6h.13046898.publish-article.6.3c3b6ffaF4OWuM
- https://baike.baidu.com/en/item/Fun-ASR-Realtime/4714013
- https://www.alibabacloud.com/help/en/model-studio/paraformer-real-time-speech-recognition-api-reference/
- https://www.alibabacloud.com/help/en/model-studio/paraformer-8k-v2
- https://www.alibabacloud.com/help/en/model-studio/realtime-websocket-overview
- https://help.aliyun.com/en/model-studio/fun-audiochat-realtime-websocket-api
- https://www.alibabacloud.com/help/en/model-studio/interactive-process-of-qwen-tts-realtime-synthesis
- https://help.aliyun.com/en/model-studio/omni-realtime-java-sdk
- https://help.aliyun.com/en/model-studio/realtime-token-authentication
- https://www.alibabacloud.com/help/en/model-studio/qwen-api-reference/
- https://help.aliyun.com/en/model-studio/qwen-livetranslate-java-sdk
- https://github.com/QwenLM/Qwen3-VL-Embedding
- https://empiriolabs.ai/models/tongyi-embedding-vision-flash
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/fun-asr-realtime
- https://ai.gotry.io/models/fun-asr-realtime-2025-11-07
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen3-asr-flash-realtime
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen3-asr-flash
- https://help.aliyun.com/en/model-studio/rate-limit
- https://help.aliyun.com/en/model-studio/fun-asr-realtime-websocket-api
- https://www.alibabacloud.com/help/en/model-studio/fun-audiochat-realtime-websocket-api
- https://www.alibabacloud.com/help/en/model-studio/more-tools
- https://help.aliyun.com/en/model-studio/qwen-asr-realtime-java-sdk
- https://www.alibabacloud.com/help/en/model-studio/cosyvoice-websocket-api
- https://ottermind.ai/skills/alicloud-ai-audio-asr
- https://help.aliyun.com/en/model-studio/improve-asr-accuracy
- https://www.ai-souken.com/article/what-is-qwen
- https://www.alibabacloud.com/help/en/model-studio/qwen3-5-omni-flash-realtime.md
- https://aireiter.com/blog/qwen3-8-omni-flash-api-pricing
- https://wavespeed.ai/blog/posts/what-is-qwen3-5-omni/
- https://arxiv.org/html/2609.25611v1
- https://www.nocode.mba/ai-release-tracker/releases/qwen3-8-omni-flash
- https://www.reddit.com/r/AISEOInsider/comments/1wlko6s/qwen_omni_flash_handles_text_images_audio_and/
- https://www.merriam-webster.com/dictionary/model
- https://ojjdp.ojp.gov/model-programs-guide/home
- https://theduluthmodel.org/what-is-the-duluth-model/
- https://www.psychiatry.org/psychiatrists/practice/professional-interests/collaborative-care/learn/
- https://en.wikipedia.org/wiki/Model
- https://www.tesla.com/models
- https://www.jasss.org/11/4/12.html
- https://www.instagram.com/modelactriz/?hl=en
- https://nvie.com/posts/a-successful-git-branching-model/
- https://www.alibabacloud.com/help/en/model-studio/model-usage-statistics
- https://freellmapihub.com/p/alibaba-model-studio
- https://www.alibabacloud.com/help/en/model-studio/application-calling-guide
- https://www.threads.com/@nomorewaiting___/post/DdmII2dEt1f/e-c%C5%A9ng-%C4%91ang-th%E1%BA%A5y-qwen-image-pro-ph%E1%BB%A5c-v%E1%BB%A5-%E1%BB%A9ng-d%E1%BB%A5ng-c%E1%BB%A7a-e-t%E1%BB%91t-ch%E1%BA%AFc-e-ph%E1%BA%A3i-nghi%C3%AAn-c%E1%BB%A9/
- https://eu.36kr.com/en/p/3965525489491463
- https://help.aliyun.com/en/model-studio/cosyvoice-v3-5-flash
- https://cosyvoice.org/cosyvoice-api
- https://www.alibabacloud.com/help/en/model-studio/cli/speech
- https://tryaudiolab.ai/alibaba/cosyvoice-v3.5-plus
- https://www.facebook.com/alibabacloud/videos/meet-cosyvoice-3-/1234048001921016/
- https://www.alibabacloud.com/help/en/model-studio/voice-design-api-references
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/cosyvoice-v3-5-plus
- https://www.alibabacloud.com/help/en/model-studio/ssml-latex-user-guide
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/cosyvoice-v3-5-flash
- https://www.alibabacloud.com/help/en/model-studio/cosyvoice-v3-5-flash
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen-audio-3-1-tts-flash
- https://theresanaiforthat.com/feature/api/
- https://thegenaimagazine.com/gemini-3-8-flash-tts-pricing-voices-benchmarks-latency-guide
- https://www.alizila.com/alibaba-cloud-announced-the-latest-ai-models-tools-and-infrastructure-available-to-drive-more-efficient-global-ai-community/
- https://www.glbgpt.com/hub/qwen3-tts-review/
- https://chinaai.dev/models/qwen/qwen-audio-3.0-tts-flash/
- https://sourceforge.net/software/compare/CosyVoice-vs-Qwen-Audio-3.0-TTS-Flash/
- https://slashdot.org/software/comparison/Guide.AI-vs-Qwen-Audio-3.0-TTS-Flash/
- https://recaply.co/tools/qwen3-tts-customvoice
- https://mixed-news.com/en/alibaba-qwen3-8-omni-flash-spatial-audio-cheaper-audio-input/
- https://www.alibabacloud.com/help/en/model-studio/qwen-asr-realtime-java-sdk
- https://www.alibabacloud.com/help/en/model-studio/omni-realtime-java-sdk
- https://github.com/nadeembinshajahan/stado/blob/main/backend/app/voice_qwen.py
- https://aireiter.com/blog/qwen-audio-3-realtime
- https://www.alibabacloud.com/help/en/model-studio/anthropic-api-messages
- https://github.com/cline/cline/issues/12400
- https://www.youtube.com/watch?v=QmB2qxcQx88
- https://flowbarai.com/models
