import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import { RoomManager } from './components/RoomManager';
import { ExportModal } from './components/ExportModal';
import { CursorOverlay } from './components/CursorOverlay';
import { useCollaborativeWhiteboard } from './hooks/useCollaborativeWhiteboard';
import { exportWholeCanvas } from './utils/export';
import { Room } from './types/whiteboard';

function App() {
  const whiteboard = useCollaborativeWhiteboard();
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [showRoomManager, setShowRoomManager] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);

  const handleCreateRoom = useCallback(async (roomData: Omit<Room, 'id' | 'createdAt' | 'users'>) => {
    try {
      const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      const apiUrl = isProduction 
        ? 'https://collaborative-whiteboard-with-real-time-8zp4.onrender.com/api/rooms'
        : 'http://localhost:3001/api/rooms';
        
      console.log('Creating room via:', apiUrl);
      console.log('Room data:', roomData);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(roomData),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      const result = await response.json();
      console.log('Response data:', result);
      
      if (!result.success) {
        console.error('API Error:', result.error);
        alert('Failed to create room: ' + result.error);
        return;
      }

      const room = result.room;
      const userName = 'User ' + Math.floor(Math.random() * 1000);
      const joinResult = await whiteboard.socket.joinRoom(room.id, userName, roomData.password);
      if (!joinResult.success) {
        alert('Failed to join room: ' + joinResult.error);
        return;
      }

      setCurrentRoom(joinResult.room!);
      setCurrentUser(joinResult.user!);
      setShowRoomManager(false);
      if (joinResult.elements) {
        whiteboard.loadElements(joinResult.elements);
      }
      window.history.pushState({}, '', `?room=${room.id}`);
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Failed to create room');
    }
  }, [whiteboard]);

  const handleJoinRoom = useCallback(async (roomId: string, password?: string) => {
    try {
      console.log('Attempting to join room:', roomId);
      const userName = 'User ' + Math.floor(Math.random() * 1000);
      const joinResult = await whiteboard.socket.joinRoom(roomId, userName, password);
      console.log('Join room result:', joinResult);
      
      if (!joinResult.success) {
        console.error('Failed to join room:', joinResult.error);
        alert('Failed to join room: ' + joinResult.error);
        return;
      }

      console.log('Successfully joined room:', joinResult.room);
      setCurrentRoom(joinResult.room!);
      setCurrentUser(joinResult.user!);
      setShowRoomManager(false);
      if (joinResult.elements) {
        console.log('Loading existing elements:', joinResult.elements.length);
        whiteboard.loadElements(joinResult.elements);
      }
      window.history.pushState({}, '', `?room=${roomId}`);
    } catch (error) {
      console.error('Error joining room:', error);
      alert('Failed to join room: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }, [whiteboard]);

  const handleExport = useCallback(async (format: 'png' | 'pdf', quality: number = 1.0) => {
    if (canvasContainerRef.current) {
      await exportWholeCanvas(canvasContainerRef.current, format, quality);
    }
  }, []);

  const handleCursorMove = useCallback((point: { x: number; y: number }) => {
    if (currentRoom) {
      whiteboard.socket.emitCursorMove(point);
    }
  }, [currentRoom, whiteboard.socket]);

  // Check for room ID in URL on load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room');
    
    if (roomId && !currentRoom) {
      console.log('Found room ID in URL:', roomId);
      
      // Wait for socket to be connected before joining
      if (whiteboard.socket.connected) {
        console.log('Socket connected, joining room...');
        handleJoinRoom(roomId);
      } else {
        console.log('Socket not connected yet, waiting...');
        // Wait for socket connection
        const checkConnection = () => {
          if (whiteboard.socket.connected) {
            console.log('Socket now connected, joining room...');
            handleJoinRoom(roomId);
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      }
    }
  }, [currentRoom, handleJoinRoom, whiteboard.socket.connected]);

  // Show room manager if not connected
  useEffect(() => {
    if (!currentRoom && !showRoomManager) {
      setShowRoomManager(true);
    }
  }, [currentRoom, showRoomManager]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              CollabBoard
            </h1>
            {currentRoom && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className={`w-2 h-2 rounded-full ${whiteboard.socket.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span>{currentRoom.name}</span>
                <span className="text-gray-400">•</span>
                <span>{whiteboard.socket.users.length} user{whiteboard.socket.users.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
          
          {!currentRoom && (
            <button
              onClick={() => setShowRoomManager(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Start Collaborating
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="relative">
        {/* Toolbar */}
        <Toolbar
          currentTool={whiteboard.state.currentTool}
          currentColor={whiteboard.state.currentColor}
          strokeWidth={whiteboard.state.strokeWidth}
          fontSize={whiteboard.state.fontSize}
          onToolChange={whiteboard.setTool}
          onColorChange={whiteboard.setColor}
          onStrokeWidthChange={whiteboard.setStrokeWidth}
          onFontSizeChange={whiteboard.setFontSize}
          onUndo={whiteboard.undo}
          onRedo={whiteboard.redo}
          onClear={whiteboard.clearCanvas}
          onExport={() => setShowExportModal(true)}
          onShowRoomManager={() => setShowRoomManager(true)}
          canUndo={whiteboard.canUndo}
          canRedo={whiteboard.canRedo}
        />

        {/* Canvas */}
        <div 
          ref={canvasContainerRef}
          className="h-[calc(100vh-5rem)] p-6 relative"
        >
          <Canvas
            elements={whiteboard.state.elements}
            currentTool={whiteboard.state.currentTool}
            currentColor={whiteboard.state.currentColor}
            strokeWidth={whiteboard.state.strokeWidth}
            fontSize={whiteboard.state.fontSize}
            isDrawing={whiteboard.state.isDrawing}
            onStartDrawing={whiteboard.startDrawing}
            onContinueDrawing={whiteboard.continueDrawing}
            onStopDrawing={whiteboard.stopDrawing}
            onAddText={whiteboard.addText}
            onCursorMove={handleCursorMove}
            className="w-full h-full"
          />
          
          {/* Cursor Overlay */}
          <CursorOverlay 
            cursors={whiteboard.socket.cursors}
            users={whiteboard.socket.users.filter(u => u.id !== currentUser?.id)}
          />
        </div>

        {/* Modals */}
        <RoomManager
          isOpen={showRoomManager}
          onClose={() => setShowRoomManager(false)}
          currentRoom={currentRoom}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
        />

        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          onExport={handleExport}
        />
      </main>
    </div>
  );
}

export default App;
