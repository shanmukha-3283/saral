import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  coerceActions,
  detectFileType,
  parseExplain,
} from '../src/explain'

describe('detectFileType', () => {
  it('detects PNG by magic bytes', () => {
    assert.equal(
      detectFileType(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]),
      ),
      'image/png',
    )
  })
  it('detects JPEG by magic bytes', () => {
    assert.equal(
      detectFileType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])),
      'image/jpeg',
    )
  })
  it('detects PDF by %PDF- magic', () => {
    assert.equal(
      detectFileType(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])),
      'application/pdf',
    )
  })
  it('rejects anything else', () => {
    assert.throws(
      () => detectFileType(new Uint8Array([0x68, 0x65, 0x6c, 0x6c])),
      /PNG, JPEG, or PDF/,
    )
  })
})

describe('coerceActions', () => {
  it('converts empty deadline strings to null', () => {
    assert.deepEqual(
      coerceActions([
        { step: 'Visit the office', deadline: '30 September 2026' },
        { step: 'Keep a copy', deadline: '' },
      ]),
      [
        { step: 'Visit the office', deadline: '30 September 2026' },
        { step: 'Keep a copy', deadline: null },
      ],
    )
  })
  it('drops rows without a step and ignores non-arrays', () => {
    assert.deepEqual(
      coerceActions([{ deadline: 'soon' }, null, 42, { step: '' }]),
      [],
    )
    assert.deepEqual(coerceActions(undefined), [])
  })
})

describe('parseExplain', () => {
  const good = {
    summary: 's',
    what_it_means: 'm',
    actions: [{ step: 'do it', deadline: '' }],
    draft_reply: 'r',
  }
  it('parses a valid contract', () => {
    const out = parseExplain(JSON.stringify(good))
    assert.equal(out.summary, 's')
    assert.deepEqual(out.actions, [{ step: 'do it', deadline: null }])
  })
  it('strips markdown fences', () => {
    const out = parseExplain(`\`\`\`json\n${JSON.stringify(good)}\n\`\`\``)
    assert.equal(out.draft_reply, 'r')
  })
  it('rejects a response missing required keys', () => {
    assert.throws(
      () => parseExplain(JSON.stringify({ summary: 's' })),
      /missing required keys/,
    )
    assert.throws(() => parseExplain('not json'), SyntaxError)
  })
})
