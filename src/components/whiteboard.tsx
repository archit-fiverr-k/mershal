import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Eraser, Undo, Trash2, Cloud, CloudRain } from "lucide-react";
import { cn } from "@/lib/utils";

interface Point {
  x: number; // 0 to 1 percentage of canvas width
  y: number; // 0 to 1 percentage of canvas height
}

interface Stroke {
  tool: "pencil" | "eraser";
  color: string;
  width: number;
  points: Point[];
}

interface WhiteboardProps {
  token?: string;     // If client portal
  clientId?: string;  // If freelancer dashboard
}

const COLORS = [
  { name: "Charcoal", hex: "#1F2937" },
  { name: "Violet", hex: "#8B5CF6" },
  { name: "Emerald", hex: "#10B981" },
  { name: "Amber", hex: "#F59E0B" },
  { name: "Coral", hex: "#F43F5E" },
  { name: "White", hex: "#FFFFFF" },
];

const WIDTHS = [2, 4, 8, 12];

export function Whiteboard({ token, clientId }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Drawing state
  const [tool, setTool] = useState<"pencil" | "eraser">("pencil");
  const [color, setColor] = useState("#8B5CF6");
  const [width, setWidth] = useState(4);

  // Sync status
  const [syncStatus, setSyncStatus] = useState<"synced" | "saving" | "error" | "loading">("loading");

  const syncUrl = token 
    ? `/api/portal/${token}/whiteboard`
    : `/api/clients/${clientId}/whiteboard`;

  // Fetch strokes from server
  const fetchStrokes = async (isInitial = false) => {
    if (isDrawing) return; // Don't interrupt drawing
    try {
      if (isInitial) setSyncStatus("loading");
      const res = await fetch(syncUrl);
      if (!res.ok) throw new Error("Failed to fetch strokes");
      const data = await res.json();
      const serverStrokes = data.strokes || [];
      
      // Only update state if strokes actually changed
      if (JSON.stringify(serverStrokes) !== JSON.stringify(strokes)) {
        setStrokes(serverStrokes);
      }
      setSyncStatus("synced");
    } catch (err) {
      console.error("Error fetching whiteboard:", err);
      setSyncStatus("error");
    }
  };

  // Save strokes to server
  const saveStrokes = async (newStrokes: Stroke[]) => {
    setSyncStatus("saving");
    try {
      const res = await fetch(syncUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strokes: newStrokes }),
      });
      if (!res.ok) throw new Error("Failed to save strokes");
      setSyncStatus("synced");
    } catch (err) {
      console.error("Error saving whiteboard:", err);
      setSyncStatus("error");
    }
  };

  // Initial load
  useEffect(() => {
    fetchStrokes(true);
  }, [syncUrl]);

  // Polling for updates every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStrokes();
    }, 4000);
    return () => clearInterval(interval);
  }, [syncUrl, strokes, isDrawing]);

  // Handle canvas sizing and redraws
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      // Update canvas size to match container layout size
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight || 500;
      
      redraw();
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    
    // Extra timeout to handle tab transitions where clientWidth starts at 0
    const timer = setTimeout(handleResize, 100);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, [strokes, currentStroke]);

  // Redraw helper
  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const drawSingleStroke = (stroke: Stroke) => {
      if (stroke.points.length === 0) return;

      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (stroke.tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
      } else {
        ctx.globalCompositeOperation = "source-over";
      }

      const p0 = stroke.points[0];
      ctx.moveTo(p0.x * w, p0.y * h);

      for (let i = 1; i < stroke.points.length; i++) {
        const p = stroke.points[i];
        ctx.lineTo(p.x * w, p.y * h);
      }
      ctx.stroke();
    };

    // Draw all completed strokes
    strokes.forEach(drawSingleStroke);

    // Draw active drawing stroke
    if (currentStroke) {
      drawSingleStroke(currentStroke);
    }
  };

  // Drawing event handlers
  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const xVal = clientX - rect.left;
    const yVal = clientY - rect.top;

    return {
      x: Math.max(0, Math.min(1, xVal / canvas.width)),
      y: Math.max(0, Math.min(1, yVal / canvas.height)),
    };
  };

  const handleStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getCanvasCoords(e);
    if (!coords) return;

    setIsDrawing(true);
    const newStroke: Stroke = {
      tool,
      color: tool === "eraser" ? "#000000" : color,
      width,
      points: [coords],
    };
    setCurrentStroke(newStroke);
  };

  const handleMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentStroke) return;
    e.preventDefault();
    const coords = getCanvasCoords(e);
    if (!coords) return;

    const updatedStroke = {
      ...currentStroke,
      points: [...currentStroke.points, coords],
    };
    setCurrentStroke(updatedStroke);
  };

  const handleEnd = () => {
    if (!isDrawing || !currentStroke) return;
    setIsDrawing(false);

    // Filter out tiny single tap strokes that might just be accidental clicks (optional, let's keep them if points > 0)
    if (currentStroke.points.length > 0) {
      const updatedStrokes = [...strokes, currentStroke];
      setStrokes(updatedStrokes);
      saveStrokes(updatedStrokes);
    }

    setCurrentStroke(null);
  };

  // Operations
  const handleUndo = () => {
    if (strokes.length === 0) return;
    const updated = strokes.slice(0, -1);
    setStrokes(updated);
    saveStrokes(updated);
  };

  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear the whiteboard?")) {
      setStrokes([]);
      saveStrokes([]);
    }
  };

  const getCursorStyle = () => {
    if (tool === "pencil") {
      return "crosshair";
    }
    // Circular cursor for eraser matching the size
    const cursorSize = Math.max(12, width);
    const radius = cursorSize / 2;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cursorSize + 4}" height="${cursorSize + 4}" viewBox="0 0 ${cursorSize + 4} ${cursorSize + 4}">
      <circle cx="${radius + 2}" cy="${radius + 2}" r="${radius}" stroke="rgba(255, 255, 255, 0.8)" stroke-width="1.5" fill="rgba(239, 68, 68, 0.25)"/>
    </svg>`;
    const encodedSvg = encodeURIComponent(svg);
    return `url("data:image/svg+xml,${encodedSvg}") ${radius + 2} ${radius + 2}, auto`;
  };

  return (
    <div className="flex flex-col h-full min-h-[500px] border border-white/10 rounded-[12px] bg-[#0E0F14] overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b border-white/10 bg-[#161824]/90 backdrop-blur-sm">
        {/* Tool selectors */}
        <div className="flex items-center gap-1 bg-[#0E0F14] p-1 border border-white/5 rounded-[8px]">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setTool("pencil")}
            className={cn(
              "rounded-[6px]",
              tool === "pencil" ? "bg-[#5E6AD2] text-white" : "text-[#8B8FA8]"
            )}
            title="Pencil"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setTool("eraser")}
            className={cn(
              "rounded-[6px]",
              tool === "eraser" ? "bg-[#5E6AD2] text-white" : "text-[#8B8FA8]"
            )}
            title="Eraser"
          >
            <Eraser className="size-4" />
          </Button>
        </div>

        {/* Color Palette */}
        {tool === "pencil" && (
          <div className="flex items-center gap-1.5 px-2">
            {COLORS.map((c) => (
              <button
                key={c.hex}
                onClick={() => setColor(c.hex)}
                className={cn(
                  "size-5 rounded-full border transition-all duration-100 relative cursor-pointer active:scale-90",
                  c.hex === "#FFFFFF" ? "border-white/20" : "border-transparent",
                  color === c.hex ? "ring-2 ring-[#5E6AD2] ring-offset-2 ring-offset-[#161824] scale-110" : ""
                )}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              />
            ))}
          </div>
        )}

        {/* Brush Size */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-[#8B8FA8] font-medium uppercase tracking-wider">Size</span>
          <div className="flex items-center gap-1 bg-[#0E0F14] px-1.5 py-0.5 border border-white/5 rounded-[8px]">
            {WIDTHS.map((w) => (
              <button
                key={w}
                onClick={() => setWidth(w)}
                className={cn(
                  "flex items-center justify-center text-[10px] font-bold rounded-full size-6 cursor-pointer active:scale-95 transition-all",
                  width === w 
                    ? "bg-[#5E6AD2] text-white" 
                    : "text-[#8B8FA8] hover:bg-[#1C1E27] hover:text-[#F0F0F5]"
                )}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={strokes.length === 0}
            className="border-white/10 hover:bg-[#1C1E27]"
            title="Undo"
          >
            <Undo className="size-4 mr-1" />
            Undo
          </Button>
          <Button
            variant="danger-outline"
            size="sm"
            onClick={handleClear}
            disabled={strokes.length === 0}
            title="Clear Board"
          >
            <Trash2 className="size-4 mr-1" />
            Clear
          </Button>
          
          {/* Sync Status Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-[#0E0F14] border border-white/5 text-[11px] font-medium text-[#8B8FA8]">
            {syncStatus === "loading" && (
              <>
                <Cloud className="size-3.5 animate-pulse text-amber-500" />
                <span>Loading...</span>
              </>
            )}
            {syncStatus === "saving" && (
              <>
                <Cloud className="size-3.5 animate-spin text-[#5E6AD2]" />
                <span>Saving...</span>
              </>
            )}
            {syncStatus === "synced" && (
              <>
                <Cloud className="size-3.5 text-emerald-500" />
                <span>Synced</span>
              </>
            )}
            {syncStatus === "error" && (
              <>
                <CloudRain className="size-3.5 text-red-500" />
                <span>Offline</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Drawing Canvas */}
      <div 
        ref={containerRef} 
        className="flex-1 w-full bg-[#12131A] relative touch-none"
        style={{ minHeight: "450px" }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
          style={{ cursor: getCursorStyle() }}
          className="absolute inset-0 block w-full h-full"
        />
      </div>
    </div>
  );
}
