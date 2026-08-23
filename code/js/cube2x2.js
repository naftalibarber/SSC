(() => {
  const SOLVED_CP = [0,1,2,3,4,5,6,7];
  const SOLVED_CO = [0,0,0,0,0,0,0,0];
  const MOVE_CUBES = {
    U:{cp:[3,0,1,2,4,5,6,7],co:[0,0,0,0,0,0,0,0]},
    R:{cp:[4,1,2,0,7,5,6,3],co:[2,0,0,1,1,0,0,2]},
    F:{cp:[1,5,2,3,0,4,6,7],co:[1,2,0,0,2,1,0,0]},
    D:{cp:[0,1,2,3,5,6,7,4],co:[0,0,0,0,0,0,0,0]},
    L:{cp:[0,2,6,3,4,1,5,7],co:[0,1,2,0,0,2,1,0]},
    B:{cp:[0,1,3,7,4,5,2,6],co:[0,0,1,2,0,0,2,1]}
  };
  const ALL_MOVES=['U',"U'",'U2','D',"D'",'D2','R',"R'",'R2','L',"L'",'L2','F',"F'",'F2','B',"B'",'B2'];
  function cloneState(state){return{cp:[...state.cp],co:[...state.co]};}
  function applyQuarterTurn(state,face){const move=MOVE_CUBES[face];const nextCp=new Array(8);const nextCo=new Array(8);for(let i=0;i<8;i++){const source=move.cp[i];nextCp[i]=state.cp[source];nextCo[i]=(state.co[source]+move.co[i])%3;}return{cp:nextCp,co:nextCo};}
  function applyMove(state,move){const face=move[0];const turns=move.endsWith('2')?2:move.endsWith("'")?3:1;let next=cloneState(state);for(let i=0;i<turns;i++)next=applyQuarterTurn(next,face);return next;}
  function applyScramble(scramble){let state={cp:[...SOLVED_CP],co:[...SOLVED_CO]};for(const move of scramble)state=applyMove(state,move);return state;}
  function isSolved(state){for(let i=0;i<8;i++){if(state.cp[i]!==i||state.co[i]!==0)return false;}return true;}
  function stateKey(state){return`${state.cp.join('')}:${state.co.join('')}`;}
  function canSolveWithinDepth(state,maxDepth){if(isSolved(state))return true;const visited=new Map();function dfs(current,depthRemaining,previousFace='-'){if(isSolved(current))return true;if(depthRemaining===0)return false;const visitKey=`${stateKey(current)}|${previousFace}`;const bestRemaining=visited.get(visitKey);if(bestRemaining!==undefined&&bestRemaining>=depthRemaining)return false;visited.set(visitKey,depthRemaining);for(const move of ALL_MOVES){const face=move[0];if(face===previousFace)continue;if(dfs(applyMove(current,move),depthRemaining-1,face))return true;}return false;}return dfs(state,maxDepth);}
  function isSolvableInFourOrLess(scrambleOrState){const state=Array.isArray(scrambleOrState)?applyScramble(scrambleOrState):scrambleOrState;return canSolveWithinDepth(state,4);}
  window.Cube2x2={applyMove,applyScramble,isSolved,isSolvableInFourOrLess};
})();
