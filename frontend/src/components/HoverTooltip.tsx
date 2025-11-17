'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type HoverTooltipProps = {
  content: string;
  width?: number;
  children: React.ReactNode;
  placement?: 'top' | 'bottom';
};

export default function HoverTooltip({ content, width = 320, children, placement = 'bottom' }: HoverTooltipProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = () => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 8;
    const top = placement === 'bottom' ? rect.bottom + gap : rect.top - gap;
    let left = rect.left + rect.width / 2 - width / 2;
    const margin = 8;
    if (left < margin) left = margin;
    const maxLeft = window.innerWidth - width - margin;
    if (left > maxLeft) left = maxLeft;
    setCoords({ top, left });
  };

  const handleEnter = () => {
    updatePosition();
    setVisible(true);
  };
  const handleMove = () => {
    if (visible) updatePosition();
  };
  const handleLeave = () => setVisible(false);

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={handleEnter}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        className="inline-flex"
      >
        {children}
      </span>
      {mounted && visible &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width,
              zIndex: 1000,
              pointerEvents: 'none',
            }}
          >
            <div className="relative">
              <div className="bg-gray-900 text-gray-100 text-xs leading-relaxed p-3 rounded-lg border border-gray-700 shadow-2xl whitespace-pre-wrap break-words text-left max-h-60 overflow-auto">
                {content}
              </div>
              <div
                className={`absolute ${placement === 'bottom' ? '-top-1' : '-bottom-1'} left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 border-l border-t border-gray-700 rotate-45`}
              />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}


