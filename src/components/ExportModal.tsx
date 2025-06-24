import React, { useState } from 'react';
import { X, Download, FileImage, FileText } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'png' | 'pdf', quality?: number) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onExport,
}) => {
  const [format, setFormat] = useState<'png' | 'pdf'>('png');
  const [quality, setQuality] = useState(1.0);

  const handleExport = () => {
    onExport(format, quality);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-blue-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Download size={24} />
              <h2 className="text-xl font-bold">Export Whiteboard</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Export Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFormat('png')}
                className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                  format === 'png'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileImage size={24} className="mx-auto mb-2" />
                <div className="text-sm font-medium">PNG Image</div>
                <div className="text-xs text-gray-500 mt-1">
                  High quality raster image
                </div>
              </button>
              <button
                onClick={() => setFormat('pdf')}
                className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                  format === 'pdf'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileText size={24} className="mx-auto mb-2" />
                <div className="text-sm font-medium">PDF Document</div>
                <div className="text-xs text-gray-500 mt-1">
                  Scalable document format
                </div>
              </button>
            </div>
          </div>

          {/* Quality Setting for PNG */}
          {format === 'png' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Image Quality: {Math.round(quality * 100)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Lower size</span>
                <span>Higher quality</span>
              </div>
            </div>
          )}

          {/* Export Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Export Details</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Exports the entire canvas content</li>
              <li>• Maintains original drawing quality</li>
              <li>• {format === 'png' ? 'Transparent background supported' : 'Optimized for printing'}</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Export {format.toUpperCase()}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};