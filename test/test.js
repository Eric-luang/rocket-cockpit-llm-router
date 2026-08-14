// rocket-cockpit-llm-router tests
// Run: node test/test.js

const { LLMRouter } = require('../src/index.js');

// Mock fetch for testing
let mockResponses = [];
let currentMock = 0;

global.fetch = async (url, opts) => {
  const mock = mockResponses[currentMock++];
  if (!mock) throw new Error('No more mock responses');
  return {
    ok: mock.ok !== false,
    status: mock.status || 200,
    statusText: mock.statusText || 'OK',
    text: async () => mock.errorText || '',
    json: async () => mock.data,
  };
};

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
  } catch (e) {
    console.error(`❌ ${name}: ${e.message}`);
    process.exit(1);
  }
}

async function run() {
  await test('chat with default provider (zhipu enabled)', async () => {
    mockResponses = [{
      data: { choices: [{ message: { content: 'Hello back!' } }], usage: { prompt_tokens: 5, completion_tokens: 2 } }
    }];
    const router = new LLMRouter({
      providers: {
        zhipu: { apiKey: 'sk-test', enabled: true, models: { 'text-quick': 'glm-4-flash' } },
      },
    });
    const r = await router.chat({ task: 'text-quick', messages: [{ role: 'user', content: 'hi' }] });
    if (r.text !== 'Hello back!') throw new Error('text mismatch');
    if (r.provider !== 'zhipu') throw new Error('provider mismatch');
  });

  await test('fallback when first provider fails', async () => {
    currentMock = 0;
    mockResponses = [
      { ok: false, status: 500, statusText: 'Internal Server Error', errorText: 'down' },
      { data: { choices: [{ message: { content: 'fallback worked' } }] } },
    ];
    const router = new LLMRouter({
      providers: {
        zhipu: { apiKey: 'sk-zhipu', enabled: true, models: { 'text-quick': 'glm-4-flash' } },
        minimax: { apiKey: 'sk-minimax', enabled: true, models: { 'text-quick': 'm3' } },
      },
    });
    const r = await router.chatWithFallback({
      task: 'text-quick',
      messages: [{ role: 'user', content: 'hi' }],
    });
    if (r.provider !== 'minimax') throw new Error('should fallback to minimax, got ' + r.provider);
  });

  await test('all providers fail → throw', async () => {
    currentMock = 0;
    mockResponses = [
      { ok: false, status: 500, errorText: 'fail1' },
      { ok: false, status: 500, errorText: 'fail2' },
    ];
    const router = new LLMRouter({
      providers: {
        zhipu: { apiKey: 'sk-1', enabled: true, models: { 'text-quick': 'a' } },
        minimax: { apiKey: 'sk-2', enabled: true, models: { 'text-quick': 'b' } },
      },
    });
    try {
      await router.chatWithFallback({ task: 'text-quick', messages: [{ role: 'user', content: 'hi' }] });
      throw new Error('should have thrown');
    } catch (e) {
      if (!e.message.includes('All LLM providers failed')) throw new Error('wrong error: ' + e.message);
    }
  });

  await test('vision task with image', async () => {
    currentMock = 0;
    mockResponses = [{
      data: { choices: [{ message: { content: '识别到 5 只股票' } }] }
    }];
    const router = new LLMRouter({
      providers: {
        zhipu: { apiKey: 'sk', enabled: true, models: { 'vision': 'glm-4v-flash' } },
      },
    });
    const r = await router.chat({
      task: 'vision',
      messages: [{ role: 'user', content: '识别股票' }],
      imageBase64: 'iVBORw0KGgo...',
      imageMime: 'image/png',
    });
    if (!r.text.includes('识别')) throw new Error('vision failed');
  });

  await test('override provider', async () => {
    currentMock = 0;
    mockResponses = [{
      data: { choices: [{ message: { content: 'forced minimax' } }] }
    }];
    const router = new LLMRouter({
      providers: {
        zhipu: { apiKey: 'a', enabled: true, models: { 'text-quick': 'b' } },
        minimax: { apiKey: 'c', enabled: true, models: { 'text-quick': 'd' } },
      },
    });
    const r = await router.chat({
      task: 'text-quick',
      messages: [{ role: 'user', content: 'hi' }],
      providerOverride: 'minimax',
    });
    if (r.provider !== 'minimax') throw new Error('override failed');
  });

  console.log('\n🎉 All tests passed!');
}

run().catch(e => { console.error(e); process.exit(1); });
