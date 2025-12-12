// Physics
export const GRAVITY = 0.8;
export const JUMP_FORCE = 18;
export const LANE_SPEED = 0.2; // Faster lane switching for high speed
export const GAME_SPEED_START = 20; // Start slightly faster
export const GAME_SPEED_MAX = 60; // Higher max speed
export const SPAWN_RATE_START = 50; 

// Dimensions
export const TRACK_WIDTH = 500; // Wider track for better 3D look
export const HORIZON_Y = 250; 
export const CANVAS_WIDTH = window.innerWidth;
export const CANVAS_HEIGHT = window.innerHeight;

// Visuals
export const COLORS = {
  sky: ['#020617', '#1e1b4b'], // Darker, more contrast
  ground: '#0f172a',
  grid: 'rgba(236, 72, 153, 0.3)', // Pink synthwave grid
  track: '#334155',
  train: '#dc2626',
  trainSide: '#991b1b', // Darker red
  trainTop: '#ef4444', // Lighter red
  trainWindow: '#fca5a5',
  barrier: '#fb923c',
  barrierSide: '#c2410c',
  barrierTop: '#fdba74',
  coin: '#facc15',
  player: '#22d3ee',
  playerShadow: 'rgba(0,0,0,0.6)'
};