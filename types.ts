export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER'
}

export enum Lane {
  LEFT = -1,
  CENTER = 0,
  RIGHT = 1
}

export enum ObstacleType {
  TRAIN = 'TRAIN',
  BARRIER_LOW = 'BARRIER_LOW',
  BARRIER_HIGH = 'BARRIER_HIGH'
}

export interface Player {
  lane: number; // -1 to 1 floating point for smooth transition
  targetLane: Lane;
  y: number; // Vertical position (jump)
  dy: number; // Vertical velocity
  isJumping: boolean;
  isRolling: boolean;
  rollTimer: number;
}

export interface GameObject {
  id: number;
  lane: Lane;
  z: number; // Depth into screen
  type: ObstacleType | 'COIN';
  active: boolean;
}

export interface Mission {
  id: string;
  description: string;
  completed: boolean;
}

export interface GameStats {
  score: number;
  coins: number;
  distance: number;
  highScore: number;
}