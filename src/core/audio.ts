import { midiToFrequency } from './notes';

// Web Audio 합성음. 브라우저 정책상 AudioContext는 사용자 터치 이후에만 소리를 낼 수 있으므로
// 첫 입력 때 unlockAudio()로 생성/재개한다.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let volume = 0.8;

export function getContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext({ latencyHint: 'interactive' });
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
  }
  return ctx;
}

export function unlockAudio(): void {
  const c = getContext();
  if (c.state === 'suspended') void c.resume();
}

export function setVolume(v: number): void {
  volume = v;
  if (master) master.gain.value = v;
}

/** 오디오 시계(초). 리듬 판정 기준 시간. */
export function audioNow(): number {
  return getContext().currentTime;
}

/** 피아노풍 음 하나 재생. when 생략 시 즉시. */
export function playNote(midi: number, duration = 1.2, when?: number, dest?: AudioNode): void {
  const c = getContext();
  const t = when ?? c.currentTime;
  const freq = midiToFrequency(midi);

  const env = c.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(0.5, t + 0.006);
  env.gain.exponentialRampToValueAtTime(0.18, t + 0.25);
  env.gain.exponentialRampToValueAtTime(0.0008, t + duration);

  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(Math.min(freq * 8, 12000), t);
  filter.frequency.exponentialRampToValueAtTime(Math.max(freq * 2, 400), t + duration);

  const body = c.createOscillator();
  body.type = 'triangle';
  body.frequency.value = freq;
  const overtone = c.createOscillator();
  overtone.type = 'sine';
  overtone.frequency.value = freq * 2;
  const overtoneGain = c.createGain();
  overtoneGain.gain.value = 0.35;

  body.connect(filter);
  overtone.connect(overtoneGain).connect(filter);
  filter.connect(env).connect(dest ?? master!);

  body.start(t);
  overtone.start(t);
  body.stop(t + duration + 0.05);
  overtone.stop(t + duration + 0.05);
}

/** 메트로놈 클릭. accent 는 마디 첫 박. */
export function playClick(when: number, accent: boolean, dest?: AudioNode): void {
  const c = getContext();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'square';
  osc.frequency.value = accent ? 1600 : 1100;
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(accent ? 0.25 : 0.15, when + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
  osc.connect(g).connect(dest ?? master!);
  osc.start(when);
  osc.stop(when + 0.06);
}

/** 미리 예약한 소리를 한꺼번에 끊을 수 있도록 별도 출력 버스를 만든다. */
export function createBus(): GainNode {
  getContext();
  const bus = ctx!.createGain();
  bus.connect(master!);
  return bus;
}
