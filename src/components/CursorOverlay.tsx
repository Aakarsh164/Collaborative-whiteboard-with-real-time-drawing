import React from 'react';
import { Point, User } from '../types/whiteboard';

interface CursorOverlayProps {
  cursors: Map<string, Point>;
  users: User[];
}

export const CursorOverlay: React.FC<CursorOverlayProps> = ({ cursors, users }) => {
  const getUserById = (userId: string) => users.find(u => u.id === userId);

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {Array.from(cursors.entries()).map(([userId, position]) => {
        const user = getUserById(userId);
        if (!user) return null;

        return (
          <div
            key={userId}
            className="absolute transform -translate-x-1 -translate-y-1"
            style={{
              left: position.x,
              top: position.y,
            }}
          >
            {/* Cursor */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              className="drop-shadow-lg"
            >
              <path
                d="M0 0L0 16L5 12L8 16L12 14L8 10L16 10L0 0Z"
                fill={user.color}
                stroke="white"
                strokeWidth="1"
              />
            </svg>
            
            {/* User name */}
            <div
              className="absolute top-5 left-2 px-2 py-1 rounded text-xs text-white font-medium whitespace-nowrap"
              style={{ backgroundColor: user.color }}
            >
              {user.name}
            </div>
          </div>
        );
      })}
    </div>
  );
};