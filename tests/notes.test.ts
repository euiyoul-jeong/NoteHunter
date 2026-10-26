import { describe, expect, it } from 'vitest';
import {
  clefFor,
  isBlackKey,
  keyboardRange,
  ledgerSteps,
  midiToPitch,
  parsePitch,
  pitchName,
  staffStep,
  toMidi,
} from '../src/core/notes';

describe('notes', () => {
  it('MIDI 변환', () => {
    expect(toMidi(parsePitch('C4'))).toBe(60);
    expect(toMidi(parsePitch('A4'))).toBe(69);
    expect(toMidi(parsePitch('C6'))).toBe(84);
    expect(toMidi(parsePitch('F#4'))).toBe(66);
    expect(toMidi(parsePitch('Bb4'))).toBe(70);
    expect(toMidi(parsePitch('Eb4'))).toBe(toMidi(parsePitch('D#4')));
  });

  it('높은음자리표 오선 위치', () => {
    expect(staffStep(parsePitch('E4'))).toBe(0); // 맨 아래 줄
    expect(staffStep(parsePitch('G4'))).toBe(2); // 둘째 줄 (솔 자리표)
    expect(staffStep(parsePitch('F5'))).toBe(8); // 맨 윗줄
    expect(staffStep(parsePitch('C4'))).toBe(-2); // 아래 덧줄
    expect(staffStep(parsePitch('C6'))).toBe(12);
    expect(staffStep(parsePitch('F#4'))).toBe(staffStep(parsePitch('F4')));
  });

  it('낮은음자리표 오선 위치', () => {
    expect(staffStep(parsePitch('G2'), 'bass')).toBe(0); // 맨 아래 줄
    expect(staffStep(parsePitch('F3'), 'bass')).toBe(6); // 넷째 줄 (파 자리표)
    expect(staffStep(parsePitch('A3'), 'bass')).toBe(8); // 맨 윗줄
    expect(staffStep(parsePitch('C4'), 'bass')).toBe(10); // 위 덧줄
    expect(staffStep(parsePitch('E2'), 'bass')).toBe(-2); // 아래 덧줄
  });

  it('덧줄', () => {
    expect(ledgerSteps(0)).toEqual([]);
    expect(ledgerSteps(-2)).toEqual([-2]);
    expect(ledgerSteps(-1)).toEqual([]); // D4 는 오선 바로 아래 칸
    expect(ledgerSteps(9)).toEqual([]); // G5
    expect(ledgerSteps(10)).toEqual([10]); // A5
    expect(ledgerSteps(12)).toEqual([10, 12]); // C6
  });

  it('큰보표 위치', () => {
    expect(clefFor(parsePitch('C4'))).toBe('treble');
    expect(clefFor(parsePitch('B3'))).toBe('bass');
  });

  it('음이름 표기', () => {
    expect(pitchName(parsePitch('C4'), 'solfege')).toBe('도');
    expect(pitchName(parsePitch('B4'), 'solfege')).toBe('시');
    expect(pitchName(parsePitch('F#4'), 'solfege')).toBe('파♯');
    expect(pitchName(parsePitch('Bb4'), 'letter')).toBe('B♭');
  });

  it('건반', () => {
    expect(isBlackKey(61)).toBe(true);
    expect(isBlackKey(64)).toBe(false);
    expect(midiToPitch(61)).toEqual(parsePitch('C#4'));
    expect(midiToPitch(72)).toEqual(parsePitch('C5'));
  });

  it('건반 범위: 모든 음 포함, 흰 건반 끝, 최소 15개', () => {
    const whites = (lo: number, hi: number) => {
      let n = 0;
      for (let m = lo; m <= hi; m++) if (!isBlackKey(m)) n++;
      return n;
    };
    for (const midis of [[60, 67], [40, 81], [61], [43, 60, 76]]) {
      const { low, high } = keyboardRange(midis);
      expect(low).toBeLessThan(Math.min(...midis));
      expect(high).toBeGreaterThan(Math.max(...midis));
      expect(isBlackKey(low) || isBlackKey(high)).toBe(false);
      expect(whites(low, high)).toBeGreaterThanOrEqual(15);
    }
  });

  it('잘못된 표기는 예외', () => {
    expect(() => parsePitch('H4')).toThrow();
  });
});
