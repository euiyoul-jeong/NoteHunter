import { describe, expect, it } from 'vitest';
import { SONGS, getSong, parseSong, songSteps } from '../src/core/songs';
import { layoutSong } from '../src/core/layout';
import { toMidi } from '../src/core/notes';

describe('parseSong', () => {
  it('길이·박 위치·마디 계산', () => {
    const notes = parseSong('C4q D4h. | Rq E4e F4e');
    expect(notes.map((n) => n.beats)).toEqual([1, 3, 1, 0.5, 0.5]);
    expect(notes.map((n) => n.startBeat)).toEqual([0, 1, 4, 5, 5.5]);
    expect(notes.map((n) => n.measure)).toEqual([0, 0, 1, 1, 1]);
    expect(notes[2].pitches).toEqual([]);
  });

  it('화음 토큰은 낮은 음부터 정렬', () => {
    const [n] = parseSong('G3+C3+E3h', 'bass');
    expect(n.pitches.map(toMidi)).toEqual([48, 52, 55]);
    expect(n.clef).toBe('bass');
    expect(n.beats).toBe(2);
  });

  it('잘못된 토큰은 예외', () => {
    expect(() => parseSong('C4x')).toThrow();
    expect(() => parseSong('C4+q')).toThrow();
  });
});

describe('내장 곡', () => {
  it.each(SONGS.map((s) => [s.title, s] as const))('%s — 마디 길이 일치, 성부 길이 일치', (_t, song) => {
    for (const clef of ['treble', 'bass'] as const) {
      const voice = song.notes.filter((n) => n.clef === clef);
      if (voice.length === 0) continue;
      // 못갖춘마디(첫/끝 마디)를 제외한 마디는 박 수가 정확해야 한다
      const byMeasure = new Map<number, number>();
      for (const n of voice) byMeasure.set(n.measure, (byMeasure.get(n.measure) ?? 0) + n.beats);
      const last = Math.max(...byMeasure.keys());
      for (const [m, beats] of byMeasure) {
        if (m === 0 || m === last) continue;
        expect(beats, `${song.title} ${clef} ${m + 1}마디`).toBe(song.beatsPerMeasure);
      }
    }
    if (song.staff === 'grand') {
      const end = (clef: string) => Math.max(...song.notes.filter((n) => n.clef === clef).map((n) => n.startBeat + n.beats));
      expect(end('treble')).toBe(end('bass'));
    }
  });

  it('자리표 자동 판별', () => {
    expect(getSong('twinkle').staff).toBe('treble');
    expect(getSong('london').staff).toBe('bass');
    expect(getSong('twinkle-2h').staff).toBe('grand');
  });

  it('양손 곡 단계: 같은 박의 오른손+왼손 화음을 한 단계로', () => {
    const steps = songSteps(getSong('twinkle-2h'));
    expect(steps[0].startBeat).toBe(0);
    expect(steps[0].midis.sort()).toEqual([48, 52, 55, 60].sort()); // 도 + 왼손 C화음 (도는 겹치지 않음)
    expect(steps[1].midis).toEqual([60]); // 둘째 박은 오른손만
  });

  it('배치: 같은 박의 두 성부는 같은 x', () => {
    const song = getSong('joy-2h');
    const { xs } = layoutSong(song.notes, 72);
    song.notes.forEach((a, i) =>
      song.notes.forEach((b, j) => {
        if (a.startBeat === b.startBeat) expect(xs[i]).toBe(xs[j]);
      }),
    );
  });
});
