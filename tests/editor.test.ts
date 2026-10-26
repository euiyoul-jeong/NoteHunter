import { describe, expect, it } from 'vitest';
import { addPitch, midiText, sourceToTokens, tokensToSource, type EditToken } from '../src/core/editor';
import { parseSong } from '../src/core/songs';

const q = (...pitches: string[]): EditToken => ({ pitches, dur: 'q', dotted: false });

describe('곡 만들기 편집기', () => {
  it('건반 번호 → 음 표기', () => {
    expect(midiText(60)).toBe('C4');
    expect(midiText(61)).toBe('C#4');
    expect(midiText(43)).toBe('G2');
  });

  it('마디가 차면 마디줄을 자동으로 넣는다', () => {
    const tokens = [q('C4'), q('D4'), q('E4'), q('F4'), { pitches: ['G4'], dur: 'w', dotted: false } as EditToken];
    expect(tokensToSource(tokens, 4)).toBe('C4q D4q E4q F4q | G4w');
    expect(tokensToSource([q('C4'), q('D4'), q('E4'), q('F4')], 2)).toBe('C4q D4q | E4q F4q');
    // 3/4: 점2분음표 하나가 한 마디
    expect(tokensToSource([{ pitches: ['C4'], dur: 'h', dotted: true }, q('D4')], 3)).toBe('C4h. | D4q');
  });

  it('쉼표·화음·점음표 표기가 곡 파서로 그대로 읽힌다', () => {
    const tokens: EditToken[] = [
      { pitches: [], dur: 'q', dotted: false },
      { pitches: ['C3', 'E3', 'G3'], dur: 'h', dotted: false },
      { pitches: ['D4'], dur: 'e', dotted: true },
      { pitches: ['E4'], dur: 'e', dotted: false },
    ];
    const source = tokensToSource(tokens, 4);
    expect(source).toBe('Rq C3+E3+G3h D4e. E4e');
    expect(() => parseSong(source)).not.toThrow();
  });

  it('저장된 곡 표기 → 편집용 음표 → 다시 같은 표기', () => {
    const source = 'C4q D4q E4h | Rq G3+B3+D4h. | E4e F#4e G4q. A4e B4q';
    const tokens = sourceToTokens(source, 'treble');
    expect(tokens[3].pitches).toEqual([]);
    expect(tokens[4]).toEqual({ pitches: ['G3', 'B3', 'D4'], dur: 'h', dotted: true });
    expect(tokensToSource(tokens, 4)).toBe(source);
    expect(sourceToTokens(undefined, 'bass')).toEqual([]);
  });

  it('화음 묶기: 마지막 음표에 쌓고, 같은 음은 한 번만', () => {
    let t = addPitch([], 'C4', 'h', false, false);
    t = addPitch(t, 'E4', 'q', false, true);
    t = addPitch(t, 'E4', 'q', false, true);
    t = addPitch(t, 'G4', 'q', false, true);
    expect(t).toEqual([{ pitches: ['C4', 'E4', 'G4'], dur: 'h', dotted: false }]);
    // 쉼표 뒤에는 쌓지 않고 새 음표
    t = addPitch([...t, { pitches: [], dur: 'q', dotted: false }], 'D4', 'q', false, true);
    expect(t).toHaveLength(3);
  });
});

describe('편집기 붙임줄', () => {
  it('표기 왕복', () => {
    const source = 'C4w~ | C4q D4q E4h';
    expect(tokensToSource(sourceToTokens(source, 'treble'), 4)).toBe(source);
  });
});
