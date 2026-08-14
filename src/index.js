/**
 * rocket-cockpit-llm-router v0.1.0
 * Unified LLM client for 9+ providers with auto-fallback.
 * Inspired by TradingAgents (https://github.com/TauricResearch/TradingAgents)
 *
 * Usage:
 *   const router = new LLMRouter({
 *     providers: {
 *       zhipu: { apiKey: 'xxx', enabled: true },
 *       minimax: { apiKey: 'yyy', enabled: false },
 *       openrouter: { apiKey: 'zzz', enabled: true }
 *     }
 *   });
 *   const result = await router.chat({
 *     task: 'text-quick',
 *     messages: [{ role: 'user', content: 'Hello' }]
 *   });
 */

class LLMRouter {
  constructor(config = {}) {
    this.providers = config.providers || {};
    this.timeoutMs = config.timeoutMs || { vision: 60000, 'text-quick': 30000, 'text-deep': 60000 };
  }

  /**
   * Unified chat interface
   * @param {Object} opts - { task, messages, imageBase64, imageMime, maxTokens, temperature, providerOverride }
   * @returns {Promise<{text, provider, model, elapsed, usage, raw}>}
   */
  async chat(opts) {
    const task = opts.task || 'text-quick';
    const override = opts.providerOverride;
    let providerName = override;
    if (!providerName) {
      const enabled = Object.entries(this.providers).filter(([k, v]) => v.enabled);
      providerName = enabled.length > 0 ? enabled[0][0] : Object.keys(this.providers)[0];
    }
    const provider = this.providers[providerName];
    if (!provider) throw new Error(`LLM provider ${providerName} not configured`);
    if (!provider.apiKey) throw new Error(`LLM provider ${providerName} API key is empty`);

    const model = (provider.models && provider.models[task]) || provider.model || 'default';
    const endpoint = provider.endpoint || this._defaultEndpoint(providerName);

    let body;
    let messages = opts.messages || [];
    if (task === 'vision') {
      if (!opts.imageBase64) throw new Error('vision task requires imageBase64');
      const mime = opts.imageMime || 'image/jpeg';
      if (providerName === 'zhipu') {
        messages = [{ role: 'user', content: [
          { type: 'text', text: (opts.messages && opts.messages[0] && opts.messages[0].content) || '识别图片内容' },
          { type: 'image_url', image_url: { url: `data:${mime};base64,${opts.imageBase64}` } }
        ] }];
      } else {
        messages = [{ role: 'user', content: [
          { type: 'text', text: (opts.messages && opts.messages[0] && opts.messages[0].content) || '识别图片内容' },
          { type: 'image_url', image_url: { url: `data:${mime};base64,${opts.imageBase64}` } }
        ] }];
      }
      body = { model, messages, max_tokens: opts.maxTokens || 1024, temperature: opts.temperature || 0.1 };
    } else {
      body = { model, messages, max_tokens: opts.maxTokens || 1024, temperature: opts.temperature !== undefined ? opts.temperature : 0.5 };
    }

    // Timeout + AbortController
    const t0 = Date.now();
    const controller = new AbortController();
    const timeoutMs = this.timeoutMs[task] || 30000;
    const tid = setTimeout(() => controller.abort(), timeoutMs);

    let res;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + provider.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (e) {
      clearTimeout(tid);
      if (e.name === 'AbortError') {
        throw new Error(`[${providerName}/${model}] timeout (${timeoutMs / 1000}s) - possible CORS or network issue`);
      }
      throw e;
    }
    clearTimeout(tid);
    const elapsed = Date.now() - t0;

    if (!res.ok) {
      const errTxt = await res.text().catch(() => '');
      throw new Error(`[${providerName}/${model}] HTTP ${res.status}: ${(errTxt || res.statusText).substring(0, 200)}`);
    }
    const data = await res.json();
    const text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
    const usage = data.usage || {};
    return { text, provider: providerName, model, elapsed, usage, raw: data };
  }

  /**
   * Auto-fallback: try each provider in chain until one succeeds
   * @param {Object} opts - same as chat()
   * @param {Array} chain - provider order to try (default: enabled providers)
   * @returns {Promise<{text, provider, ...}>}
   */
  async chatWithFallback(opts, chain = null) {
    const errors = [];
    const override = opts.providerOverride;
    let providers = chain;
    if (!providers) {
      providers = Object.entries(this.providers)
        .filter(([k, v]) => v.enabled && v.apiKey)
        .map(([k]) => k);
    }
    if (override) {
      providers = [override, ...providers.filter(p => p !== override)];
    }
    for (const providerName of providers) {
      const provider = this.providers[providerName];
      if (!provider || !provider.enabled || !provider.apiKey) continue;
      try {
        return await this.chat({ ...opts, providerOverride: providerName });
      } catch (e) {
        errors.push({ provider: providerName, error: e.message });
      }
    }
    throw new Error('All LLM providers failed: ' + JSON.stringify(errors));
  }

  _defaultEndpoint(providerName) {
    const endpoints = {
      zhipu: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      minimax: 'https://api.minimax.chat/v1/chat/completions',
      openrouter: 'https://openrouter.ai/api/v1/chat/completions',
      openai: 'https://api.openai.com/v1/chat/completions',
      anthropic: 'https://api.anthropic.com/v1/messages',
      qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    };
    return endpoints[providerName] || '';
  }
}

module.exports = { LLMRouter };
