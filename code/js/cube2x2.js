(() => {
  'use strict';

  const SOLVED_CP = Object.freeze([0,1,2,3,4,5,6,7]);
  const SOLVED_CO = Object.freeze([0,0,0,0,0,0,0,0]);
  const FACE_ORDER = Object.freeze(['U','L','F','R','B','D']);

  const MOVE_CUBES = Object.freeze({
    U:{cp:[3,0,1,2,4,5,6,7],co:[0,0,0,0,0,0,0,0]},
    R:{cp:[4,1,2,0,7,5,6,3],co:[2,0,0,1,1,0,0,2]},
    F:{cp:[1,5,2,3,0,4,6,7],co:[1,2,0,0,2,1,0,0]},
    D:{cp:[0,1,2,3,5,6,7,4],co:[0,0,0,0,0,0,0,0]},
    L:{cp:[0,2,6,3,4,1,5,7],co:[0,1,2,0,0,2,1,0]},
    B:{cp:[0,1,3,7,4,5,2,6],co:[0,0,1,2,0,0,2,1]}
  });

  const ALL_MOVES=Object.freeze(['U',"U'",'U2','D',"D'",'D2','R',"R'",'R2','L',"L'",'L2','F',"F'",'F2','B',"B'",'B2']);

  // Kociemba corner order: URF, UFL, ULB, UBR, DFR, DLF, DBL, DRB.
  // Each entry lists the 2x2 semantic sticker IDs occupied by that corner position.
  const CORNER_FACELETS=Object.freeze([
    Object.freeze(['U4','R1','F2']),
    Object.freeze(['U3','F1','L2']),
    Object.freeze(['U1','L1','B2']),
    Object.freeze(['U2','B1','R2']),
    Object.freeze(['D2','F4','R3']),
    Object.freeze(['D1','L4','F3']),
    Object.freeze(['D3','B4','L3']),
    Object.freeze(['D4','R4','B3'])
  ]);

  // Sticker layers carried by the physical corner cubies in solved orientation.
  const CORNER_COLORS=Object.freeze([
    Object.freeze(['U','R','F']),
    Object.freeze(['U','F','L']),
    Object.freeze(['U','L','B']),
    Object.freeze(['U','B','R']),
    Object.freeze(['D','F','R']),
    Object.freeze(['D','L','F']),
    Object.freeze(['D','B','L']),
    Object.freeze(['D','R','B'])
  ]);

  function cloneState(state){return{cp:[...state.cp],co:[...state.co]};}

  function normalizeScramble(scramble){
    if(Array.isArray(scramble))return scramble.filter(Boolean);
    if(typeof scramble==='string')return scramble.trim()?scramble.trim().split(/\s+/):[];
    return[];
  }

  function applyQuarterTurn(state,face){
    const move=MOVE_CUBES[face];
    if(!move)return cloneState(state);
    const nextCp=new Array(8);
    const nextCo=new Array(8);
    for(let i=0;i<8;i++){
      const source=move.cp[i];
      nextCp[i]=state.cp[source];
      nextCo[i]=(state.co[source]+move.co[i])%3;
    }
    return{cp:nextCp,co:nextCo};
  }

  function applyMove(state,move){
    if(typeof move!=='string'||!MOVE_CUBES[move[0]])return cloneState(state);
    const face=move[0];
    const turns=move.endsWith('2')?2:move.endsWith("'")?3:1;
    let next=cloneState(state);
    for(let i=0;i<turns;i++)next=applyQuarterTurn(next,face);
    return next;
  }

  function applyScramble(scramble){
    let state={cp:[...SOLVED_CP],co:[...SOLVED_CO]};
    for(const move of normalizeScramble(scramble))state=applyMove(state,move);
    return state;
  }

  function isSolved(state){
    for(let i=0;i<8;i++)if(state.cp[i]!==i||state.co[i]!==0)return false;
    return true;
  }

  function stateKey(state){return`${state.cp.join('')}:${state.co.join('')}`;}

  function canSolveWithinDepth(state,maxDepth){
    if(isSolved(state))return true;
    const visited=new Map();
    function dfs(current,depthRemaining,previousFace='-'){
      if(isSolved(current))return true;
      if(depthRemaining===0)return false;
      const visitKey=`${stateKey(current)}|${previousFace}`;
      const bestRemaining=visited.get(visitKey);
      if(bestRemaining!==undefined&&bestRemaining>=depthRemaining)return false;
      visited.set(visitKey,depthRemaining);
      for(const move of ALL_MOVES){
        const face=move[0];
        if(face===previousFace)continue;
        if(dfs(applyMove(current,move),depthRemaining-1,face))return true;
      }
      return false;
    }
    return dfs(state,maxDepth);
  }

  function isSolvableInFourOrLess(scrambleOrState){
    const state=Array.isArray(scrambleOrState)||typeof scrambleOrState==='string'?applyScramble(scrambleOrState):scrambleOrState;
    return canSolveWithinDepth(state,4);
  }

  function validateState(state){
    if(!state||!Array.isArray(state.cp)||!Array.isArray(state.co)||state.cp.length!==8||state.co.length!==8){
      throw new Error('[SSC 2x2] Invalid corner state');
    }
  }

  function toStickerMapping(state){
    validateState(state);
    const mapping={};
    for(let position=0;position<8;position++){
      const cubie=state.cp[position];
      const orientation=((state.co[position]%3)+3)%3;
      const facelets=CORNER_FACELETS[position];
      const layers=CORNER_COLORS[cubie];
      for(let sticker=0;sticker<3;sticker++){
        mapping[facelets[(sticker+orientation)%3]]=layers[sticker];
      }
    }
    return Object.freeze(mapping);
  }

  function toFaceState(state){
    const mapping=toStickerMapping(state);
    return Object.fromEntries(FACE_ORDER.map(face=>[
      face,
      [
        [mapping[`${face}1`],mapping[`${face}2`]],
        [mapping[`${face}3`],mapping[`${face}4`]]
      ]
    ]));
  }

  window.Cube2x2=Object.freeze({
    applyMove,
    applyScramble,
    isSolved,
    isSolvableInFourOrLess,
    toStickerMapping,
    toFaceState
  });
})();