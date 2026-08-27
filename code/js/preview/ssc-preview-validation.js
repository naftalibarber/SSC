(() => {
  'use strict';

  const FACE_ORDER=Object.freeze(['U','D','F','B','R','L']);
  const EVENT_CONFIG=Object.freeze({
    '222':Object.freeze({order:2,puzzleExport:'cube2x2x2'}),
    '333':Object.freeze({order:3,puzzleExport:'cube3x3x3'}),
    '444':Object.freeze({order:4,puzzleExport:'cube4x4x4'})
  });
  const BASIC_MOVES=Object.freeze(
    ['R','U','F','L','D','B'].flatMap(face=>[face,`${face}'`,`${face}2`])
  );
  const DETERMINISTIC_SCRAMBLES=Object.freeze([
    '',
    ...BASIC_MOVES,
    "R R'","U U'","F F'","L L'","D D'","B B'",
    'R R R R','U U U U','F F F F','L L L L','D D D D','B B B B',
    "R U R' U'",
    "R U R' U R U2 R'",
    "F R U R' U' F'"
  ]);
  const WIDE_DETERMINISTIC_SCRAMBLES=Object.freeze([
    ...['Rw','Uw','Fw','Lw','Dw','Bw'].flatMap(move=>[move,`${move}'`,`${move}2`]),
    "Rw Rw'","Uw Uw'","Fw Fw'","Lw Lw'","Dw Dw'","Bw Bw'",
    'Rw Rw Rw Rw','Uw Uw Uw Uw','Fw Fw Fw Fw','Lw Lw Lw Lw','Dw Dw Dw Dw','Bw Bw Bw Bw',
    "Rw U Rw' U'",
    "Rw U2 Rw' U2",
    "Rw U Rw' F2 Uw' F Uw"
  ]);

  let cubingModulesPromise=null;
  const referenceContexts=new Map();

  function normalizeEventId(eventId){
    const raw=String(eventId??'333').trim().toLowerCase();
    if(raw==='2x2'||raw==='2×2')return'222';
    if(raw==='3x3'||raw==='3×3')return'333';
    if(raw==='4x4'||raw==='4×4')return'444';
    return raw;
  }

  function configFor(eventId){
    const normalized=normalizeEventId(eventId);
    const config=EVENT_CONFIG[normalized];
    if(!config)throw new Error(`SSC Preview validation supports only 222, 333 and 444; received ${String(eventId)}.`);
    return{eventId:normalized,...config};
  }

  function deterministicScramblesFor(eventId){
    const normalized=normalizeEventId(eventId);
    return normalized==='444'
      ?Object.freeze([...DETERMINISTIC_SCRAMBLES,...WIDE_DETERMINISTIC_SCRAMBLES])
      :DETERMINISTIC_SCRAMBLES;
  }

  function assertFaceArray(value,face,order){
    const n=Number(order);
    if(!Array.isArray(value))throw new Error(`Missing ${face} face in normalized state.`);
    const flat=Array.isArray(value[0])?value.flat():[...value];
    if(flat.length!==n*n)throw new Error(`Invalid ${face} face size: ${flat.length}; expected ${n*n}.`);
    for(const identity of flat){
      if(!FACE_ORDER.includes(identity))throw new Error(`Invalid face identity ${String(identity)} in ${face}.`);
    }
    return flat;
  }

  function normalizeState(input,order){
    const n=Number(order??input?.order);
    if(!Number.isInteger(n)||n<2)throw new Error('normalizeState() requires a valid cube order.');
    const source=input?.faces||input;
    const normalized={};
    for(const face of FACE_ORDER)normalized[face]=assertFaceArray(source?.[face],face,n);
    return normalized;
  }

  function compareStates(sscState,referenceState,{eventId='?',scramble='',order}={}){
    const n=Number(order)||Math.sqrt(normalizeState(sscState,order).U.length);
    const ssc=normalizeState(sscState,n);
    const reference=normalizeState(referenceState,n);
    const mismatches=[];
    for(const face of FACE_ORDER){
      for(let index=0;index<n*n;index++){
        if(ssc[face][index]===reference[face][index])continue;
        mismatches.push(Object.freeze({
          eventId:normalizeEventId(eventId),
          scramble:String(scramble??''),
          face,
          row:Math.floor(index/n),
          col:index%n,
          sscValue:ssc[face][index],
          referenceValue:reference[face][index]
        }));
      }
    }
    return mismatches;
  }

  async function loadCubingModules(){
    if(cubingModulesPromise)return cubingModulesPromise;
    cubingModulesPromise=(async()=>{
      const isNode=typeof process!=='undefined'&&Boolean(process.versions?.node);
      const puzzlesSpecifier=isNode?'cubing/puzzles':'https://cdn.cubing.net/v0/js/cubing/puzzles';
      const scrambleSpecifier=isNode?'cubing/scramble':'https://cdn.cubing.net/v0/js/cubing/scramble';
      const [puzzles,scramble]=await Promise.all([import(puzzlesSpecifier),import(scrambleSpecifier)]);
      if(typeof scramble.randomScrambleForEvent!=='function')throw new Error('cubing.js randomScrambleForEvent() is unavailable.');
      return{puzzles,scramble};
    })();
    return cubingModulesPromise;
  }

  function centroid(coords){
    const center=[0,0,0];
    const points=Math.floor((coords?.length||0)/3);
    if(!points)throw new Error('cubing.js returned sticker geometry without coordinates.');
    for(let index=0;index<points;index++){
      center[0]+=Number(coords[index*3]);
      center[1]+=Number(coords[(index*3)+1]);
      center[2]+=Number(coords[(index*3)+2]);
    }
    return center.map(value=>value/points);
  }

  function subtract(a,b){return[a[0]-b[0],a[1]-b[1],a[2]-b[2]];}
  function dot(a,b){return(a[0]*b[0])+(a[1]*b[1])+(a[2]*b[2]);}
  function normalizeVector(vector){
    const length=Math.hypot(...vector);
    if(!length)throw new Error('Unable to derive cube axes from cubing.js geometry.');
    return vector.map(value=>value/length);
  }

  function clusterLevels(values,tolerance=1e-6){
    const sorted=[...values].sort((a,b)=>a-b);
    const levels=[];
    for(const value of sorted){
      const previous=levels.at(-1);
      if(previous===undefined||Math.abs(value-previous)>tolerance)levels.push(value);
      else levels[levels.length-1]=(previous+value)/2;
    }
    return levels;
  }

  function nearestLevel(value,levels){
    let bestIndex=-1;
    let bestDistance=Infinity;
    for(let index=0;index<levels.length;index++){
      const distance=Math.abs(value-levels[index]);
      if(distance<bestDistance){bestDistance=distance;bestIndex=index;}
    }
    return bestIndex;
  }

  function faceCoordinates(face,point,axes){
    const x=dot(point,axes.x);
    const y=dot(point,axes.y);
    const z=dot(point,axes.z);
    if(face==='F')return{row:-y,col:x};
    if(face==='B')return{row:-y,col:-x};
    if(face==='R')return{row:-y,col:-z};
    if(face==='L')return{row:-y,col:z};
    if(face==='U')return{row:z,col:x};
    if(face==='D')return{row:-z,col:x};
    throw new Error(`Unknown cube face ${face}.`);
  }

  function createCellMap(stickerDat,order){
    const faceNames=stickerDat.faces.map(face=>face.name);
    const faceCenters=Object.fromEntries(stickerDat.faces.map((face,index)=>[faceNames[index],centroid(face.coords)]));
    for(const face of FACE_ORDER){
      if(!faceCenters[face])throw new Error(`cubing.js geometry is missing ${face} face.`);
    }
    const axes={
      x:normalizeVector(subtract(faceCenters.R,faceCenters.L)),
      y:normalizeVector(subtract(faceCenters.U,faceCenters.D)),
      z:normalizeVector(subtract(faceCenters.F,faceCenters.B))
    };
    const usable=stickerDat.stickers.filter(sticker=>!sticker.isDup&&FACE_ORDER.includes(faceNames[sticker.face]));
    const byFace=Object.fromEntries(FACE_ORDER.map(face=>[face,[]]));
    for(const sticker of usable){
      const face=faceNames[sticker.face];
      const point=centroid(sticker.coords);
      const local=faceCoordinates(face,point,axes);
      byFace[face].push({sticker,face,rowValue:local.row,colValue:local.col});
    }

    const cells=new WeakMap();
    for(const face of FACE_ORDER){
      const items=byFace[face];
      if(items.length!==order*order){
        throw new Error(`cubing.js ${order}x${order} geometry returned ${items.length} stickers for ${face}; expected ${order*order}.`);
      }
      const rows=clusterLevels(items.map(item=>item.rowValue));
      const cols=clusterLevels(items.map(item=>item.colValue));
      if(rows.length!==order||cols.length!==order){
        throw new Error(`Unable to normalize cubing.js ${face} geometry to ${order}x${order}.`);
      }
      for(const item of items){
        cells.set(item.sticker,Object.freeze({
          face,
          row:nearestLevel(item.rowValue,rows),
          col:nearestLevel(item.colValue,cols)
        }));
      }
    }
    return{cells,faceNames,usable};
  }

  async function referenceContext(eventId){
    const {eventId:normalized,order,puzzleExport}=configFor(eventId);
    if(referenceContexts.has(normalized))return referenceContexts.get(normalized);
    const {puzzles}=await loadCubingModules();
    const puzzleId=`${order}x${order}x${order}`;
    const loader=puzzles[puzzleExport]||puzzles.puzzles?.[puzzleId];
    if(!loader?.kpuzzle||!loader?.pg)throw new Error(`cubing.js puzzle loader ${puzzleExport}/${puzzleId} is unavailable.`);
    const [kpuzzle,pg]=await Promise.all([loader.kpuzzle(),loader.pg()]);
    const stickerDat=pg.get3d();
    const {cells,faceNames,usable}=createCellMap(stickerDat,order);
    const stickersByOrbit={};
    const orientationCounts={};

    for(const sticker of usable){
      stickersByOrbit[sticker.orbit]??=[];
      stickersByOrbit[sticker.orbit][sticker.ori]??=[];
      stickersByOrbit[sticker.orbit][sticker.ori][sticker.ord]=sticker;
      orientationCounts[sticker.orbit]=Math.max(orientationCounts[sticker.orbit]||0,Number(sticker.ori)+1);
    }

    const context=Object.freeze({eventId:normalized,order,kpuzzle,stickerDat,cells,faceNames,usable,stickersByOrbit,orientationCounts});
    referenceContexts.set(normalized,context);
    return context;
  }

  async function buildReferenceState(eventId,scramble=''){
    const context=await referenceContext(eventId);
    const pattern=context.kpuzzle.defaultPattern().applyAlg(String(scramble??'').trim());
    const faces=Object.fromEntries(FACE_ORDER.map(face=>[face,Array(context.order*context.order).fill(null)]));

    for(const targetSticker of context.usable){
      const orbitData=pattern.patternData[targetSticker.orbit];
      if(!orbitData)throw new Error(`cubing.js state is missing orbit ${targetSticker.orbit}.`);
      const orientationCount=context.orientationCounts[targetSticker.orbit];
      const sourceOrd=orbitData.pieces[targetSticker.ord];
      const orientation=orbitData.orientation[targetSticker.ord]||0;
      const sourceOri=(targetSticker.ori+orientationCount-(orientation%orientationCount))%orientationCount;
      const sourceSticker=context.stickersByOrbit[targetSticker.orbit]?.[sourceOri]?.[sourceOrd];
      if(!sourceSticker)throw new Error(`Unable to resolve cubing.js sticker ${targetSticker.orbit}/${sourceOrd}/${sourceOri}.`);
      const identity=context.faceNames[sourceSticker.face];
      const cell=context.cells.get(targetSticker);
      if(!cell||!FACE_ORDER.includes(identity))throw new Error('Unable to normalize a cubing.js sticker.');
      const index=(cell.row*context.order)+cell.col;
      if(faces[cell.face][index]!==null)throw new Error(`Duplicate cubing.js sticker at ${cell.face}[${cell.row}][${cell.col}].`);
      faces[cell.face][index]=identity;
    }

    for(const face of FACE_ORDER){
      if(faces[face].some(value=>value===null))throw new Error(`Incomplete cubing.js normalized state for ${face}.`);
    }
    return faces;
  }

  function getSSCState(eventId,scramble=''){
    const {order}=configFor(eventId);
    if(!globalThis.SSCNxNState?.buildState)throw new Error('SSCNxNState is required for validation.');
    return normalizeState(globalThis.SSCNxNState.buildState(scramble,order,{strict:true}),order);
  }

  function firstMismatchLog(mismatch){
    if(!mismatch)return;
    console.error(
`[SSC Preview Validation FAILED]

event: ${mismatch.eventId}
scramble: ${mismatch.scramble||'(solved)'}

face: ${mismatch.face}
row: ${mismatch.row}
col: ${mismatch.col}

SSC: ${mismatch.sscValue}
Reference: ${mismatch.referenceValue}`
    );
  }

  async function runCase(eventId,scramble,name,type){
    const {order,eventId:normalized}=configFor(eventId);
    try{
      const ssc=getSSCState(normalized,scramble);
      const reference=await buildReferenceState(normalized,scramble);
      const mismatches=compareStates(ssc,reference,{eventId:normalized,scramble,order});
      if(mismatches.length)firstMismatchLog(mismatches[0]);
      return Object.freeze({name,type,eventId:normalized,scramble,ok:mismatches.length===0,mismatches});
    }catch(error){
      const failure=Object.freeze({
        eventId:normalized,scramble:String(scramble??''),face:null,row:null,col:null,
        sscValue:null,referenceValue:null,error:String(error?.message||error)
      });
      console.error('[SSC Preview Validation ERROR]',failure,error);
      return Object.freeze({name,type,eventId:normalized,scramble,ok:false,mismatches:[failure],error:failure.error});
    }
  }

  async function validate({eventId='333',count=100}={}){
    const {eventId:normalized}=configFor(eventId);
    const randomCount=Math.max(0,Math.floor(Number(count)||0));
    const deterministic=deterministicScramblesFor(normalized);
    const results=[];

    for(let index=0;index<deterministic.length;index++){
      const scramble=deterministic[index];
      results.push(await runCase(normalized,scramble,`deterministic-${index+1}`,'deterministic'));
    }

    const {scramble}=await loadCubingModules();
    for(let index=0;index<randomCount;index++){
      try{
        const generated=await scramble.randomScrambleForEvent(normalized);
        const text=generated.toString();
        results.push(await runCase(normalized,text,`random-${index+1}`,'random'));
      }catch(error){
        results.push(Object.freeze({
          name:`random-${index+1}`,type:'random',eventId:normalized,scramble:'',ok:false,
          mismatches:[Object.freeze({eventId:normalized,scramble:'',face:null,row:null,col:null,sscValue:null,referenceValue:null,error:String(error?.message||error)})],
          error:String(error?.message||error)
        }));
      }
    }

    const failedResults=results.filter(result=>!result.ok);
    return Object.freeze({
      ok:failedResults.length===0,
      eventId:normalized,
      tested:randomCount,
      deterministicTested:deterministic.length,
      totalTested:results.length,
      failed:failedResults.length,
      results:Object.freeze(results)
    });
  }

  async function validateAll({count=100}={}){
    const [two,three,four]=await Promise.all([
      validate({eventId:'222',count}),
      validate({eventId:'333',count}),
      validate({eventId:'444',count})
    ]);
    return Object.freeze({
      ok:two.ok&&three.ok&&four.ok,
      tested:two.tested+three.tested+four.tested,
      deterministicTested:two.deterministicTested+three.deterministicTested+four.deterministicTested,
      totalTested:two.totalTested+three.totalTested+four.totalTested,
      failed:two.failed+three.failed+four.failed,
      results:Object.freeze({'222':two,'333':three,'444':four})
    });
  }

  globalThis.SSCPreviewValidation=Object.freeze({
    FACE_ORDER,
    deterministicScrambles:DETERMINISTIC_SCRAMBLES,
    wideDeterministicScrambles:WIDE_DETERMINISTIC_SCRAMBLES,
    deterministicScramblesFor,
    normalizeState,
    compareStates,
    buildReferenceState,
    getSSCState,
    validate,
    validateAll
  });
})();