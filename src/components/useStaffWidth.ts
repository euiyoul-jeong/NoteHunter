import { useLayoutEffect, useRef, useState } from 'react';

/** 컨테이너 가로세로 비율에 맞는 오선 viewBox 폭 — 악보가 화면 폭을 꽉 채우도록 한다. */
export function useStaffWidth<T extends HTMLElement>(viewHeight: number, minWidth = 260) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(600);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const { width: w, height: h } = el.getBoundingClientRect();
      if (w > 0 && h > 0) setWidth(Math.max(minWidth, Math.round((w / h) * viewHeight)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [minWidth, viewHeight]);

  return [ref, width] as const;
}
