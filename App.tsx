import React, { useState, useEffect } from 'react';
import { GameEngine } from './components/GameEngine';
import { Button } from './components/Button';
import { generateDailyMissions } from './services/geminiService';
import { GameState, GameStats, Mission } from './types';
import { Play, RotateCcw, Trophy, Coins, Zap, Target } from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [stats, setStats] = useState<GameStats>({ score: 0, coins: 0, distance: 0, highScore: 0 });
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loadingMissions, setLoadingMissions] = useState(false);
  const [lifetimeRuns, setLifetimeRuns] = useState(0);

  // Load High Score
  useEffect(() => {
    const saved = localStorage.getItem('neonSurferStats');
    if (saved) {
      const parsed = JSON.parse(saved);
      setStats(prev => ({ ...prev, highScore: parsed.highScore || 0 }));
      setLifetimeRuns(parsed.lifetimeRuns || 0);
    }
    fetchMissions(saved ? JSON.parse(saved).lifetimeRuns || 0 : 0);
  }, []);

  const fetchMissions = async (runs: number) => {
    setLoadingMissions(true);
    const newMissions = await generateDailyMissions(runs);
    setMissions(newMissions);
    setLoadingMissions(false);
  };

  const handleStart = () => {
    setGameState(GameState.PLAYING);
  };

  const handleGameOver = (finalStats: GameStats) => {
    const newHighScore = Math.max(stats.highScore, finalStats.score);
    const newRuns = lifetimeRuns + 1;
    
    setStats({ ...finalStats, highScore: newHighScore });
    setLifetimeRuns(newRuns);
    setGameState(GameState.GAME_OVER);
    
    // Save persistence
    localStorage.setItem('neonSurferStats', JSON.stringify({
        highScore: newHighScore,
        lifetimeRuns: newRuns
    }));
  };

  const handleScoreUpdate = (score: number) => {
    setStats(prev => ({ ...prev, score }));
  };

  const handleCoinsUpdate = (coins: number) => {
    setStats(prev => ({ ...prev, coins }));
  };

  return (
    <div className="relative w-screen h-screen bg-slate-900 overflow-hidden select-none">
      
      {/* Game Layer */}
      <div className="absolute inset-0 z-0">
        <GameEngine 
          gameState={gameState} 
          onGameOver={handleGameOver}
          onCoinsUpdate={handleCoinsUpdate}
          onScoreUpdate={handleScoreUpdate}
        />
      </div>

      {/* HUD Layer (Always visible during gameplay) */}
      {gameState === GameState.PLAYING && (
        <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-10 pointer-events-none">
          <div className="flex flex-col gap-2">
            <div className="bg-slate-900/80 backdrop-blur-md p-3 rounded-xl border border-slate-700 flex items-center gap-3 shadow-lg">
                <div className="p-2 bg-cyan-500 rounded-full">
                    <Trophy size={24} className="text-black" />
                </div>
                <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Score</p>
                    <p className="text-2xl font-black brand-font text-white">{stats.score.toLocaleString()}</p>
                </div>
            </div>
          </div>
          
          <div className="bg-slate-900/80 backdrop-blur-md p-3 rounded-xl border border-slate-700 flex items-center gap-3 shadow-lg">
             <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider text-right">Coins</p>
                <p className="text-2xl font-black brand-font text-yellow-400">{stats.coins.toLocaleString()}</p>
            </div>
            <div className="p-2 bg-yellow-500 rounded-full">
                <Coins size={24} className="text-black" />
            </div>
          </div>
        </div>
      )}

      {/* Main Menu Overlay */}
      {gameState === GameState.MENU && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm">
          <div className="max-w-md w-full p-8 text-center">
             <div className="mb-8 animate-bounce">
                <h1 className="text-6xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)] transform -skew-x-12">
                  NEON
                  <br />
                  SURFER
                </h1>
             </div>
             
             <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 mb-8 backdrop-blur-md">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-400 font-bold">HIGH SCORE</span>
                    <span className="text-cyan-400 font-black text-xl">{stats.highScore.toLocaleString()}</span>
                </div>
                <div className="w-full h-px bg-slate-700 my-4"></div>
                
                <h3 className="text-left text-purple-400 font-bold flex items-center gap-2 mb-3">
                    <Target size={18} /> DAILY MISSIONS
                </h3>
                {loadingMissions ? (
                    <div className="text-sm text-slate-500 italic">Interfacing with City AI...</div>
                ) : (
                    <div className="space-y-2">
                        {missions.map((m) => (
                            <div key={m.id} className="text-left text-sm bg-slate-900/60 p-2 rounded border border-slate-700/50 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                                {m.description}
                            </div>
                        ))}
                    </div>
                )}
             </div>

             <Button onClick={handleStart} className="w-full flex items-center justify-center gap-2 text-xl py-4 shadow-cyan-500/20">
                <Play fill="currentColor" /> RIDE THE RAILS
             </Button>
             
             <p className="mt-6 text-slate-500 text-xs">
                ARROWS or WASD to Move • SPACE to Jump
             </p>
          </div>
        </div>
      )}

      {/* Game Over Overlay */}
      {gameState === GameState.GAME_OVER && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-red-900/90 backdrop-blur-md">
           <div className="max-w-sm w-full p-8 text-center bg-black/40 rounded-3xl border border-red-500/30 shadow-2xl">
              <h2 className="text-5xl font-black text-white italic mb-2 brand-font">WIPEOUT</h2>
              <p className="text-red-300 mb-8 font-medium">SECURITY CAUGHT YOU!</p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                      <p className="text-xs text-slate-400 uppercase font-bold">Score</p>
                      <p className="text-2xl font-bold text-white">{stats.score.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                      <p className="text-xs text-slate-400 uppercase font-bold">Coins</p>
                      <p className="text-2xl font-bold text-yellow-400">{stats.coins.toLocaleString()}</p>
                  </div>
              </div>

              <Button onClick={() => setGameState(GameState.MENU)} variant="secondary" className="w-full mb-3">
                 MAIN MENU
              </Button>
              <Button onClick={handleStart} variant="primary" className="w-full flex items-center justify-center gap-2">
                 <RotateCcw size={20} /> TRY AGAIN
              </Button>
           </div>
        </div>
      )}
    </div>
  );
}