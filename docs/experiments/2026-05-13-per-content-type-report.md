# Per-content-type model comparison — 2026-05-13

Autonoom experiment om per content-type categorie het beste model te identificeren. 8 representanten (1 per categorie) × 6 modellen = 48 condities.

## Setup
- **Brand**: Napking (real fingerprint uit DB)
- **Modellen**: Claude Opus 4.7 + thinking, Claude Sonnet 4.6 + thinking, Claude Haiku 4.5, GPT-5.4, GPT-5.4 Mini, Gemini 3.1 Pro + thinking
- **Judge**: Claude Sonnet 4.6 met 4-dim scoring (style 30 / essence 35 / rules 15 / format 20)

## Per-content-type winnaars

| Content-type | Categorie | Winnaar | Composite | Cost | Latency |
|---|---|---|---:|---:|---:|
| blog-post | Long-Form Content | **Claude Opus 4.7 + thinking** | 91 | $0.0898 | 21.8s |
| linkedin-post | Social Media | **GPT-5.4** | 91 | $0.0073 | 6.0s |
| search-ad | Advertising & Paid | **Gemini 3.1 Pro + thinking** | 90 | $0.0037 | 35.4s |
| newsletter | Email & Automation | **Claude Opus 4.7 + thinking** | 91 | $0.0609 | 12.0s |
| landing-page | Website & Landing Pages | **Claude Sonnet 4.6 + thinking** | 91 | $0.0183 | 13.3s |
| explainer-video | Video & Audio | **Claude Opus 4.7 + thinking** | 91 | $0.0577 | 10.4s |
| press-release | PR, HR & Communications | **Claude Opus 4.7 + thinking** | 92 | $0.0887 | 14.8s |
| one-pager | Sales Enablement | **Claude Opus 4.7 + thinking** | 89 | $0.0703 | 13.0s |

## Per-content-type details

### blog-post — Blog post body (Long-Form Content)

| Model | Composite | Style | Essence | Rules | Format | Cost | Latency |
|---|---:|---:|---:|---:|---:|---:|---:|
| Claude Opus 4.7 + thinking | **91** | 92 | 91 | 93 | 90 | $0.0898 | 21.8s |
| GPT-5.4 | **87** | 88 | 87 | 91 | 82 | $0.0097 | 10.7s |
| Claude Sonnet 4.6 + thinking | **85** | 82 | 83 | 90 | 87 | $0.0393 | 33.0s |
| Gemini 3.1 Pro + thinking | **77** | 75 | 76 | 74 | 85 | $0.0081 | 126.3s |
| GPT-5.4 Mini | **75** | 72 | 74 | 80 | 75 | $0.0014 | 5.2s |
| Claude Haiku 4.5 | **66** | 62 | 65 | 72 | 68 | $0.0042 | 9.2s |

### linkedin-post — LinkedIn post (Social Media)

| Model | Composite | Style | Essence | Rules | Format | Cost | Latency |
|---|---:|---:|---:|---:|---:|---:|---:|
| GPT-5.4 | **91** | 92 | 91 | 93 | 88 | $0.0073 | 6.0s |
| Claude Sonnet 4.6 + thinking | **88** | 86 | 89 | 91 | 85 | $0.0168 | 16.2s |
| Claude Opus 4.7 + thinking | **87** | 88 | 87 | 92 | 82 | $0.0566 | 11.0s |
| GPT-5.4 Mini | **83** | 83 | 80 | 90 | 84 | $0.0009 | 2.6s |
| Gemini 3.1 Pro + thinking | **80** | 79 | 78 | 82 | 83 | $0.0055 | 139.9s |
| Claude Haiku 4.5 | **72** | 68 | 72 | 78 | 74 | $0.0022 | 4.3s |

### search-ad — Google Search Ad (Advertising & Paid)

| Model | Composite | Style | Essence | Rules | Format | Cost | Latency |
|---|---:|---:|---:|---:|---:|---:|---:|
| Gemini 3.1 Pro + thinking | **90** | 89 | 87 | 91 | 95 | $0.0037 | 35.4s |
| Claude Opus 4.7 + thinking | **89** | 88 | 85 | 92 | 95 | $0.0292 | 4.1s |
| Claude Sonnet 4.6 + thinking | **89** | 87 | 86 | 92 | 95 | $0.0262 | 21.7s |
| GPT-5.4 | **88** | 86 | 84 | 93 | 95 | $0.0048 | 2.1s |
| GPT-5.4 Mini | **80** | 75 | 72 | 90 | 95 | $0.0006 | 1.5s |
| Claude Haiku 4.5 | **77** | 82 | 80 | 88 | 55 | $0.0016 | 2.0s |

### newsletter — Customer newsletter section (Email & Automation)

| Model | Composite | Style | Essence | Rules | Format | Cost | Latency |
|---|---:|---:|---:|---:|---:|---:|---:|
| Claude Opus 4.7 + thinking | **91** | 91 | 92 | 93 | 88 | $0.0609 | 12.0s |
| Claude Sonnet 4.6 + thinking | **87** | 85 | 86 | 90 | 87 | $0.0507 | 35.3s |
| GPT-5.4 | **85** | 82 | 84 | 88 | 90 | $0.0074 | 8.5s |
| Gemini 3.1 Pro + thinking | **76** | 72 | 74 | 78 | 85 | $0.0062 | 32.5s |
| GPT-5.4 Mini | **73** | 68 | 70 | 80 | 82 | $0.0010 | 3.1s |
| Claude Haiku 4.5 | **61** | 58 | 62 | 72 | 55 | $0.0025 | 5.5s |

### landing-page — Landing-page hero (Website & Landing Pages)

| Model | Composite | Style | Essence | Rules | Format | Cost | Latency |
|---|---:|---:|---:|---:|---:|---:|---:|
| Claude Sonnet 4.6 + thinking | **91** | 92 | 91 | 93 | 88 | $0.0183 | 13.3s |
| Claude Opus 4.7 + thinking | **89** | 88 | 87 | 92 | 90 | $0.0331 | 3.8s |
| GPT-5.4 | **89** | 89 | 90 | 91 | 87 | $0.0052 | 2.6s |
| Gemini 3.1 Pro + thinking | **83** | 82 | 83 | 87 | 82 | $0.0040 | 77.6s |
| Claude Haiku 4.5 | **78** | 75 | 72 | 88 | 85 | $0.0015 | 1.9s |
| GPT-5.4 Mini | **78** | 78 | 74 | 85 | 80 | $0.0007 | 1.4s |

### explainer-video — Explainer video script (Video & Audio)

| Model | Composite | Style | Essence | Rules | Format | Cost | Latency |
|---|---:|---:|---:|---:|---:|---:|---:|
| Claude Opus 4.7 + thinking | **91** | 92 | 91 | 94 | 88 | $0.0577 | 10.4s |
| GPT-5.4 | **87** | 88 | 89 | 93 | 75 | $0.0084 | 7.9s |
| Claude Sonnet 4.6 + thinking | **86** | 85 | 86 | 93 | 84 | $0.0163 | 13.6s |
| GPT-5.4 Mini | **81** | 80 | 78 | 91 | 82 | $0.0009 | 2.9s |
| Gemini 3.1 Pro + thinking | **79** | 78 | 82 | 88 | 68 | $0.0073 | 47.6s |
| Claude Haiku 4.5 | **69** | 62 | 65 | 85 | 72 | $0.0024 | 4.8s |

### press-release — Press release (PR, HR & Communications)

| Model | Composite | Style | Essence | Rules | Format | Cost | Latency |
|---|---:|---:|---:|---:|---:|---:|---:|
| Claude Opus 4.7 + thinking | **92** | 91 | 92 | 94 | 93 | $0.0887 | 14.8s |
| GPT-5.4 | **90** | 89 | 90 | 93 | 88 | $0.0116 | 10.0s |
| Claude Sonnet 4.6 + thinking | **83** | 82 | 83 | 90 | 78 | $0.0361 | 48.8s |
| GPT-5.4 Mini | **75** | 75 | 76 | 85 | 65 | $0.0015 | 4.7s |
| Claude Haiku 4.5 | **74** | 72 | 74 | 82 | 70 | $0.0038 | 7.2s |

### one-pager — Sales one-pager (Sales Enablement)

| Model | Composite | Style | Essence | Rules | Format | Cost | Latency |
|---|---:|---:|---:|---:|---:|---:|---:|
| Claude Opus 4.7 + thinking | **89** | 92 | 91 | 93 | 78 | $0.0703 | 13.0s |
| Claude Sonnet 4.6 + thinking | **89** | 88 | 89 | 92 | 90 | $0.0385 | 27.0s |
| GPT-5.4 | **86** | 85 | 84 | 88 | 88 | $0.0085 | 9.2s |
| GPT-5.4 Mini | **76** | 72 | 70 | 85 | 85 | $0.0011 | 4.3s |
| Gemini 3.1 Pro + thinking | **73** | 74 | 72 | 75 | 70 | $0.0064 | 49.7s |
| Claude Haiku 4.5 | **66** | 62 | 60 | 78 | 72 | $0.0027 | 5.5s |
