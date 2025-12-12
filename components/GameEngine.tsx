import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, Lane, Player, GameObject, ObstacleType, GameStats } from '../types';
import { COLORS, GRAVITY, JUMP_FORCE, LANE_SPEED, GAME_SPEED_START, GAME_SPEED_MAX, TRACK_WIDTH, HORIZON_Y } from '../constants';

interface GameEngineProps {
  gameState: GameState;
  onGameOver: (stats: GameStats) => void;
  onCoinsUpdate: (coins: number) => void;
  onScoreUpdate: (score: number) => void;
}

export const GameEngine: React.FC<GameEngineProps> = ({ 
  gameState, 
  onGameOver, 
  onCoinsUpdate, 
  onScoreUpdate 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  const playerRef = useRef<Player>({
    lane: 0,
    targetLane: Lane.CENTER,
    y: 0,
    dy: 0,
    isJumping: false,
    isRolling: false,
    rollTimer: 0
  });

  const objectsRef = useRef<GameObject[]>([]);
  const speedRef = useRef(GAME_SPEED_START);
  const scoreRef = useRef(0);
  const coinsRef = useRef(0);
  const distanceRef = useRef(0);
  const frameCountRef = useRef(0);

  // --- 3D MATH HELPERS ---

  // Project a point in 3D world space (x, y, z) to 2D screen space (x, y, scale)
  // World Origin (0,0,0) is roughly where the player stands on the ground.
  // +Y is UP (unlike canvas where +Y is down).
  // +Z is INTO the screen.
  const project3D = (x: number, y: number, z: number, width: number, height: number) => {
    const cameraHeight = 400; // Camera is above the player
    const cameraZ = -1000;    // Camera is behind the screen plane
    const perspective = 800;  // Field of view strength
    
    // Relative Z from camera
    const relZ = z - cameraZ;
    
    if (relZ <= 0) return { x: 0, y: 0, scale: 0, visible: false };

    const scale = perspective / relZ;
    
    // X Projection
    const projectedX = width / 2 + x * scale;
    
    // Y Projection (Invert world Y because canvas Y is down)
    // We offset by HorizonY to simulate looking slightly down/forward
    // Base floor at scale 1 is near bottom. 
    // Let's use a simpler approach aligned with the Horizon constant.
    
    // When z = infinity, y = HORIZON_Y.
    // When z = 0, y = near bottom.
    
    const projectedY = HORIZON_Y + (cameraHeight - y) * scale;

    return { x: projectedX, y: projectedY, scale, visible: true };
  };

  const getLaneX = (lane: number) => {
    return lane * (TRACK_WIDTH / 2); // Spread lanes
  };

  // --- SPAWN LOGIC ---

  const spawnObject = () => {
    const lanes = [Lane.LEFT, Lane.CENTER, Lane.RIGHT];
    const lane = lanes[Math.floor(Math.random() * lanes.length)];
    
    const r = Math.random();
    let type: ObstacleType | 'COIN' = 'COIN';
    
    // Adjusted probabilities for more gameplay variety
    if (r > 0.3) { // 70% chance of obstacle
      const obsR = Math.random();
      if (obsR < 0.4) type = ObstacleType.TRAIN; // 40% chance train
      else if (obsR < 0.7) type = ObstacleType.BARRIER_LOW;
      else type = ObstacleType.BARRIER_HIGH;
    }
    
    // Avoid overlapping spawns
    const tooClose = objectsRef.current.some(o => 
      o.lane === lane && o.z > 2500 && o.type !== 'COIN'
    );
    
    if (!tooClose) {
      if (type === 'COIN') {
        // Spawn a line of coins
        for(let i=0; i<5; i++) {
            objectsRef.current.push({
                id: Date.now() + Math.random(),
                lane,
                z: 3000 + (i * 150),
                type: 'COIN',
                active: true
            });
        }
      } else {
        // Spawn Obstacle
        objectsRef.current.push({
            id: Date.now() + Math.random(),
            lane,
            z: 3000, // Spawn further out
            type,
            active: true
        });
      }
    }
  };

  // --- UPDATE LOOP ---

  const update = () => {
    if (gameState !== GameState.PLAYING) return;
    
    const player = playerRef.current;
    
    // Accelerate faster over time
    speedRef.current = Math.min(GAME_SPEED_MAX, speedRef.current + 0.015);
    
    distanceRef.current += (speedRef.current / 10);
    scoreRef.current += Math.floor(speedRef.current / 10);
    onScoreUpdate(scoreRef.current);

    // Spawn Logic
    frameCountRef.current++;
    // Spawn rate decreases as speed increases (objects appear faster)
    const spawnRate = Math.max(15, 60 - Math.floor(speedRef.current * 0.8));
    if (frameCountRef.current % spawnRate === 0) {
      spawnObject();
    }

    // Player Physics
    player.lane += (player.targetLane - player.lane) * LANE_SPEED;
    
    player.y += player.dy;
    if (player.y > 0) {
      player.dy -= GRAVITY;
    } else {
      player.y = 0;
      player.dy = 0;
      player.isJumping = false;
    }
    
    if (player.isRolling) {
      player.rollTimer--;
      if (player.rollTimer <= 0) player.isRolling = false;
    }

    // Object Movement & Collision
    const activeObjects: GameObject[] = [];
    
    for (const obj of objectsRef.current) {
      obj.z -= speedRef.current;
      
      // Collision Detection
      // Player Z is considered 0.
      // Objects have depth.
      // Train depth ~600, Barrier depth ~50.
      
      let objDepth = 50;
      let objWidth = 100;
      let objHeight = 100;

      if (obj.type === ObstacleType.TRAIN) {
        objDepth = 600;
        objHeight = 150;
      }
      
      // Check Z overlap
      // Object front is at obj.z
      // Object back is at obj.z + objDepth
      // Player is at 0, roughly 50 deep (-25 to +25)
      
      const playerZMin = -50;
      const playerZMax = 50;
      const objZMin = obj.z;
      const objZMax = obj.z + objDepth;
      
      const zOverlap = (playerZMin < objZMax && playerZMax > objZMin);

      if (obj.active && zOverlap) {
        // Lane check (allowing some tolerance)
        if (Math.abs(player.lane - obj.lane) < 0.6) {
            
            if (obj.type === 'COIN') {
                obj.active = false;
                coinsRef.current += 1;
                onCoinsUpdate(coinsRef.current);
            } else {
                // Obstacle Hit
                let hit = false;
                
                if (obj.type === ObstacleType.TRAIN) {
                    if (player.y < 150) hit = true; 
                } else if (obj.type === ObstacleType.BARRIER_LOW) {
                    if (player.y < 60) hit = true;
                } else if (obj.type === ObstacleType.BARRIER_HIGH) {
                    if (!player.isRolling) hit = true;
                }
                
                if (hit) {
                    onGameOver({
                        score: scoreRef.current,
                        coins: coinsRef.current,
                        distance: Math.floor(distanceRef.current),
                        highScore: 0 
                    });
                    return; 
                }
            }
        }
      }
      
      // Cleanup far behind objects
      if (obj.z + objDepth > -500) {
        activeObjects.push(obj);
      }
    }
    objectsRef.current = activeObjects;
  };

  // --- DRAWING ---

  const drawCube = (ctx: CanvasRenderingContext2D, x: number, y: number, z: number, w: number, h: number, d: number, colors: { front: string, top: string, side: string }) => {
    const { width, height } = ctx.canvas;
    
    // Vertices
    // Front face: z
    // Back face: z + d
    
    // Front Top Left
    const ftl = project3D(x - w/2, y + h, z, width, height);
    // Front Top Right
    const ftr = project3D(x + w/2, y + h, z, width, height);
    // Front Bottom Right
    const fbr = project3D(x + w/2, y, z, width, height);
    // Front Bottom Left
    const fbl = project3D(x - w/2, y, z, width, height);
    
    // Back Top Left
    const btl = project3D(x - w/2, y + h, z + d, width, height);
    // Back Top Right
    const btr = project3D(x + w/2, y + h, z + d, width, height);
    
    if (!ftl.visible || !fbr.visible) return;

    // Draw Back/Side faces first (Painter's algorithm mainly handled by object sorting, 
    // but within cube we draw hidden faces first if we were transparent. Opaque -> just draw visible ones)

    // TOP Face
    ctx.fillStyle = colors.top;
    ctx.beginPath();
    ctx.moveTo(ftl.x, ftl.y);
    ctx.lineTo(ftr.x, ftr.y);
    ctx.lineTo(btr.x, btr.y);
    ctx.lineTo(btl.x, btl.y);
    ctx.closePath();
    ctx.fill();

    // SIDE Face (visible if not center lane usually, simplified light source)
    // If x < 0 (left lane), show right side. If x > 0 (right lane), show left side?
    // Actually just draw the side connecting to the center of screen.
    
    ctx.fillStyle = colors.side;
    ctx.beginPath();
    if (x < 0) {
       // Left object, show right side
       ctx.moveTo(ftr.x, ftr.y); // Front Top Right
       ctx.lineTo(btr.x, btr.y); // Back Top Right
       // Back Bottom Right (calc needed if full solid, but usually hidden by ground or perspective)
       const bbr = project3D(x + w/2, y, z + d, width, height);
       ctx.lineTo(bbr.x, bbr.y);
       ctx.lineTo(fbr.x, fbr.y);
    } else {
       // Right/Center object, show left side (or mostly front for center)
       // Let's just draw the outer side for effect
       ctx.moveTo(ftl.x, ftl.y);
       ctx.lineTo(btl.x, btl.y);
       const bbl = project3D(x - w/2, y, z + d, width, height);
       ctx.lineTo(bbl.x, bbl.y);
       ctx.lineTo(fbl.x, fbl.y);
    }
    ctx.closePath();
    ctx.fill();

    // FRONT Face (Always last)
    ctx.fillStyle = colors.front;
    ctx.fillRect(ftl.x, ftl.y, ftr.x - ftl.x, fbl.y - ftl.y);
    
    // Border/Detail for pop
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 1;
    ctx.strokeRect(ftl.x, ftl.y, ftr.x - ftl.x, fbl.y - ftl.y);
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    const { width, height } = ctx.canvas;
    
    // 1. Sky with Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, COLORS.sky[0]);
    gradient.addColorStop(1, COLORS.sky[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Sun/Moon
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#f472b6";
    ctx.fillStyle = "#fbcfe8";
    ctx.beginPath();
    ctx.arc(width/2, HORIZON_Y - 80, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 2. 3D Grid Floor
    ctx.fillStyle = COLORS.ground;
    ctx.fillRect(0, HORIZON_Y, width, height - HORIZON_Y);
    
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    // Vertical Grid Lines (converging to center)
    for(let i = -5; i <= 5; i++) {
        const x = i * (TRACK_WIDTH / 2); // World X
        // Project far point
        const far = project3D(x, 0, 4000, width, height);
        // Project near point
        const near = project3D(x, 0, 0, width, height);
        
        ctx.moveTo(far.x, far.y);
        ctx.lineTo(near.x, near.y);
    }

    // Horizontal Grid Lines (moving towards camera)
    // We use distanceRef % gridSpacing to offset
    const gridSpacing = 200;
    const offset = distanceRef.current % gridSpacing;
    
    for(let z = 4000; z >= 0; z -= gridSpacing) {
        const drawZ = z - offset;
        if (drawZ < 0) continue;
        
        // Line from left edge to right edge of world
        const pLeft = project3D(-2000, 0, drawZ, width, height);
        const pRight = project3D(2000, 0, drawZ, width, height);
        
        ctx.moveTo(pLeft.x, pLeft.y);
        ctx.lineTo(pRight.x, pRight.y);
    }
    ctx.stroke();

    // 3. Objects (Z-sort)
    const drawOrder = [...objectsRef.current].sort((a, b) => b.z - a.z);
    
    drawOrder.forEach(obj => {
        if (!obj.active) return;
        const x = getLaneX(obj.lane);
        
        if (obj.type === 'COIN') {
             const proj = project3D(x, 50, obj.z, width, height);
             const size = 60 * proj.scale;
             // Spin effect
             const spin = Math.sin(Date.now() / 100);
             const w = size * Math.abs(spin);
             
             ctx.fillStyle = COLORS.coin;
             ctx.beginPath();
             ctx.ellipse(proj.x, proj.y, w/2, size/2, 0, 0, Math.PI * 2);
             ctx.fill();
             
             ctx.fillStyle = "#fff";
             ctx.beginPath();
             ctx.ellipse(proj.x, proj.y, w/4, size/4, 0, 0, Math.PI * 2);
             ctx.fill();
        } 
        else if (obj.type === ObstacleType.TRAIN) {
            // Train is a big box
            drawCube(ctx, x, 0, obj.z, 160, 160, 600, {
                front: COLORS.train,
                top: COLORS.trainTop,
                side: COLORS.trainSide
            });
            
            // Train Details (Headlights)
            const frontZ = obj.z;
            const pLeftLight = project3D(x - 40, 40, frontZ - 1, width, height);
            const pRightLight = project3D(x + 40, 40, frontZ - 1, width, height);
            const lSize = 20 * pLeftLight.scale;
            
            ctx.fillStyle = "#fef08a";
            ctx.shadowColor = "#fef08a";
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(pLeftLight.x, pLeftLight.y, lSize, 0, Math.PI*2);
            ctx.arc(pRightLight.x, pRightLight.y, lSize, 0, Math.PI*2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        else if (obj.type === ObstacleType.BARRIER_LOW) {
            drawCube(ctx, x, 0, obj.z, 160, 60, 20, {
                front: COLORS.barrier,
                top: COLORS.barrierTop,
                side: COLORS.barrierSide
            });
        }
        else if (obj.type === ObstacleType.BARRIER_HIGH) {
             drawCube(ctx, x, 0, obj.z, 160, 180, 20, {
                front: COLORS.barrier,
                top: COLORS.barrierTop,
                side: COLORS.barrierSide
            });
             // Arch cutout visual (black rect at bottom center)
             const archP = project3D(x, 0, obj.z - 1, width, height);
             const archW = 80 * archP.scale;
             const archH = 80 * archP.scale;
             ctx.fillStyle = COLORS.ground; // See through
             ctx.fillRect(archP.x - archW/2, archP.y - archH, archW, archH);
        }
    });

    // 4. Player
    if (gameState === GameState.PLAYING) {
        const player = playerRef.current;
        const x = getLaneX(player.lane);
        const y = player.y;
        
        // Simple Shadow
        const shadowP = project3D(x, 0, 0, width, height);
        const shadowSize = 80 * shadowP.scale;
        ctx.fillStyle = COLORS.playerShadow;
        ctx.beginPath();
        ctx.ellipse(shadowP.x, shadowP.y, shadowSize/2, shadowSize/5, 0, 0, Math.PI*2);
        ctx.fill();

        // Player is 3D too!
        const pWidth = 50;
        const pHeight = player.isRolling ? 50 : 100;
        const pColor = COLORS.player;
        
        // Draw player as a cool cyan box
        drawCube(ctx, x, y, 0, pWidth, pHeight, 30, {
            front: pColor,
            top: '#67e8f9',
            side: '#0891b2'
        });
        
        // Hoverboard glow if jumping
        if (player.isJumping) {
            const pPos = project3D(x, y, 0, width, height);
            ctx.shadowColor = "#ec4899";
            ctx.shadowBlur = 20;
            ctx.fillStyle = "#ec4899";
            ctx.fillRect(pPos.x - 30 * pPos.scale, pPos.y, 60 * pPos.scale, 10 * pPos.scale);
            ctx.shadowBlur = 0;
        }
    }
  };

  const loop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    update();
    draw(ctx);
    
    requestRef.current = requestAnimationFrame(loop);
  }, [gameState, onGameOver]);

  // Handle Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== GameState.PLAYING) return;
      const player = playerRef.current;
      
      switch(e.key) {
        case 'ArrowLeft':
        case 'a':
          if (player.targetLane > Lane.LEFT) player.targetLane -= 1;
          break;
        case 'ArrowRight':
        case 'd':
          if (player.targetLane < Lane.RIGHT) player.targetLane += 1;
          break;
        case 'ArrowUp':
        case 'w':
        case ' ':
          if (!player.isJumping && !player.isRolling) {
            player.dy = JUMP_FORCE;
            player.isJumping = true;
          }
          break;
        case 'ArrowDown':
        case 's':
          if (!player.isRolling && !player.isJumping) {
            player.isRolling = true;
            player.rollTimer = 35; // Shorter roll
          } else if (player.isJumping) {
            player.dy = -JUMP_FORCE * 1.5; 
          }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);
  
  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;
    
    const handleTouchStart = (e: TouchEvent) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
        if (gameState !== GameState.PLAYING) return;
        const touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;
        const dx = touchEndX - touchStartX;
        const dy = touchEndY - touchStartY;
        const player = playerRef.current;
        
        if (Math.abs(dx) > Math.abs(dy)) {
            if (Math.abs(dx) > 30) {
                if (dx > 0 && player.targetLane < Lane.RIGHT) player.targetLane += 1;
                else if (dx < 0 && player.targetLane > Lane.LEFT) player.targetLane -= 1;
            }
        } else {
             if (Math.abs(dy) > 30) {
                if (dy < 0 && !player.isJumping && !player.isRolling) {
                     player.dy = JUMP_FORCE;
                     player.isJumping = true;
                } else if (dy > 0) {
                     if (!player.isRolling && !player.isJumping) {
                        player.isRolling = true;
                        player.rollTimer = 35;
                     } else if (player.isJumping) {
                        player.dy = -JUMP_FORCE * 1.5;
                     }
                }
             }
        }
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
        window.removeEventListener('touchstart', handleTouchStart);
        window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [gameState]);

  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      playerRef.current = {
        lane: 0,
        targetLane: Lane.CENTER,
        y: 0,
        dy: 0,
        isJumping: false,
        isRolling: false,
        rollTimer: 0
      };
      objectsRef.current = [];
      speedRef.current = GAME_SPEED_START;
      scoreRef.current = 0;
      coinsRef.current = 0;
      distanceRef.current = 0;
      frameCountRef.current = 0;
      onScoreUpdate(0);
      onCoinsUpdate(0);
    }
  }, [gameState]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [loop]);

  return (
    <canvas 
      ref={canvasRef}
      className="block w-full h-full"
    />
  );
};