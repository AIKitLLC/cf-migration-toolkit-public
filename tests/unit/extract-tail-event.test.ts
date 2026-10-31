import { describe, expect, it } from 'vitest';
import { extractTailMatch } from '../../scripts/d1/extract-tail-event.js';

const OPERATOR_IP = '203.0.113.10';

function event(ray: string, path: string): unknown {
  return {
    outcome: 'ok',
    eventTimestamp: Date.parse('2026-10-15T17:26:00.000Z'),
    event: {
      request: {
        url: `https://d1.example.workers.dev${path}`,
        method: 'GET',
        headers: {
          'cf-connecting-ip': OPERATOR_IP,
          'cf-ray': ray,
          'x-forwarded-for': OPERATOR_IP,
        },
      },
    },
  };
}

function rayIdEvent(rayId: string, path: string): unknown {
  return {
    outcome: 'ok',
    rayId,
    eventTimestamp: Date.parse('2026-10-15T17:26:00.000Z'),
    event: {
      request: {
        url: `https://d1.example.workers.dev${path}`,
        method: 'GET',
        headers: {
          'cf-connecting-ip': OPERATOR_IP,
        },
      },
    },
  };
}

describe('extractTailMatch', () => {
  it('keeps the matching event and drops the operator IP', () => {
    const raw = [event('ready-ray', '/__cfmt-invoke?ready=nonce'), event('AbC-EWR', '/__cfmt-invoke')]
      .map((entry) => JSON.stringify(entry, null, 2))
      .join('\n');
    const match = extractTailMatch(raw, 'abc-ewr');
    expect(match).toEqual({
      rayId: 'AbC-EWR',
      outcome: 'ok',
      timestamp: '2026-10-15T17:26:00.000Z',
      path: '/__cfmt-invoke',
    });
    expect(JSON.stringify(match)).not.toContain(OPERATOR_IP);
    expect(JSON.stringify(match)).not.toContain('cf-connecting-ip');
  });

  it('does not select a ready probe with a different ray', () => {
    const raw = `${JSON.stringify(event('other-ray', '/__cfmt-invoke?ready=nonce'))}\n`;
    expect(() => extractTailMatch(raw, 'abc-ewr')).toThrow(/no event for ray/);
  });

  it('matches a suffixed response cf-ray to a tail ray id without that suffix', () => {
    const raw = `${JSON.stringify(rayIdEvent('a4baa744bd414f4c', '/__cfmt-invoke'))}\n`;
    expect(extractTailMatch(raw, 'a4baa744bd414f4c-SEA')).toEqual({
      rayId: 'a4baa744bd414f4c',
      outcome: 'ok',
      timestamp: '2026-10-15T17:26:00.000Z',
      path: '/__cfmt-invoke',
    });
    expect(JSON.stringify(extractTailMatch(raw, 'a4baa744bd414f4c-SEA'))).not.toContain(OPERATOR_IP);
  });

  it('matches a lowercase suffixed cf-ray to an uppercase tail ray id', () => {
    const raw = `${JSON.stringify(event('A4BAA744BD414F4C', '/__cfmt-invoke'))}\n`;
    expect(extractTailMatch(raw, 'a4baa744bd414f4c-sea').rayId).toBe('A4BAA744BD414F4C');
  });
});
