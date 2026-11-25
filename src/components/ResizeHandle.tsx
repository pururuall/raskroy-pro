import React, { useRef, useState } from "react";

interface ResizeHandleProps {
  /** "vertical" resizes left/right width (cursor col-resize); "horizontal" resizes top/bottom height (cursor row-resize) */
  orientation: "vertical" | "horizontal";
  onResize: (deltaPx: number) => void;
  onReset?: () => void;
  title?: string;
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({
  orientation,
  onResize,
  onReset,
  title,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const lastPosRef = useRef<number>(0);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    lastPosRef.current = orientation === "vertical" ? e.clientX : e.clientY;
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const currentPos =
        orientation === "vertical" ? moveEvent.clientX : moveEvent.clientY;
      const delta = currentPos - lastPosRef.current;
      if (delta !== 0) {
        lastPosRef.current = currentPos;
        onResize(delta);
      }
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      document.body.style.userSelect = prevUserSelect;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  if (orientation === "vertical") {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        onPointerDown={handlePointerDown}
        onDoubleClick={onReset}
        title={title || "Потяните для изменения ширины (двойной клик — сброс)"}
        className={`hidden xl:flex self-stretch w-2.5 shrink-0 items-center justify-center cursor-col-resize group select-none z-10 transition-colors ${
          isDragging ? "bg-[#dd4b19]/15" : "hover:bg-[var(--bg-hover)]"
        }`}
      >
        <div
          className={`w-[2px] h-14 rounded-full transition-colors ${
            isDragging
              ? "bg-[#dd4b19]"
              : "bg-[var(--border-main)] group-hover:bg-[#dd4b19]"
          }`}
        />
      </div>
    );
  }

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      onPointerDown={handlePointerDown}
      onDoubleClick={onReset}
      title={title || "Потяните для изменения высоты панели (двойной клик — сброс)"}
      className={`h-2.5 w-full flex items-center justify-center cursor-row-resize group select-none transition-colors border-t border-[var(--border-subtle)] ${
        isDragging ? "bg-[#dd4b19]/15" : "hover:bg-[var(--bg-hover)]"
      }`}
    >
      <div
        className={`h-[2px] w-10 rounded-full transition-colors ${
          isDragging
            ? "bg-[#dd4b19]"
            : "bg-[var(--border-main)] group-hover:bg-[#dd4b19]"
        }`}
      />
    </div>
  );
};
