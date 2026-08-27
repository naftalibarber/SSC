(() => {
  'use strict';

  const FACE_ORDER=Object.freeze(['U','L','F','R','B','D']);
  const FACE_IDENTITIES=new Set(FACE_ORDER);
  const FACE_NORMALS=Object.freeze({
    U:Object.freeze([0,1,0]),
    D:Object.freeze([0,-1,0]),
    F:Object.freeze([0,0,1]),
    B:Object.freeze([0,0,-1]),
    R:Object.freeze([1,0,0]),
    L:Object.freeze([-1,0,0])
  });

  function assertOrder(order){
    const n=Number(order);
    if(!Number.isInteger(n)||n<2||n>7)throw new RangeError(`SSC NxN state engine supports orders 2-7; received ${order}.`);
    return n;
  }

  function normalizeScramble(scramble){
    if(Array.isArray(scramble))return scramble.filter(Boolean).map(value=>String(value).trim()).filter(Boolean);
    const text=String(scramble??'').trim();
    return text?text.split(/\s+/):[];
  }

  function coordsForSize(n){
    return Array.from({length:n},(_,index)=>(index*2)-(n-1));
  }

  function makeSticker(face,row,col,n,coords,outer){
    let position;
    if(face==='U')position=[coords[col],outer,coords[row]];
    else if(face==='D')position=[coords[col],-outer,coords[n-1-row]];
    else if(face==='F')position=[coords[col],coords[n-1-row],outer];
    else if(face==='B')position=[coords[n-1-col],coords[n-1-row],-outer];
    else if(face==='R')position=[outer,coords[n-1-row],coords[n-1-col]];
    else position=[-outer,coords[n-1-row],coords[col]];

    return{
      position,
      normal:[...FACE_NORMALS[face]],
      identity:face,
      solvedFace:face,
      solvedRow:row,
      solvedCol:col
    };
  }

  function solvedStickers(order){
    const n=assertOrder(order);
    const coords=coordsForSize(n);
    const outer=n-1;
    const stickers=[];
    for(const face of FACE_ORDER){
      for(let row=0;row<n;row++){
        for(let col=0;col<n;col++)stickers.push(makeSticker(face,row,col,n,coords,outer));
      }
    }
    return stickers;
  }

  function dot(a,b){return(a[0]*b[0])+(a[1]*b[1])+(a[2]*b[2]);}
  function cross(a,b){
    return[
      (a[1]*b[2])-(a[2]*b[1]),
      (a[2]*b[0])-(a[0]*b[2]),
      (a[0]*b[1])-(a[1]*b[0])
    ];
  }

  function rotateVector(vector,axis,quarterDirection){
    const crossProduct=cross(axis,vector);
    const projection=dot(axis,vector);
    const direction=quarterDirection;
    return[
      Math.round((crossProduct[0]*direction)+(axis[0]*projection)),
      Math.round((crossProduct[1]*direction)+(axis[1]*projection)),
      Math.round((crossProduct[2]*direction)+(axis[2]*projection))
    ];
  }

  function parseMove(move,order){
    const n=assertOrder(order);
    if(typeof move!=='string'||!move.trim())return null;
    const token=move.trim();
    const match=token.match(/^(\d+)?([URFDLBurfdlb])(w)?(2'|2|'|)?$/);
    if(!match)return null;

    const [,depthPrefix,rawFace,wideSuffix,suffix='']=match;
    const lowerCaseWide=rawFace===rawFace.toLowerCase();
    const explicitWide=Boolean(wideSuffix);
    if(depthPrefix&&!explicitWide)return null;

    const face=rawFace.toUpperCase();
    const layerDepth=depthPrefix?Number(depthPrefix):(lowerCaseWide||explicitWide?2:1);
    if(!FACE_NORMALS[face]||!Number.isInteger(layerDepth)||layerDepth<1||layerDepth>n)return null;
    if(layerDepth>1&&n<4)return null;

    return Object.freeze({
      token,
      face,
      layerDepth,
      halfTurn:suffix.startsWith('2'),
      prime:suffix.includes("'")
    });
  }

  function applyQuarterTurn(stickers,face,direction,layerDepth,order){
    const n=assertOrder(order);
    const axis=FACE_NORMALS[face];
    const outer=n-1;
    const activeLayers=new Set();
    for(let depth=0;depth<layerDepth;depth++)activeLayers.add(outer-(depth*2));

    for(const sticker of stickers){
      if(!activeLayers.has(dot(sticker.position,axis)))continue;
      sticker.position=rotateVector(sticker.position,axis,direction);
      sticker.normal=rotateVector(sticker.normal,axis,direction);
    }
  }

  function applyMove(stickers,move,order,{strict=false}={}){
    const parsed=parseMove(move,order);
    if(!parsed){
      if(strict)throw new Error(`Unsupported ${order}x${order} move: ${String(move)}`);
      return false;
    }

    const turns=parsed.halfTurn?2:1;
    const direction=parsed.prime?1:-1;
    for(let turn=0;turn<turns;turn++)applyQuarterTurn(stickers,parsed.face,direction,parsed.layerDepth,order);
    return true;
  }

  function faceFromNormal(normal){
    const [x,y,z]=normal;
    if(y===1)return'U';
    if(y===-1)return'D';
    if(z===1)return'F';
    if(z===-1)return'B';
    if(x===1)return'R';
    if(x===-1)return'L';
    throw new Error(`Invalid sticker normal: ${normal.join(',')}`);
  }

  function stickerCell(sticker,face,order,coords){
    const n=order;
    const indexOf=value=>coords.indexOf(value);
    const [x,y,z]=sticker.position;
    if(face==='F')return[n-1-indexOf(y),indexOf(x)];
    if(face==='B')return[n-1-indexOf(y),n-1-indexOf(x)];
    if(face==='R')return[n-1-indexOf(y),n-1-indexOf(z)];
    if(face==='L')return[n-1-indexOf(y),indexOf(z)];
    if(face==='U')return[indexOf(z),indexOf(x)];
    return[n-1-indexOf(z),indexOf(x)];
  }

  function stateToFaces(stickers,order){
    const n=assertOrder(order);
    const coords=coordsForSize(n);
    const faces=Object.fromEntries(FACE_ORDER.map(face=>[
      face,
      Array.from({length:n},()=>Array(n).fill(null))
    ]));

    for(const sticker of stickers){
      const face=faceFromNormal(sticker.normal);
      const [row,col]=stickerCell(sticker,face,n,coords);
      if(row<0||col<0||row>=n||col>=n)throw new Error(`Sticker mapped outside ${face} face: row=${row}, col=${col}.`);
      if(faces[face][row][col]!==null)throw new Error(`Duplicate sticker mapping at ${face}[${row}][${col}].`);
      faces[face][row][col]=sticker.identity;
    }
    return faces;
  }

  function stickerId(face,row,col,order){
    return`${face}${(row*order)+col+1}`;
  }

  function buildStickerMapping(faces,order){
    const n=assertOrder(order);
    const mapping={};
    for(const face of FACE_ORDER){
      for(let row=0;row<n;row++){
        for(let col=0;col<n;col++)mapping[stickerId(face,row,col,n)]=faces[face][row][col];
      }
    }
    return Object.freeze(mapping);
  }

  function validateFaces(faces,order){
    const n=assertOrder(order);
    const counts=Object.fromEntries(FACE_ORDER.map(face=>[face,0]));
    for(const face of FACE_ORDER){
      if(!Array.isArray(faces?.[face])||faces[face].length!==n)throw new Error(`Invalid ${face} face row count.`);
      for(const row of faces[face]){
        if(!Array.isArray(row)||row.length!==n)throw new Error(`Invalid ${face} face column count.`);
        for(const identity of row){
          if(!FACE_IDENTITIES.has(identity))throw new Error(`Invalid face identity ${identity} in ${face}.`);
          counts[identity]+=1;
        }
      }
    }
    const expected=n*n;
    for(const face of FACE_ORDER){
      if(counts[face]!==expected)throw new Error(`Invalid ${face} sticker count: ${counts[face]} instead of ${expected}.`);
    }
    return true;
  }

  function buildState(scramble,order,{strict=false}={}){
    const n=assertOrder(order);
    const moves=normalizeScramble(scramble);
    const stickers=solvedStickers(n);
    const ignoredMoves=[];

    for(const move of moves){
      if(!applyMove(stickers,move,n,{strict}))ignoredMoves.push(move);
    }

    const faces=stateToFaces(stickers,n);
    validateFaces(faces,n);
    const mapping=buildStickerMapping(faces,n);

    return Object.freeze({
      order:n,
      moves:Object.freeze([...moves]),
      ignoredMoves:Object.freeze(ignoredMoves),
      faces,
      mapping,
      engineState:stickers
    });
  }

  function inverseMove(move,order){
    const parsed=parseMove(move,order);
    if(!parsed)return null;
    if(parsed.halfTurn)return parsed.token.replace(/2'$/,'2');
    return parsed.prime?parsed.token.slice(0,-1):`${parsed.token}'`;
  }

  function faceSignature(faces){
    return FACE_ORDER.map(face=>faces[face].flat().join('')).join('|');
  }

  function solvedSignature(order){return faceSignature(buildState('',order).faces);}

  function selfTest(){
    const results=[];
    const basicMoves=['U','D','F','B','R','L'];

    for(let n=2;n<=7;n++){
      const solved=solvedSignature(n);
      const tests=[];

      for(const move of basicMoves){
        const inverse=inverseMove(move,n);
        const state=buildState(`${move} ${inverse}`,n,{strict:true});
        tests.push({name:`${move}+inverse`,ok:faceSignature(state.faces)===solved});

        const four=buildState(`${move} ${move} ${move} ${move}`,n,{strict:true});
        tests.push({name:`${move}x4`,ok:faceSignature(four.faces)===solved});
      }

      if(n>=4){
        for(const move of ['Rw','Uw','Fw']){
          const inverse=inverseMove(move,n);
          const state=buildState(`${move} ${inverse}`,n,{strict:true});
          tests.push({name:`${move}+inverse`,ok:faceSignature(state.faces)===solved});
        }
      }

      results.push({order:n,ok:tests.every(test=>test.ok),tests});
    }

    const report={ok:results.every(result=>result.ok),results};
    if(!report.ok)console.error('[SSC Preview V1] NxN state self-test failed.',report);
    else console.info('[SSC Preview V1] NxN state self-test passed for 2x2-7x7.');
    return report;
  }

  window.SSCNxNState=Object.freeze({
    FACE_ORDER,
    FACE_NORMALS,
    normalizeScramble,
    parseMove,
    buildState,
    buildStickerMapping,
    validateFaces,
    stickerId,
    selfTest
  });
})();