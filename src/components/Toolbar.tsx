import React from 'react';
import { 
  Pen, 
  Eraser, 
  Square, 
  Circle, 
  Type, 
  Palette,
  Undo2,
  Redo2,
  Trash2,
  Download,
  Users,
  Settings
} from 'lucide-react';
import { Tool } from '../types/whiteboard';

interface ToolbarProps {
  currentTool: Tool;
  currentColor: string;
  strokeWidth: number;
  fontSize: number;
  onToolChange: (tool: Tool) => void;
  onColorChange: (color: string) => void;
  onStrokeWidthChange: (width: number) => void;
  onFontSizeChange: (size: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onExport: () => void;
  onShowRoomManager: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const tools: { id: Tool; icon: React.ComponentType; label: string }[] = [
  { id: 'pen', icon: Pen, label: 'Pen' },
  { id: 'eraser', icon: Eraser, label: 'Eraser' },
  { id: 'rectangle', icon: Square, label: 'Rectangle' },
  { id: 'circle', icon: Circle, label: 'Circle' },
  { id: 'text', icon: Type, label: 'Text' },
];

const colors = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444',
  '#6B7280', '#1F2937', '#FFFFFF', '#FEE2E2', '#F3E8FF'
];

const strokeWidths = [1, 2, 4, 6, 8, 12];
const fontSizes = [12, 16, 20, 24, 32, 48];

export const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  currentColor,
  strokeWidth,
  fontSize,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  onFontSizeChange,
  onUndo,
  onRedo,
  onClear,
  onExport,
  onShowRoomManager,
  canUndo,
  canRedo,
}) => {
  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-4">
        <div className="flex items-center space-x-6">
          {/* Drawing Tools */}
          <div className="flex items-center space-x-2">
            {tools.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => onToolChange(id)}
                className={`p-3 rounded-xl transition-all duration-200 hover:scale-105 ${
                  currentTool === id
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={label}
              >
                <Icon size={20} />
              </button>
            ))}
          </div>

          <div className="w-px h-8 bg-gray-300" />

          {/* Color Picker */}
          <div className="flex items-center space-x-2">
            <Palette size={20} className="text-gray-600" />
            <div className="flex space-x-1">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => onColorChange(color)}
                  className={`w-8 h-8 rounded-lg border-2 transition-all duration-200 hover:scale-110 ${
                    currentColor === color
                      ? 'border-gray-800 shadow-lg'
                      : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                  title={`Color: ${color}`}
                />
              ))}
            </div>
          </div>

          <div className="w-px h-8 bg-gray-300" />

          {/* Stroke Width */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 font-medium">Size:</span>
            <select
              value={currentTool === 'text' ? fontSize : strokeWidth}
              onChange={(e) => 
                currentTool === 'text'
                  ? onFontSizeChange(Number(e.target.value))
                  : onStrokeWidthChange(Number(e.target.value))
              }
              className="bg-gray-100 rounded-lg px-3 py-2 text-sm border-none outline-none focus:bg-gray-200 transition-colors"
            >
              {(currentTool === 'text' ? fontSizes : strokeWidths).map((size) => (
                <option key={size} value={size}>
                  {size}{currentTool === 'text' ? 'px' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="w-px h-8 bg-gray-300" />

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={`p-3 rounded-xl transition-all duration-200 ${
                canUndo
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-105'
                  : 'bg-gray-50 text-gray-300 cursor-not-allowed'
              }`}
              title="Undo"
            >
              <Undo2 size={20} />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className={`p-3 rounded-xl transition-all duration-200 ${
                canRedo
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-105'
                  : 'bg-gray-50 text-gray-300 cursor-not-allowed'
              }`}
              title="Redo"
            >
              <Redo2 size={20} />
            </button>
            <button
              onClick={onClear}
              className="p-3 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 hover:scale-105 transition-all duration-200"
              title="Clear Canvas"
            >
              <Trash2 size={20} />
            </button>
            <button
              onClick={onExport}
              className="p-3 rounded-xl bg-green-100 text-green-600 hover:bg-green-200 hover:scale-105 transition-all duration-200"
              title="Export"
            >
              <Download size={20} />
            </button>
            <button
              onClick={onShowRoomManager}
              className="p-3 rounded-xl bg-purple-100 text-purple-600 hover:bg-purple-200 hover:scale-105 transition-all duration-200"
              title="Room Settings"
            >
              <Users size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};