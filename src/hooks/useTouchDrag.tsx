import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';

export interface TouchDragOptions<TToken, TKey extends string | number> {
  onDrop: (token: TToken, targetKey: TKey, fromKey?: TKey) => void;
  onRemove?: (token: TToken, fromKey: TKey) => void;
  dataAttribute: string; // e.g. "data-blank-key" or "data-blank-idx"
}

export function useTouchDrag<TToken extends { id?: string; word?: string; [key: string]: any }, TKey extends string | number>({
  onDrop,
  onRemove,
  dataAttribute,
}: TouchDragOptions<TToken, TKey>) {
  const [isDragging, setIsDragging] = useState(false);
  const [activeToken, setActiveToken] = useState<TToken | null>(null);
  const [fromKey, setFromKey] = useState<TKey | undefined>(undefined);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredKey, setHoveredKey] = useState<TKey | null>(null);

  // Keep latest callbacks and values in refs to avoid stale closures
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;
  const onRemoveRef = useRef(onRemove);
  onRemoveRef.current = onRemove;
  const dataAttributeRef = useRef(dataAttribute);
  dataAttributeRef.current = dataAttribute;

  const dragSessionRef = useRef<{
    startX: number;
    startY: number;
    token: TToken;
    fromKey?: TKey;
    isDragActive: boolean;
    lastX: number;
    lastY: number;
    hoveredKey: TKey | null;
  } | null>(null);

  useEffect(() => {
    return () => {
      dragSessionRef.current = null;
    };
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent, token: TToken, sourceKey?: TKey) => {
    if (!e.touches || e.touches.length === 0) return;
    const touch = e.touches[0];

    dragSessionRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      token,
      fromKey: sourceKey,
      isDragActive: false,
      lastX: touch.clientX,
      lastY: touch.clientY,
      hoveredKey: null,
    };

    const handleWindowTouchMove = (evt: TouchEvent) => {
      const session = dragSessionRef.current;
      if (!session || !evt.touches || evt.touches.length === 0) return;

      const currentTouch = evt.touches[0];
      session.lastX = currentTouch.clientX;
      session.lastY = currentTouch.clientY;

      const dx = currentTouch.clientX - session.startX;
      const dy = currentTouch.clientY - session.startY;
      const dist = Math.hypot(dx, dy);

      if (!session.isDragActive) {
        if (dist > 7) {
          session.isDragActive = true;
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(15); } catch {}
          }
          setIsDragging(true);
          setActiveToken(session.token);
          setFromKey(session.fromKey);
        }
      }

      if (session.isDragActive) {
        if (evt.cancelable) {
          evt.preventDefault();
        }
        setPosition({ x: currentTouch.clientX, y: currentTouch.clientY });

        // Detect element under touch point (both at direct touch point and slightly above)
        let elem = document.elementFromPoint(currentTouch.clientX, currentTouch.clientY);
        let blankEl = elem?.closest(`[${dataAttributeRef.current}]`);
        if (!blankEl) {
          elem = document.elementFromPoint(currentTouch.clientX, currentTouch.clientY - 35);
          blankEl = elem?.closest(`[${dataAttributeRef.current}]`);
        }

        if (blankEl) {
          const rawKey = blankEl.getAttribute(dataAttributeRef.current);
          const parsedKey = (typeof session.fromKey === 'number' && rawKey !== null && !isNaN(Number(rawKey)))
            ? (Number(rawKey) as unknown as TKey)
            : (rawKey as unknown as TKey);

          session.hoveredKey = parsedKey;
          setHoveredKey(parsedKey);
        } else {
          session.hoveredKey = null;
          setHoveredKey(null);
        }
      }
    };

    const handleWindowTouchEnd = (evt: TouchEvent) => {
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowTouchEnd);
      window.removeEventListener('touchcancel', handleWindowTouchEnd);

      const session = dragSessionRef.current;
      if (!session) return;

      if (session.isDragActive) {
        // Find drop target at final touch location
        const finalTouch = evt.changedTouches && evt.changedTouches.length > 0 ? evt.changedTouches[0] : null;
        let finalHoveredKey = session.hoveredKey;

        if (!finalHoveredKey && finalTouch) {
          let elem = document.elementFromPoint(finalTouch.clientX, finalTouch.clientY);
          let blankEl = elem?.closest(`[${dataAttributeRef.current}]`);
          if (!blankEl) {
            elem = document.elementFromPoint(finalTouch.clientX, finalTouch.clientY - 35);
            blankEl = elem?.closest(`[${dataAttributeRef.current}]`);
          }
          if (blankEl) {
            const rawKey = blankEl.getAttribute(dataAttributeRef.current);
            finalHoveredKey = (typeof session.fromKey === 'number' && rawKey !== null && !isNaN(Number(rawKey)))
              ? (Number(rawKey) as unknown as TKey)
              : (rawKey as unknown as TKey);
          }
        }

        if (finalHoveredKey !== null && finalHoveredKey !== undefined) {
          onDropRef.current(session.token, finalHoveredKey, session.fromKey);
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(30); } catch {}
          }
        } else if (session.fromKey !== undefined && session.fromKey !== null) {
          onRemoveRef.current?.(session.token, session.fromKey);
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(20); } catch {}
          }
        }
      }

      dragSessionRef.current = null;
      setIsDragging(false);
      setActiveToken(null);
      setFromKey(undefined);
      setHoveredKey(null);
    };

    window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
    window.addEventListener('touchend', handleWindowTouchEnd);
    window.addEventListener('touchcancel', handleWindowTouchEnd);
  }, []);

  return {
    isDragging,
    activeToken,
    fromKey,
    position,
    hoveredKey,
    handleTouchStart,
  };
}

export const TouchDragGhost: React.FC<{
  isDragging: boolean;
  token: { word?: string } | null;
  position: { x: number; y: number };
}> = ({ isDragging, token, position }) => {
  if (!isDragging || !token || typeof document === 'undefined') return null;

  const content = (
    <div
      className="fixed pointer-events-none z-[99999] select-none -translate-x-1/2 -translate-y-12 transition-transform duration-75 ease-out"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        WebkitTouchCallout: 'none',
        userSelect: 'none',
      }}
    >
      <div className="btn-3d px-4 py-2 rounded-xl bg-white text-[var(--duo-blue)] border-2 border-[var(--duo-blue)] text-base font-black shadow-2xl scale-110 -rotate-3 opacity-95 flex items-center gap-1.5 ring-4 ring-[var(--duo-blue)]/25">
        <span>{token.word}</span>
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
};
