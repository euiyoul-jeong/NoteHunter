import { ledgerSteps, staffStep, toMidi, type Clef, type Pitch, type StaffKind } from '../core/notes';

// 오선 SVG (높은음자리표 / 낮은음자리표 / 큰보표). 좌표는 viewBox 기준 — 줄 간격 12, 오선 step(줄/칸) 하나당 6.

const SPACE = 12;
const STEP = SPACE / 2;
const STAFF_SPAN = SPACE * 4;
const TOP = 44;
/** 큰보표에서 낮은음 보표의 맨 윗줄 */
const BASS_TOP_GRAND = TOP + STAFF_SPAN + 72;
export const CLEF_WIDTH = 46;

export function staffHeight(kind: StaffKind): number {
  return kind === 'grand' ? BASS_TOP_GRAND + STAFF_SPAN + 58 : 150;
}

function staffTop(kind: StaffKind, clef: Clef): number {
  return kind === 'grand' && clef === 'bass' ? BASS_TOP_GRAND : TOP;
}

function yOf(kind: StaffKind, clef: Clef, step: number): number {
  return staffTop(kind, clef) + STAFF_SPAN - step * STEP;
}

/** 음이름 라벨 위치: 한 보표면 아래, 큰보표면 높은음은 위·낮은음은 아래 */
function labelY(kind: StaffKind, clef: Clef): number {
  if (kind !== 'grand') return 140;
  return clef === 'treble' ? 16 : BASS_TOP_GRAND + STAFF_SPAN + 44;
}

export type NoteState = 'normal' | 'current' | 'done' | 'wrong' | 'perfect' | 'good' | 'miss' | 'faded';

export interface StaffNote {
  id: number;
  /** 빈 배열이면 쉼표, 2개 이상이면 화음 */
  pitches: Pitch[];
  clef: Clef;
  beats: number;
  x: number;
  state?: NoteState;
  label?: string;
}

interface Props {
  kind: StaffKind;
  width: number;
  notes: StaffNote[];
  barLines?: number[];
  hitLineX?: number;
  /** true 면 부모를 꽉 채운다(width 는 부모 비율에 맞춰 넘겨줄 것). false 면 높이에 맞춘 고정 비율(가로 스크롤용) */
  fluid?: boolean;
  className?: string;
}

export function Staff({ kind, width, notes, barLines = [], hitLineX, fluid = false, className = '' }: Props) {
  const height = staffHeight(kind);
  const clefs: Clef[] = kind === 'grand' ? ['treble', 'bass'] : [kind];
  const top = staffTop(kind, clefs[0]);
  const bottom = staffTop(kind, clefs[clefs.length - 1]) + STAFF_SPAN;
  const lineStart = kind === 'grand' ? 14 : 4;
  const lines = (x1: number, x2: number, prefix: string) =>
    clefs.flatMap((clef) =>
      [0, 1, 2, 3, 4].map((i) => {
        const y = staffTop(kind, clef) + i * SPACE;
        return <line key={`${prefix}${clef}${i}`} className="staff-line" x1={x1} x2={x2} y1={y} y2={y} />;
      }),
    );

  return (
    <svg
      className={`staff ${className}`}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio={fluid ? 'xMidYMid meet' : 'xMinYMid meet'}
      style={fluid ? { width: '100%', height: '100%' } : { height: '100%', aspectRatio: `${width} / ${height}` }}
      role="img"
      aria-label="악보"
    >
      {lines(lineStart, width - 4, 's')}
      {barLines.map((x, i) => (
        <line key={`b${i}`} className="bar-line" x1={x} x2={x} y1={top} y2={bottom} />
      ))}
      {hitLineX !== undefined && (
        <rect className="hit-line" x={hitLineX - 14} y={top - 30} width={28} height={bottom - top + 60} rx={14} />
      )}
      {notes.map((n) => (
        <NoteGlyph key={n.id} note={n} kind={kind} />
      ))}
      <rect className="clef-bg" x={0} y={0} width={CLEF_WIDTH} height={height} />
      {lines(lineStart, CLEF_WIDTH, 'c')}
      {kind === 'grand' && (
        <>
          <line className="bar-line" x1={lineStart} x2={lineStart} y1={top} y2={bottom} />
          <Brace top={top} bottom={bottom} />
        </>
      )}
      {clefs.map((clef) =>
        clef === 'treble' ? (
          <TrebleClef key={clef} x={kind === 'grand' ? 28 : 24} y={yOf(kind, clef, 2)} />
        ) : (
          <BassClef key={clef} x={kind === 'grand' ? 25 : 21} y={yOf(kind, clef, 6)} />
        ),
      )}
    </svg>
  );
}

/** 솔(G4) 줄을 기준(0,0)으로 그린 단순화한 높은음자리표 */
function TrebleClef({ x, y }: { x: number; y: number }) {
  return (
    <g className="clef" transform={`translate(${x} ${y})`}>
      <path
        d="M3 5 C-4 5 -6 -5 1 -7 C9 -9 13 0 9 7 C5 13 -9 13 -12 3 C-14 -8 -4 -17 4 -25
           C11 -32 13 -45 7 -50 C1 -54 -4 -43 -2 -33 L5 21 C6 28 1 31 -3 29"
        fill="none"
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={-3} cy={25} r={3.6} />
    </g>
  );
}

/** 파(F3) 줄을 기준(0,0)으로 그린 낮은음자리표 — 두 점이 파 줄을 감싼다 */
function BassClef({ x, y }: { x: number; y: number }) {
  return (
    <g className="clef" transform={`translate(${x} ${y})`}>
      <path d="M-8 1 C-9 -10 5 -14 11 -5 C16 3 10 17 -9 27" fill="none" strokeWidth={3} strokeLinecap="round" />
      <circle cx={-6} cy={0} r={4.2} />
      <circle cx={17} cy={-6} r={2.2} />
      <circle cx={17} cy={6} r={2.2} />
    </g>
  );
}

/** 큰보표 왼쪽의 중괄호 */
function Brace({ top, bottom }: { top: number; bottom: number }) {
  const mid = (top + bottom) / 2;
  const x = 10;
  return (
    <path
      className="brace"
      d={`M${x} ${top} C${x - 8} ${top + 20} ${x + 2} ${mid - 22} ${x - 7} ${mid}
          C${x + 2} ${mid + 22} ${x - 8} ${bottom - 20} ${x} ${bottom}`}
    />
  );
}

function NoteGlyph({ note, kind }: { note: StaffNote; kind: StaffKind }) {
  const { x, pitches, beats, clef, state = 'normal', label } = note;
  const cls = `note note-${state}`;
  const y = (step: number) => yOf(kind, clef, step);

  if (pitches.length === 0) {
    return (
      <g className={cls}>
        <Rest x={x} beats={beats} y={y} />
      </g>
    );
  }

  // 낮은 음부터
  const heads = pitches
    .map((p) => ({ p, step: staffStep(p, clef) }))
    .sort((a, b) => a.step - b.step);
  const minStep = heads[0].step;
  const maxStep = heads[heads.length - 1].step;
  // 가운데 줄(step 4)에서 더 멀리 있는 음 쪽으로 기둥 방향을 정한다
  const stemUp = 4 - minStep > maxStep - 4;

  // 2도로 붙은 음은 머리를 기둥 반대편으로 비낀다
  const shift = heads.map(() => 0);
  for (let i = 1; i < heads.length; i++) {
    if (heads[i].step - heads[i - 1].step === 1 && shift[i - 1] === 0) {
      if (stemUp) shift[i] = 12;
      else shift[i - 1] = -12;
    }
  }

  const hollow = beats >= 2;
  const hasStem = beats < 4;
  const hasFlag = beats < 1;
  const dotted = [3, 1.5, 0.75].includes(beats);
  const stemX = stemUp ? x + 5.8 : x - 5.8;
  const stemFrom = stemUp ? y(minStep) : y(maxStep);
  const stemEnd = stemUp ? y(maxStep) - 34 : y(minStep) + 34;
  const ledgers = [...new Set(heads.flatMap((h) => ledgerSteps(h.step)))];
  const leftMost = Math.min(0, ...shift);
  const rightMost = Math.max(0, ...shift);

  // 임시표가 가까이 겹치면(6칸 이내) 왼쪽으로 한 열씩 밀어 쌓는다 — 위에서부터 배치
  const accidentals: { step: number; acc: number; col: number }[] = [];
  for (const h of [...heads].reverse()) {
    if (h.p.accidental === 0) continue;
    let col = 0;
    while (accidentals.some((a) => a.col === col && a.step - h.step < 6)) col++;
    accidentals.push({ step: h.step, acc: h.p.accidental, col });
  }

  return (
    <g className={cls} data-midi={pitches.map(toMidi).join(',')}>
      {ledgers.map((s) => (
        <line key={s} className="ledger" x1={x - 11 + leftMost} x2={x + 11 + rightMost} y1={y(s)} y2={y(s)} />
      ))}
      {heads.map((h, i) => (
        <ellipse
          key={i}
          cx={x + shift[i]}
          cy={y(h.step)}
          rx={6.6}
          ry={4.7}
          transform={`rotate(-20 ${x + shift[i]} ${y(h.step)})`}
          className={hollow ? 'head hollow' : 'head'}
        />
      ))}
      {hasStem && <line className="stem" x1={stemX} x2={stemX} y1={stemFrom} y2={stemEnd} />}
      {hasFlag && (
        <path
          className="flag"
          d={
            stemUp
              ? `M${stemX} ${stemEnd} C${stemX + 1} ${stemEnd + 8} ${stemX + 11} ${stemEnd + 11} ${stemX + 8} ${stemEnd + 24}`
              : `M${stemX} ${stemEnd} C${stemX + 1} ${stemEnd - 8} ${stemX + 11} ${stemEnd - 11} ${stemX + 8} ${stemEnd - 24}`
          }
        />
      )}
      {dotted &&
        heads.map((h, i) => (
          <circle key={i} className="dot" cx={x + 12 + rightMost} cy={h.step % 2 === 0 ? y(h.step) - 3 : y(h.step)} r={1.9} />
        ))}
      {accidentals.map((a) => (
        <text
          key={a.step}
          className="accidental"
          x={x - 17 + leftMost - a.col * 11}
          y={y(a.step)}
          dominantBaseline="central"
          textAnchor="middle"
        >
          {a.acc === 1 ? '♯' : '♭'}
        </text>
      ))}
      {label && (
        <text className="note-label" x={x} y={labelY(kind, clef)} textAnchor="middle">
          {label}
        </text>
      )}
    </g>
  );
}

function Rest({ x, beats, y }: { x: number; beats: number; y: (step: number) => number }) {
  if (beats >= 4) return <rect className="rest" x={x - 6} y={y(6)} width={12} height={5} />;
  if (beats >= 2) return <rect className="rest" x={x - 6} y={y(4) - 5} width={12} height={5} />;
  // 4분/8분 쉼표: 지그재그
  const t = y(7);
  return (
    <path
      className="rest-line"
      d={`M${x - 2} ${t} L${x + 4} ${t + 8} L${x - 3} ${t + 15} L${x + 4} ${t + 23} C${x - 4} ${t + 20} ${x - 4} ${t + 28} ${x + 1} ${t + 31}`}
    />
  );
}
