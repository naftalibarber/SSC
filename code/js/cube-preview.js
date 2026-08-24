(() => {
  const COLORS={U:'#ffffff',D:'#ffd500',F:'#16a34a',B:'#2563eb',R:'#dc2626',L:'#f97316'};
  const FACE_ORDER=['U','L','F','R','B','D'];
  const AXIS={U:'y',D:'y',R:'x',L:'x',F:'z',B:'z'};

  function rotateGridCW(grid,n){const next=Array.from({length:n},()=>Array(n));for(let r=0;r<n;r++)for(let c=0;c<n;c++)next[c][n-1-r]=grid[r][c];return next;}
  function rotateGridCCW(grid,n){let out=grid;for(let i=0;i<3;i++)out=rotateGridCW(out,n);return out;}
  function rotateGrid180(grid,n){return rotateGridCW(rotateGridCW(grid,n),n);}

  function solved(n){const s={};for(const f of FACE_ORDER)s[f]=Array.from({length:n},()=>Array(n).fill(f));return s;}
  function clone(s){const out={};for(const f of FACE_ORDER)out[f]=s[f].map(row=>[...row]);return out;}

  function getRow(s,f,r){return [...s[f][r]];}
  function setRow(s,f,r,v){s[f][r]=[...v];}
  function getCol(s,f,c){return s[f].map(row=>row[c]);}
  function setCol(s,f,c,v){for(let r=0;r<v.length;r++)s[f][r][c]=v[r];}
  const rev=a=>[...a].reverse();

  function quarterTurn(state,face,n){const s=clone(state);const last=n-1;
    if(face==='U'){
      s.U=rotateGridCW(state.U,n);
      const F=getRow(state,'F',0),R=getRow(state,'R',0),B=getRow(state,'B',0),L=getRow(state,'L',0);
      setRow(s,'R',0,F);setRow(s,'B',0,R);setRow(s,'L',0,B);setRow(s,'F',0,L);
    } else if(face==='D'){
      s.D=rotateGridCW(state.D,n);
      const F=getRow(state,'F',last),L=getRow(state,'L',last),B=getRow(state,'B',last),R=getRow(state,'R',last);
      setRow(s,'L',last,F);setRow(s,'B',last,L);setRow(s,'R',last,B);setRow(s,'F',last,R);
    } else if(face==='R'){
      s.R=rotateGridCW(state.R,n);
      const U=getCol(state,'U',last),F=getCol(state,'F',last),D=getCol(state,'D',last),B=getCol(state,'B',0);
      setCol(s,'F',last,U);setCol(s,'D',last,F);setCol(s,'B',0,rev(D));setCol(s,'U',last,rev(B));
    } else if(face==='L'){
      s.L=rotateGridCW(state.L,n);
      const U=getCol(state,'U',0),B=getCol(state,'B',last),D=getCol(state,'D',0),F=getCol(state,'F',0);
      setCol(s,'B',last,rev(U));setCol(s,'D',0,rev(B));setCol(s,'F',0,D);setCol(s,'U',0,F);
    } else if(face==='F'){
      s.F=rotateGridCW(state.F,n);
      const U=getRow(state,'U',last),L=getCol(state,'L',last),D=getRow(state,'D',0),R=getCol(state,'R',0);
      setCol(s,'R',0,rev(U));setRow(s,'D',0,R);setCol(s,'L',last,rev(D));setRow(s,'U',last,L);
    } else if(face==='B'){
      s.B=rotateGridCW(state.B,n);
      const U=getRow(state,'U',0),R=getCol(state,'R',last),D=getRow(state,'D',last),L=getCol(state,'L',0);
      setCol(s,'L',0,rev(U));setRow(s,'D',last,L);setCol(s,'R',last,rev(D));setRow(s,'U',0,R);
    }
    return s;
  }
  function applyMove(state,move,n){const face=move[0];const turns=move.endsWith('2')?2:move.endsWith("'")?3:1;let out=state;for(let i=0;i<turns;i++)out=quarterTurn(out,face,n);return out;}
  function applyScramble(scramble,n){let s=solved(n);for(const move of scramble)s=applyMove(s,move,n);return s;}

  function faceMarkup(face,grid,n){return `<div class="cube-preview-face face-${face.toLowerCase()}" data-face="${face}" style="--n:${n}">${grid.flat().map(v=>`<span class="cube-preview-sticker" style="background:${COLORS[v]}"></span>`).join('')}</div>`;}
  function render(container,scramble,puzzle){if(!container)return;const n=puzzle==='2x2'?2:3;const moves=Array.isArray(scramble)?scramble:String(scramble||'').trim().split(/\s+/).filter(Boolean);const state=applyScramble(moves,n);container.innerHTML=`<div class="cube-preview-net" data-size="${n}">${FACE_ORDER.map(f=>faceMarkup(f,state[f],n)).join('')}</div>`;container.setAttribute('aria-label',`${puzzle} cube preview`);}
  window.SSCCubePreview={render,applyScramble};
})();
