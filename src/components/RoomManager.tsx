import React, { useState } from 'react';
import { X, Users, Lock, Globe, Copy, Check } from 'lucide-react';
import { Room, User } from '../types/whiteboard';

interface RoomManagerProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoom: Room | null;
  onCreateRoom: (room: Omit<Room, 'id' | 'createdAt' | 'users'>) => void;
  onJoinRoom: (roomId: string, password?: string) => void;
}

export const RoomManager: React.FC<RoomManagerProps> = ({
  isOpen,
  onClose,
  currentRoom,
  onCreateRoom,
  onJoinRoom,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [roomName, setRoomName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [permissions, setPermissions] = useState<'edit' | 'view'>('edit');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCreateRoom = () => {
    if (!roomName.trim()) return;

    onCreateRoom({
      name: roomName.trim(),
      isPrivate,
      password: isPrivate ? password : undefined,
      permissions,
    });
    setRoomName('');
    setPassword('');
    setIsPrivate(false);
    setPermissions('edit');
  };

  const handleJoinRoom = () => {
    if (!joinRoomId.trim()) return;
    onJoinRoom(joinRoomId.trim(), joinPassword || undefined);
  };

  const copyRoomLink = async () => {
    if (!currentRoom) return;
    
    const roomLink = `${window.location.origin}?room=${currentRoom.id}`;
    await navigator.clipboard.writeText(roomLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Users size={24} />
              <h2 className="text-xl font-bold">Room Manager</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Current Room Info */}
        {currentRoom && (
          <div className="p-6 bg-gray-50 border-b">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                {currentRoom.isPrivate ? (
                  <Lock size={16} className="text-red-500" />
                ) : (
                  <Globe size={16} className="text-green-500" />
                )}
                <span className="font-semibold">{currentRoom.name}</span>
              </div>
              <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded">
                {currentRoom.permissions}
              </span>
            </div>
            <button
              onClick={copyRoomLink}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span className="text-sm">
                {copied ? 'Copied!' : 'Copy room link'}
              </span>
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'create'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Create Room
          </button>
          <button
            onClick={() => setActiveTab('join')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'join'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Join Room
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'create' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room Name
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Enter room name"
                />
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="private"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="private" className="text-sm font-medium text-gray-700">
                  Private room (requires password)
                </label>
              </div>

              {isPrivate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Enter password"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Permissions
                </label>
                <select
                  value={permissions}
                  onChange={(e) => setPermissions(e.target.value as 'edit' | 'view')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="edit">Edit - Can draw and modify</option>
                  <option value="view">View - Read-only access</option>
                </select>
              </div>

              <button
                onClick={handleCreateRoom}
                disabled={!roomName.trim()}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Create Room
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room ID or Link
                </label>
                <input
                  type="text"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Enter room ID or paste room link"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password (if required)
                </label>
                <input
                  type="password"
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Enter password"
                />
              </div>

              <button
                onClick={handleJoinRoom}
                disabled={!joinRoomId.trim()}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Join Room
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
