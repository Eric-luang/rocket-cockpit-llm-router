# 🚀 rocket-cockpit-llm-router

**Unified LLM client for 9+ providers with auto-fallback. Inspired by [TradingAgents](https://github.com/TauricResearch/TradingAgents) architecture.**

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D16-green.svg)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

## ✨ Features

- 🎯 **9+ providers unified** — OpenAI, Anthropic, Zhipu (智谱), MiniMax, OpenRouter, Qwen, etc.
- 🔄 **Auto-fallback chain** — one provider fails, automatically try next
- ⏱️ **Built-in timeout** — 60s for vision, 30s for text (configurable)
- 🎨 **Task-based routing** — `text-quick` / `text-deep` / `vision` with different model per task
- 🪶 **Zero dependencies** — pure JS, works in Node 16+ and browsers
- 📦 **Apache 2.0** — free for commercial use

## 📦 Installation

```bash
npm install rocket-cockpit-llm-router
```

Or copy `src/index.js` to your project.

## 🚀 Quick Start

```js
const { LLMRouter } = require('rocket-cockpit-llm-router');

const router = new LLMRouter({
  providers: {
    zhipu: {
      apiKey: 'your-zhipu-key',
      enabled: true,
      models: {
        'text-quick': 'glm-4.7-flash',
        'text-deep': 'glm-4-plus',
        'vision': 'glm-4.1v-thinking-flash',
      },
    },
    minimax: {
      apiKey: 'your-minimax-key',
      enabled: true,
      models: {
        'text-quick': 'MiniMax-M2.7-highspeed',
        'text-deep': 'MiniMax-M3',
        'vision': 'MiniMax-M3',
      },
    },
  },
});

// Simple chat with auto-routing
const result = await router.chat({
  task: 'text-quick',
  messages: [{ role: 'user', content: '你好' }],
  maxTokens: 200,
});
console.log(result.text);  // "你好! 有什么可以帮你的?"
console.log(result.provider);  // "zhipu"
console.log(result.elapsed);  // 1234 (ms)

// Chat with auto-fallback (if zhipu fails, try minimax)
const result2 = await router.chatWithFallback({
  task: 'text-quick',
  messages: [{ role: 'user', content: 'Hello' }],
});

// Vision task
const result3 = await router.chat({
  task: 'vision',
  messages: [{ role: 'user', content: '识别这张图片' }],
  imageBase64: 'base64...',
  imageMime: 'image/jpeg',
  maxTokens: 1024,
});
```

## 🏗️ Architecture

This module is extracted from [RocketCockpit](https://github.com/rocket-cockpit/stock-assistant), a Chinese A-share/HK retail position management tool, which itself is inspired by [TradingAgents](https://arxiv.org/abs/2412.20138)'s multi-provider LLM routing pattern.

```
┌─────────────────────────────────────────┐
│         Your Application                │
│   (Stock analysis, chat, vision OCR)   │
└────────────────┬────────────────────────┘
                 │ chat({ task, messages })
                 ▼
┌─────────────────────────────────────────┐
│           LLMRouter                      │
│  • Pick best provider for task         │
│  • Try override > first enabled         │
│  • On fail → next in chain              │
│  • 60s/30s timeout per provider         │
└────────────────┬────────────────────────┘
                 │
       ┌─────────┼─────────┐
       ▼         ▼         ▼
    Zhipu    MiniMax   OpenRouter
    GLM-4    M3        Gemini/Claude
```

## 🎯 Why This Library?

TradingAgents (98K ⭐, 18.8K forks) pioneered multi-provider LLM routing for financial AI. RocketCockpit adapted this pattern for **mobile-first Chinese stock tools** where:

- **CORS constraints** require fallback chains (mcode iframe blocks Zhipu → need OpenRouter)
- **Cost optimization** requires task-based routing (cheap model for chat, premium for analysis)
- **Latency control** requires per-task timeouts (vision 60s, text 30s)

This library extracts the routing layer so any Node.js / browser app can use it.

## 📊 Comparison with Alternatives

| Feature | rocket-cockpit-llm-router | LangChain | OpenAI SDK |
|---------|--------------------------|-----------|------------|
| Multi-provider | ✅ 9+ | ✅ 100+ | ❌ 1 (OpenAI) |
| Auto-fallback | ✅ Built-in | ⚠️ Manual | ❌ No |
| Zero dependencies | ✅ | ❌ Heavy | ❌ |
| Browser support | ✅ | ⚠️ Bundle bloat | ✅ |
| Bundle size | <5KB | 200KB+ | <50KB |

## 🧪 Testing

```bash
npm test
```

## 📄 License

Apache 2.0 — free for commercial use, modification, distribution.

## 🙏 Credits

- Inspired by [TauricResearch/TradingAgents](https://github.com/TauricResearch/TradingAgents) (arXiv:2412.20138)
- Built by [RocketCockpit Team](https://github.com/rocket-cockpit)
- Powered by MiniMax-M3 (the same model TradingAgents uses)

## 🤝 Contributing

PRs welcome! Especially:

- New LLM provider adapters (DeepSeek, Mistral, Bedrock, Ollama)
- Better timeout strategies
- Streaming support
- Cost tracking

See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## 📞 Contact

- GitHub Issues: [rocket-cockpit/rocket-cockpit-llm-router/issues](https://github.com/rocket-cockpit/rocket-cockpit-llm-router/issues)
- Email: team@rocket-cockpit.com
- Discord: coming soon

---

**Made with ❤️ in Shenzhen, China**
