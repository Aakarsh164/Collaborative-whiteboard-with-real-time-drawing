import { useState, useCallback, useRef, useEffect } from 'react';
import { WhiteboardState, DrawingElement, Tool, Point, DrawingPath, Shape, TextElement } from '../types/whiteboard';
import { useSocket } from './useSocket';

const initialState: WhiteboardState = {
  elements: [],
  currentTool: 'pen',
  currentColor: '#3B82F6',
  strokeWidth: 2,
  fontSize: 16,
  isDrawing: false,
  selectedElement: null,
};

export const useCollaborativeWhiteboard = () => {
  const [state, setState] = useState<WhiteboardState>(initialState);
  const [history, setHistory] = useState<DrawingElement[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const currentPath = useRef<DrawingPath | null>(null);
  const currentShape = useRef<Shape | null>(null);
  const socket = useSocket();
  useEffect(() => {
    const unsubscribeDrawingStart = socket.onDrawingStart(({ element }) => {
      setState(prev => ({
        ...prev,
        elements: [...prev.elements, element]
      }));
    });

    const unsubscribeDrawingUpdate = socket.onDrawingUpdate(({ element }) => {
      setState(prev => ({
        ...prev,
        elements: prev.elements.map(el => el.id === element.id ? element : el)
      }));
    });

    const unsubscribeDrawingEnd = socket.onDrawingEnd(({ element }) => {
      setState(prev => ({
        ...prev,
        elements: prev.elements.map(el => el.id === element.id ? element : el)
      }));
    });

    const unsubscribeTextAdded = socket.onTextAdded(({ element }) => {
      setState(prev => ({
        ...prev,
        elements: [...prev.elements, element]
      }));
    });

    const unsubscribeCanvasCleared = socket.onCanvasCleared(() => {
      setState(prev => ({ ...prev, elements: [] }));
    });

    return () => {
      unsubscribeDrawingStart();
      unsubscribeDrawingUpdate();
      unsubscribeDrawingEnd();
      unsubscribeTextAdded();
      unsubscribeCanvasCleared();
    };
  }, [socket]);

  const saveToHistory = useCallback((elements: DrawingElement[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...elements]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const setTool = useCallback((tool: Tool) => {
    setState(prev => ({ ...prev, currentTool: tool, selectedElement: null }));
  }, []);

  const setColor = useCallback((color: string) => {
    setState(prev => ({ ...prev, currentColor: color }));
  }, []);

  const setStrokeWidth = useCallback((width: number) => {
    setState(prev => ({ ...prev, strokeWidth: width }));
  }, []);

  const setFontSize = useCallback((size: number) => {
    setState(prev => ({ ...prev, fontSize: size }));
  }, []);

  const startDrawing = useCallback((point: Point) => {
    setState(prev => ({ ...prev, isDrawing: true }));

    if (state.currentTool === 'pen' || state.currentTool === 'eraser') {
      currentPath.current = {
        id: `path-${Date.now()}-${Math.random()}`,
        tool: state.currentTool,
        points: [point],
        color: state.currentTool === 'eraser' ? '#FFFFFF' : state.currentColor,
        strokeWidth: state.strokeWidth,
        timestamp: Date.now(),
      };
      socket.emitDrawingStart(currentPath.current);
    } else if (state.currentTool === 'rectangle' || state.currentTool === 'circle') {
      currentShape.current = {
        id: `shape-${Date.now()}-${Math.random()}`,
        type: state.currentTool,
        startPoint: point,
        endPoint: point,
        color: state.currentColor,
        strokeWidth: state.strokeWidth,
        filled: false,
        timestamp: Date.now(),
      };
      socket.emitDrawingStart(currentShape.current);
    }
  }, [state.currentTool, state.currentColor, state.strokeWidth, socket]);

  const continueDrawing = useCallback((point: Point) => {
    if (!state.isDrawing) return;

    if (state.currentTool === 'pen' || state.currentTool === 'eraser') {
      const elementToModify = currentPath.current;
      if (!elementToModify) return;
      
      elementToModify.points.push(point);
      setState(prev => ({
        ...prev,
        elements: [
          ...prev.elements.filter(el => el.id !== elementToModify.id),
          elementToModify
        ]
      }));
      socket.emitDrawingUpdate(elementToModify);
    } else if (state.currentTool === 'rectangle' || state.currentTool === 'circle') {
      const elementToModify = currentShape.current;
      if (!elementToModify) return;
      
      elementToModify.endPoint = point;
      setState(prev => ({
        ...prev,
        elements: [
          ...prev.elements.filter(el => el.id !== elementToModify.id),
          elementToModify
        ]
      }));
      socket.emitDrawingUpdate(elementToModify);
    }
  }, [state.isDrawing, state.currentTool, socket]);

  const stopDrawing = useCallback(() => {
    if (state.isDrawing) {
      setState(prev => ({ ...prev, isDrawing: false }));
      if (currentPath.current) {
        socket.emitDrawingEnd(currentPath.current);
      } else if (currentShape.current) {
        socket.emitDrawingEnd(currentShape.current);
      }
      
      saveToHistory(state.elements);
      currentPath.current = null;
      currentShape.current = null;
    }
  }, [state.isDrawing, state.elements, saveToHistory, socket]);

  const addText = useCallback((point: Point, text: string) => {
    const textElement: TextElement = {
      id: `text-${Date.now()}-${Math.random()}`,
      position: point,
      text,
      color: state.currentColor,
      fontSize: state.fontSize,
      timestamp: Date.now(),
    };

    const newElements = [...state.elements, textElement];
    setState(prev => ({ ...prev, elements: newElements }));
    saveToHistory(newElements);
    socket.emitTextAdded(textElement);
  }, [state.elements, state.currentColor, state.fontSize, saveToHistory, socket]);

  const deleteElement = useCallback((elementId: string) => {
    const newElements = state.elements.filter(el => el.id !== elementId);
    setState(prev => ({ ...prev, elements: newElements, selectedElement: null }));
    saveToHistory(newElements);
  }, [state.elements, saveToHistory]);

  const clearCanvas = useCallback(() => {
    setState(prev => ({ ...prev, elements: [], selectedElement: null }));
    saveToHistory([]);
    socket.emitClearCanvas();
  }, [saveToHistory, socket]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setState(prev => ({ ...prev, elements: history[newIndex], selectedElement: null }));
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setState(prev => ({ ...prev, elements: history[newIndex], selectedElement: null }));
    }
  }, [historyIndex, history]);

  const loadElements = useCallback((elements: DrawingElement[]) => {
    setState(prev => ({ ...prev, elements }));
    setHistory([elements]);
    setHistoryIndex(0);
  }, []);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return {
    state,
    socket,
    setTool,
    setColor,
    setStrokeWidth,
    setFontSize,
    startDrawing,
    continueDrawing,
    stopDrawing,
    addText,
    deleteElement,
    clearCanvas,
    undo,
    redo,
    loadElements,
    canUndo,
    canRedo,
  };
};
