import type { Settings } from '../core/storage';
import type { ScreenProps } from '../types';

type Toggle = { [K in keyof Settings]: Settings[K] extends boolean ? K : never }[keyof Settings];

/** 게임 화면 HUD에서 바로 켜고 끄는 설정 (값은 저장되어 다음 판에도 유지) */
export function SettingChip({ data, update, field, label }: Pick<ScreenProps, 'data' | 'update'> & { field: Toggle; label: string }) {
  const on = data.settings[field];
  return (
    <button
      className={`chip ${on ? 'active' : ''}`}
      aria-pressed={on}
      onClick={() => update((d) => ({ ...d, settings: { ...d.settings, [field]: !d.settings[field] } }))}
    >
      {label}
    </button>
  );
}
