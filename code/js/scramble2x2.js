(() => {
  const FACES=['R','L','U','D','F','B'];
  const MODIFIERS=['',"'",'2'];
  const AXIS_BY_FACE={R:'RL',L:'RL',U:'UD',D:'UD',F:'FB',B:'FB'};
  const NORMAL_LENGTHS=[8,9,10];
  const SPECIAL_LENGTHS=[7,11];
  const SPECIAL_EVERY=30;
  function randomItem(items){return items[Math.floor(Math.random()*items.length)];}
  function chooseLength(){return Math.floor(Math.random()*SPECIAL_EVERY)===0?randomItem(SPECIAL_LENGTHS):randomItem(NORMAL_LENGTHS);}
  function buildCandidate(length){const scramble=[];let previousAxis=null;for(let i=0;i<length;i++){const availableFaces=FACES.filter(face=>AXIS_BY_FACE[face]!==previousAxis);const face=randomItem(availableFaces);scramble.push(face+randomItem(MODIFIERS));previousAxis=AXIS_BY_FACE[face];}return scramble;}
  function generate(){const length=chooseLength();for(let attempt=0;attempt<1000;attempt++){const candidate=buildCandidate(length);if(!window.Cube2x2.isSolvableInFourOrLess(candidate))return candidate;}while(true){const candidate=buildCandidate(length);if(!window.Cube2x2.isSolvableInFourOrLess(candidate))return candidate;}}
  window.Scramble2x2={generate,chooseLength,NORMAL_LENGTHS,SPECIAL_LENGTHS,SPECIAL_EVERY};
})();
