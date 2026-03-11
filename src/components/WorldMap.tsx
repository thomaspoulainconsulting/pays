import { useRef, useState, useCallback, useEffect } from "react";
import { worldPaths, svgViewBox } from "../data/worldPaths";
import { countries } from "../data/countries";

interface WorldMapProps {
  found: Set<string>;
  selectedCountry: string | null;
  onCountryClick: (iso: string) => void;
  onCountryHover?: (iso: string | null, event?: React.MouseEvent) => void;
  highlightIso: string | null;
}

// Known country ISOs for filtering territories
const countryIsos = new Set(countries.map((c) => c.iso));

export default function WorldMap({
  found,
  selectedCountry,
  onCountryClick,
  onCountryHover,
  highlightIso,
}: WorldMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({
    scale: 1,
    translateX: 0,
    translateY: 0,
  });
  const [flashIso, setFlashIso] = useState<string | null>(null);
  const dragStart = useRef<{
    x: number;
    y: number;
    tx: number;
    ty: number;
  } | null>(null);
  const transformRef = useRef(transform);
  transformRef.current = transform;

  // Flash effect for countries mode
  useEffect(() => {
    if (highlightIso) {
      setFlashIso(highlightIso);
      const timer = setTimeout(() => setFlashIso(null), 1000);
      return () => clearTimeout(timer);
    }
  }, [highlightIso]);

  // Zoom with mouse wheel
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setTransform((prev) => {
        const direction = e.deltaY > 0 ? -1 : 1;
        const factor = 1 + direction * 0.15;
        const newScale = Math.min(8, Math.max(1, prev.scale * factor));

        // Zoom centered on cursor
        const scaleChange = newScale / prev.scale;
        const newTx = mouseX - scaleChange * (mouseX - prev.translateX);
        const newTy = mouseY - scaleChange * (mouseY - prev.translateY);

        return { scale: newScale, translateX: newTx, translateY: newTy };
      });
    },
    []
  );

  // Pan with mouse drag — use ref to avoid stale closure
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        tx: transformRef.current.translateX,
        ty: transformRef.current.translateY,
      };
    },
    []
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setTransform((prev) => ({
      ...prev,
      translateX: dragStart.current!.tx + dx,
      translateY: dragStart.current!.ty + dy,
    }));
  }, []);

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!dragStart.current) return;
      const dx = Math.abs(e.clientX - dragStart.current.x);
      const dy = Math.abs(e.clientY - dragStart.current.y);
      const wasDrag = dx > 5 || dy > 5;
      dragStart.current = null;

      // Clamp pan so at least 20% of map visible
      if (wasDrag) {
        const container = containerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          setTransform((prev) => {
            const mapW = rect.width * prev.scale;
            const mapH = rect.height * prev.scale;
            const minX = -(mapW * 0.8);
            const maxX = rect.width * 0.8;
            const minY = -(mapH * 0.8);
            const maxY = rect.height * 0.8;
            return {
              ...prev,
              translateX: Math.min(maxX, Math.max(minX, prev.translateX)),
              translateY: Math.min(maxY, Math.max(minY, prev.translateY)),
            };
          });
        }
      }
    },
    []
  );

  // Double-click to reset
  const handleDoubleClick = useCallback(() => {
    setTransform({ scale: 1, translateX: 0, translateY: 0 });
  }, []);

  // Attach non-passive wheel handler so preventDefault() works
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handler = (e: WheelEvent) => e.preventDefault();
    container.addEventListener("wheel", handler, { passive: false });
    return () => container.removeEventListener("wheel", handler);
  }, []);

  return (
    <div
      ref={containerRef}
      className="map-container"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
    >
      <svg
        className="world-map"
        viewBox={svgViewBox}
        style={{
          transform: `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scale})`,
          transformOrigin: "0 0",
        }}
      >
        {worldPaths.map((wp) => {
          const isCountry = countryIsos.has(wp.id);
          const isFound = found.has(wp.id);
          const isSelected = selectedCountry === wp.id;
          const isFlash = flashIso === wp.id;

          const className = isCountry
            ? `country-path${isFound ? " found" : ""}${isSelected ? " selected" : ""}${isFlash ? " flash" : ""}`
            : "territory-path";

          return (
            <g key={wp.id}>
              {wp.paths.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  className={className}
                  onClick={
                    isCountry && !isFound
                      ? (e) => {
                          e.stopPropagation();
                          onCountryClick(wp.id);
                        }
                      : undefined
                  }
                  onMouseEnter={
                    isCountry
                      ? (e) => onCountryHover?.(wp.id, e)
                      : undefined
                  }
                  onMouseMove={
                    isCountry
                      ? (e) => onCountryHover?.(wp.id, e)
                      : undefined
                  }
                  onMouseLeave={
                    isCountry ? () => onCountryHover?.(null) : undefined
                  }
                />
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
