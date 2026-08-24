(() => {
  'use strict';

  const CUBING_SCRAMBLE_URL = 'https://cdn.cubing.net/v0/js/cubing/scramble';
  const MAX_BATCH = 200;
  const PREFETCH_SIZE = 2;

  const EVENTS = Object.freeze({
    '222': Object.freeze({ id: '222', name: '2x2x2 Cube', puzzleId: '2x2x2' }),
    '333': Object.freeze({ id: '333', name: '3x3x3 Cube', puzzleId: '3x3x3' }),
    '444': Object.freeze({ id: '444', name: '4x4x4 Cube', puzzleId: '4x4x4' }),
    '555': Object.freeze({ id: '555', name: '5x5x5 Cube', puzzleId: '5x5x5' }),
    '666': Object.freeze({ id: '666', name: '6x6x6 Cube', puzzleId: '6x6x6' }),
    '777': Object.freeze({ id: '777', name: '7x7x7 Cube', puzzleId: '7x7x7' }),
    '333bf': Object.freeze({ id: '333bf', name: '3x3x3 Blindfolded', puzzleId: '3x3x3' }),
    '333fm': Object.freeze({ id: '333fm', name: 'Fewest Moves', puzzleId: '3x3x3' }),
    '333oh': Object.freeze({ id: '333oh', name: '3x3x3 One-Handed', puzzleId: '3x3x3' }),
    'clock': Object.freeze({ id: 'clock', name: 'Clock', puzzleId: 'clock' }),
    'minx': Object.freeze({ id: 'minx', name: 'Megaminx', puzzleId: 'megaminx' }),
    'pyram': Object.freeze({ id: 'pyram', name: 'Pyraminx', puzzleId: 'pyraminx' }),
    'skewb': Object.freeze({ id: 'skewb', name: 'Skewb', puzzleId: 'skewb' }),
    'sq1': Object.freeze({ id: 'sq1', name: 'Square-1', puzzleId: 'square1' }),
    '444bf': Object.freeze({ id: '444bf', name: '4x4x4 Blindfolded', puzzleId: '4x4x4' }),
    '555bf': Object.freeze({ id: '555bf', name: '5x5x5 Blindfolded', puzzleId: '5x5x5' }),
    '333mbf': Object.freeze({ id: '333mbf', name: '3x3x3 Multi-Blind', puzzleId: '3x3x3', multi: true }),
    'fto': Object.freeze({ id: 'fto', name: 'Face-Turning Octahedron', puzzleId: 'fto' })
  });

  const ALIASES = Object.freeze({
    '2x2': '222', '2x2x2': '222',
    '3x3': '333', '3x3x3': '333',
    '4x4': '444', '4x4x4': '444',
    '5x5': '555', '5x5x5': '555',
    '6x6': '666', '6x6x6': '666',
    '7x7': '777', '7x7x7': '777',
    '3bld': '333bf', '333bld': '333bf',
    'fmc': '333fm',
    'oh': '333oh', '3oh': '333oh',
    'megaminx': 'minx', 'mega': 'minx',
    'pyraminx': 'pyram', 'pyra': 'pyram',
    'square1': 'sq1', 'square-1': 'sq1', 'sq-1': 'sq1',
    '4bld': '444bf', '444bld': '444bf',
    '5bld': '555bf', '555bld': '555bf',
    'mbld': '333mbf', 'multi-blind': '333mbf', 'multiblind': '333mbf',
    'fto': 'fto', 'octahedron': 'fto', 'face-turning-octahedron': 'fto'
  });

  const queues = new Map();
  const refillPromises = new Map();
  let scrambleModulePromise = null;

  function normalizeEventId(eventId) {
    if (typeof eventId !== 'string') return null;
    const key = eventId.trim().toLowerCase();
    if (!key) return null;
    return EVENTS[key] ? key : (ALIASES[key] || null);
  }

  function supportsEvent(eventId) {
    return normalizeEventId(eventId) !== null;
  }

  function getEvent(eventId) {
    const id = normalizeEventId(eventId);
    if (!id) return null;
    return { ...EVENTS[id] };
  }

  function getEvents() {
    return Object.values(EVENTS).map(event => ({ ...event }));
  }

  function assertAmount(value, label = 'amount') {
    if (!Number.isInteger(value) || value < 1 || value > MAX_BATCH) {
      throw new RangeError(`${label} must be an integer between 1 and ${MAX_BATCH}.`);
    }
  }

  function legacy3x3Scramble() {
    const faces = ['R', 'L', 'U', 'D', 'F', 'B'];
    const modifiers = ['', "'", '2'];
    const length = Math.floor(Math.random() * 8) + 19;
    const scramble = [];
    const recentFaces = [];
    for (let i = 0; i < length; i += 1) {
      const available = faces.filter(face => !recentFaces.includes(face));
      const face = available[Math.floor(Math.random() * available.length)];
      const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];
      scramble.push(face + modifier);
      recentFaces.push(face);
      if (recentFaces.length > 2) recentFaces.shift();
    }
    return scramble.join(' ');
  }

  function localFileFallback(eventId) {
    if (eventId === '222' && window.Scramble2x2?.generate) {
      return window.Scramble2x2.generate().join(' ');
    }
    if (eventId === '333') return legacy3x3Scramble();
    return null;
  }

  async function loadScrambleModule() {
    if (!scrambleModulePromise) {
      scrambleModulePromise = import(CUBING_SCRAMBLE_URL).catch(error => {
        scrambleModulePromise = null;
        throw error;
      });
    }
    return scrambleModulePromise;
  }

  async function generateDirect(eventId) {
    if (eventId === '333mbf') {
      throw new Error('333mbf is a multi-scramble event. Use SSCScrambles.generateMultiBlind(cubeCount).');
    }

    if (location.protocol === 'file:') {
      const fallback = localFileFallback(eventId);
      if (fallback) return fallback;
      throw new Error(`Unable to generate scramble for: ${eventId}. cubing.js requires http(s) or localhost.`);
    }

    try {
      const { randomScrambleForEvent } = await loadScrambleModule();
      const alg = await randomScrambleForEvent(eventId);
      const text = alg.toString().trim();
      if (!text) throw new Error('Scramble generator returned an empty algorithm.');
      return text;
    } catch (error) {
      console.error(`[SSC Scrambles] Unable to generate scramble for: ${eventId}`, error);
      throw new Error(`Unable to generate scramble for: ${eventId}`, { cause: error });
    }
  }

  function getQueue(eventId) {
    if (!queues.has(eventId)) queues.set(eventId, []);
    return queues.get(eventId);
  }

  function scheduleRefill(eventId) {
    if (location.protocol === 'file:' || eventId === '333mbf' || refillPromises.has(eventId)) return;
    const queue = getQueue(eventId);
    if (queue.length >= PREFETCH_SIZE) return;

    const refill = (async () => {
      while (queue.length < PREFETCH_SIZE) {
        try {
          queue.push(await generateDirect(eventId));
        } catch (error) {
          console.warn(`[SSC Scrambles] Prefetch stopped for ${eventId}.`, error);
          break;
        }
      }
    })().finally(() => refillPromises.delete(eventId));

    refillPromises.set(eventId, refill);
  }

  async function generate(eventId) {
    const id = normalizeEventId(eventId);
    if (!id) throw new Error(`Unsupported scramble event: ${String(eventId)}`);
    if (id === '333mbf') {
      throw new Error('333mbf is a multi-scramble event. Use SSCScrambles.generateMultiBlind(cubeCount).');
    }

    const queue = getQueue(id);
    if (queue.length) {
      const scramble = queue.shift();
      scheduleRefill(id);
      return scramble;
    }

    const scramble = await generateDirect(id);
    scheduleRefill(id);
    return scramble;
  }

  async function generateMany(eventId, amount) {
    assertAmount(amount);
    const id = normalizeEventId(eventId);
    if (!id) throw new Error(`Unsupported scramble event: ${String(eventId)}`);
    if (id === '333mbf') {
      throw new Error('Use SSCScrambles.generateMultiBlind(cubeCount) for 333mbf.');
    }

    const scrambles = [];
    for (let i = 0; i < amount; i += 1) {
      scrambles.push(await generate(id));
    }
    return scrambles;
  }

  async function generateMultiBlind(cubeCount) {
    assertAmount(cubeCount, 'cubeCount');
    const scrambles = [];
    for (let i = 0; i < cubeCount; i += 1) {
      scrambles.push(await generate('333'));
    }
    return scrambles;
  }

  async function testAll() {
    const results = {};
    for (const event of Object.values(EVENTS)) {
      if (event.id === '333mbf') continue;
      try {
        const scramble = await generate(event.id);
        results[event.id] = { ok: true, scramble };
        console.info(`✓ ${event.id}`);
      } catch (error) {
        results[event.id] = { ok: false, error: error.message };
        console.error(`✗ ${event.id}`, error);
      }
    }

    try {
      const scrambles = await generateMultiBlind(3);
      results['333mbf'] = { ok: true, scrambles };
      console.info('✓ 333mbf × 3 cubes');
    } catch (error) {
      results['333mbf'] = { ok: false, error: error.message };
      console.error('✗ 333mbf × 3 cubes', error);
    }

    return results;
  }

  window.SSCScrambles = Object.freeze({
    generate,
    generateMany,
    generateMultiBlind,
    normalizeEventId,
    supportsEvent,
    getEvent,
    getEvents,
    testAll
  });
})();