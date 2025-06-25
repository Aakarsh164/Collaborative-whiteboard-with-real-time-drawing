import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Point, DrawingElement, DrawingPath, Shape, TextElement } from '../types/whiteboard';

interface CanvasProps {
  elements: DrawingElement[];
  currentTool: string;
  currentColor: string;
  strokeWidth: number;
  fontSize: number;
  isDrawing: boolean;
  onStartDrawing: (point: Point) => void;
  onContinueDrawing: (point: Point) => void;
  onStopDrawing: () => void;
  onAddText: (point: Point, text: string) => void;
  onCursorMove?: (point: Point) => void;
  className?: string;
}

export const Canvas: React.FC<CanvasProps> = ({
  elements,
  currentTool,
  currentColor,
  strokeWidth,
  fontSize,
  isDrawing,
  onStartDrawing,
  onContinueDrawing,
  onStopDrawing,
  onAddText,
  onCursorMove,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputPosition, setTextInputPosition] = useState<Point>({ x: 0, y: 0 });
  const [textInputValue, setTextInputValue] = useState('');

  const getPointFromEvent = useCallback((event: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0]?.clientX ?? 0 : event.clientX;
    const clientY = 'touches' in event ? event.touches[0]?.clientY ?? 0 : event.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  const drawPath = useCallback((ctx: CanvasRenderingContext2D, path: DrawingPath) => {
    if (path.points.length < 2) return;

    ctx.globalCompositeOperation = path.tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = path.color;
    ctx.lineWidth = path.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(path.points[0].x, path.points[0].y);

    for (let i = 1; i < path.points.length; i++) {
      ctx.lineTo(path.points[i].x, path.points[i].y);
    }

    ctx.stroke();
  }, []);

  const drawShape = useCallback((ctx: CanvasRenderingContext2D, shape: Shape) => {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = shape.color;
    ctx.lineWidth = shape.strokeWidth;

    const width = shape.endPoint.x - shape.startPoint.x;
    const height = shape.endPoint.y - shape.startPoint.y;

    ctx.beginPath();

    if (shape.type === 'rectangle') {
      ctx.rect(shape.startPoint.x, shape.startPoint.y, width, height);
    } else if (shape.type === 'circle') {
      const centerX = shape.startPoint.x + width / 2;
      const centerY = shape.startPoint.y + height / 2;
      const radius = Math.sqrt(width * width + height * height) / 2;
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    }

    if (shape.filled) {
      ctx.fillStyle = shape.color;
      ctx.fill();
    } else {
      ctx.stroke();
    }
  }, []);

  const drawText = useCallback((ctx: CanvasRenderingContext2D, textElement: TextElement) => {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = textElement.color;
    ctx.font = `${textElement.fontSize}px Inter, system-ui, sans-serif`;
    ctx.textBaseline = 'top';
    ctx.fillText(textElement.text, textElement.position.x, textElement.position.y);
  }, []);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    
    const gridSize = 20;
    for (let x = 0; x <= canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    
    for (let y = 0; y <= canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    elements.forEach((element) => {
      if ('points' in element) {
        drawPath(ctx, element as DrawingPath);
      } else if ('startPoint' in element && 'endPoint' in element) {
        drawShape(ctx, element as Shape);
      } else if ('position' in element && 'text' in element) {
        drawText(ctx, element as TextElement);
      }
    });
  }, [elements, drawPath, drawShape, drawText]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      redrawCanvas();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [redrawCanvas]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    const point = getPointFromEvent(event);
    
    if (currentTool === 'text') {
      setTextInputPosition(point);
      setShowTextInput(true);
      setTextInputValue('');
    } else {
      onStartDrawing(point);
    }
  }, [currentTool, getPointFromEvent, onStartDrawing]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    const point = getPointFromEvent(event);
    onCursorMove?.(point);
    
    if (isDrawing) {
      onContinueDrawing(point);
    }
  }, [isDrawing, getPointFromEvent, onContinueDrawing, onCursorMove]);

  const handleMouseUp = useCallback(() => {
    if (isDrawing) {
      onStopDrawing();
    }
  }, [isDrawing, onStopDrawing]);

  const handleTextSubmit = useCallback(() => {
    if (textInputValue.trim()) {
      onAddText(textInputPosition, textInputValue.trim());
    }
    setShowTextInput(false);
    setTextInputValue('');
  }, [textInputValue, textInputPosition, onAddText]);

  const handleTextKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleTextSubmit();
    } else if (event.key === 'Escape') {
      setShowTextInput(false);
      setTextInputValue('');
    }
  }, [handleTextSubmit]);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair bg-white rounded-lg shadow-inner"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: currentTool === 'eraser' ? 'crosshair' : 'crosshair' }}
      />
      
      {showTextInput && (
        <input
          type="text"
          value={textInputValue}
          onChange={(e) => setTextInputValue(e.target.value)}
          onKeyDown={handleTextKeyDown}
          onBlur={handleTextSubmit}
          className="absolute bg-transparent border-2 border-blue-500 outline-none p-1 rounded"
          style={{
            left: textInputPosition.x,
            top: textInputPosition.y,
            fontSize: `${fontSize}px`,
            color: currentColor,
            minWidth: '100px',
          }}
          autoFocus
        />
      )}
    </div>
  );
};
