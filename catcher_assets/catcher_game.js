(() => {
'use strict';
const $=id=>document.getElementById(id);
const canvas=$('canvas'),arena=$('arena'),scoreEl=$('score'),timeEl=$('time'),fill=$('time-fill'),hitsEl=$('hits'),overlay=$('overlay'),start=$('start'),hammer=$('hammer');
const rand=(a,b)=>a+Math.random()*(b-a), clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const DURATION=30,TOP=.42,COUNTDOWN=3;
let renderer,scene,camera,template,moles=[],particles=[],rings=[],impactEffects=[];
let phase='ready',score=0,hits=0,spawned=0,misses=0,streak=0,startTime=0,countStart=0,nextSpawn=0,lastFrame=performance.now()/1000,lastCount=-1;
let sound=true,audio=null,record=0,loaded=false;
let pointerPosition=null,hammerLockedUntil=0,touchSerial=0;
const HAMMER_IMPACT=.065;
try{record=Number(localStorage.getItem('catcher_ddc_best_v1'))||0;}catch(_){}
function parseModel(data){
  const colors={}, vertices=[],positions=[],groups=[];
  let current=null,offset=0;
  for(const line of data.mtl.split(/\r?\n/)){
    const a=line.trim().split(/\s+/);
    if(a[0]==='newmtl')current=a[1];
    if(a[0]==='Kd')colors[current]=a.slice(1,4).map(Number);
  }
  const names=Object.keys(colors), materials=names.map(n=>{
    const c=colors[n];return new THREE.MeshStandardMaterial({color:new THREE.Color().setRGB(c[0],c[1],c[2],THREE.SRGBColorSpace),roughness:.66,metalness:0,clipShadows:true,clippingPlanes:[new THREE.Plane(new THREE.Vector3(0,1,0),-TOP-.012)],side:THREE.DoubleSide});
  });
  let mat=0,groupStart=0;
  const close=()=>{if(offset>groupStart)groups.push({start:groupStart,count:offset-groupStart,materialIndex:mat});groupStart=offset;};
  for(const line of data.obj.split(/\r?\n/)){
    const a=line.trim().split(/\s+/);
    if(a[0]==='v')vertices.push(a.slice(1,4).map(Number));
    if(a[0]==='usemtl'){close();mat=Math.max(0,names.indexOf(a[1]));}
    if(a[0]==='f'){
      const ids=a.slice(1).map(v=>{const n=Number(v.split('/')[0]);return n<0?vertices.length+n:n-1;});
      for(let i=1;i<ids.length-1;i++)for(const j of [ids[0],ids[i],ids[i+1]]){positions.push(...vertices[j]);offset++;}
    }
  }
  close();
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));groups.forEach(x=>g.addGroup(x.start,x.count,x.materialIndex));g.rotateX(-Math.PI/2);g.computeBoundingBox();
  const box=g.boundingBox,scale=2.53/(box.max.y-box.min.y);
  g.translate(-(box.min.x+box.max.x)/2,-box.min.y,-(box.min.z+box.max.z)/2);g.scale(scale,scale,scale);g.computeVertexNormals();g.computeBoundingSphere();
  const mesh=new THREE.Mesh(g,materials);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}
function roundedShape(w,h,r){const s=new THREE.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;}
const standard=(c,r=.7)=>new THREE.MeshStandardMaterial({color:c,roughness:r});
function mesh(geo,mat,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);scene.add(m);return m;}
function init(){
  if(!window.THREE)throw Error('Three.js 파일을 찾지 못했어요. catcher_assets 폴더와 함께 압축을 풀어 주세요.');
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setClearColor(0xdcebcf);renderer.localClippingEnabled=true;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
  scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-8,8,7,-7,.1,80);camera.position.set(0,12.8,16.5);camera.lookAt(0,.2,0);
  scene.add(new THREE.HemisphereLight(0xfffbea,0xb1caa7,2.2));
  const sun=new THREE.DirectionalLight(0xfff2da,3);sun.position.set(-7,14,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-8;sun.shadow.camera.right=8;sun.shadow.camera.top=9;sun.shadow.camera.bottom=-9;sun.shadow.normalBias=.035;sun.shadow.bias=-.0004;sun.shadow.radius=4;scene.add(sun);
  const ground=mesh(new THREE.PlaneGeometry(200,200),standard(0xdcebcf));ground.rotation.x=-Math.PI/2;ground.position.y=-.52;ground.receiveShadow=true;
  const boardGeo=new THREE.ExtrudeGeometry(roundedShape(11.5,9.8,.65),{depth:.55,bevelEnabled:true,bevelThickness:.12,bevelSize:.12,bevelSegments:3,steps:1});boardGeo.rotateX(-Math.PI/2);
  const board=mesh(boardGeo,standard(0xc3d69d),0,-.26,0);board.castShadow=true;board.receiveShadow=true;
  // A separate thin top keeps the holes flush with a softly rounded garden bed.
  const topGeo=new THREE.ExtrudeGeometry(roundedShape(11.35,9.65,.6),{depth:.08,bevelEnabled:true,bevelThickness:.06,bevelSize:.06,bevelSegments:3,steps:1});topGeo.rotateX(-Math.PI/2);
  const top=mesh(topGeo,standard(0xdeebbc),0,TOP-.14,0);top.receiveShadow=true;
  template=parseModel(window.CATCHER_MODEL_DATA);
  const rimMat=standard(0xb9b5ce),innerMat=standard(0x79778f),wellMat=new THREE.MeshBasicMaterial({color:0x59566c});
  let i=0;
  for(let row=0;row<3;row++)for(let col=0;col<3;col++){
    const x=(col-1)*3.35,z=(row-1)*2.88;
    const well=mesh(new THREE.CircleGeometry(.95,64),wellMat,x,TOP+.005,z);well.rotation.x=-Math.PI/2;
    const rim=mesh(new THREE.TorusGeometry(1,.115,12,64),rimMat,x,TOP+.035,z);rim.rotation.x=-Math.PI/2;rim.receiveShadow=true;
    const lip=mesh(new THREE.TorusGeometry(.91,.045,8,56),innerMat,x,TOP+.018,z);lip.rotation.x=-Math.PI/2;
    const halo=mesh(new THREE.TorusGeometry(1.18,.045,8,56),new THREE.MeshBasicMaterial({color:0xffe78b,transparent:true,opacity:.95}),x,TOP+.075,z);halo.rotation.x=-Math.PI/2;halo.visible=false;
    const root=new THREE.Group();root.position.set(x,TOP-2.7,z);scene.add(root);
    const body=template.clone();body.userData.mole=i;root.add(body);root.visible=false;
    moles.push({id:i++,root,body,halo,x,z,state:'idle',born:0,duration:1,ready:0,yaw:0,hitAt:0});
  }
  // Small garden ornaments stay outside the nine clickable holes.
  const leafMat=standard(0x8dae7b),stemMat=standard(0x90a574),flowerMat=standard(0xffe9a2);
  [[-5.15,-4.15],[4.85,4.1],[-5,3.8],[5.0,-3.9]].forEach(([x,z],i)=>{
    mesh(new THREE.CylinderGeometry(.035,.045,.45,7),stemMat,x,TOP+.2,z);
    for(let k=0;k<2;k++){const leaf=mesh(new THREE.SphereGeometry(.17,8,6),leafMat,x+(k?-.12:.12),TOP+.18+k*.06,z);leaf.scale.set(1.4,.45,.7);leaf.rotation.z=k?-.5:.5;}
    const f=mesh(new THREE.SphereGeometry(.13,10,8),flowerMat,x,TOP+.48,z);f.scale.y=.6;
    for(let k=0;k<5;k++){const a=k/5*Math.PI*2;const p=mesh(new THREE.SphereGeometry(.105,8,6),i%2?standard(0xf0c3d1):flowerMat,x+Math.cos(a)*.14,TOP+.48,z+Math.sin(a)*.14);p.scale.y=.5;}
  });
  resize();new ResizeObserver(resize).observe(arena);
  loaded=true;start.disabled=false;start.textContent='게임 시작하기  →';
  window.catcherGame=Object.freeze({getState:()=>({phase,score,hits,spawned,misses,remaining:phase==='playing'?Math.max(0,DURATION-(performance.now()/1000-startTime)):phase==='ended'?0:DURATION,moles:moles.map(m=>{const p=new THREE.Vector3(m.x,m.root.position.y+1.7,m.z).project(camera),r=canvas.getBoundingClientRect();return {id:m.id,state:m.state,age:performance.now()/1000-m.born,duration:m.duration,screenX:r.left+(p.x+1)/2*r.width,screenY:r.top+(1-p.y)/2*r.height};})})});
  requestAnimationFrame(frame);
}
function resize(){
  if(!renderer)return;const w=arena.clientWidth,h=arena.clientHeight,aspect=w/h;
  const spanX=13.3,spanY=9.3;let halfH=Math.max(spanY/2,spanX/2/aspect);
  camera.left=-halfH*aspect;camera.right=halfH*aspect;camera.top=halfH;camera.bottom=-halfH;camera.updateProjectionMatrix();renderer.setSize(w,h,false);
}
function pop(m,now,demo=false){m.state='up';m.born=now;m.duration=rand(.85,2.05);m.yaw=rand(-.12,.12);m.root.rotation.set(0,m.yaw,0);m.root.scale.setScalar(1);m.root.visible=true;if(!demo)spawned++;}
function hideAll(){for(const m of moles){m.state='idle';m.root.visible=false;m.halo.visible=false;m.ready=0;}pointerPosition=null;hammerLockedUntil=0;hammer.classList.remove('target');}
function tickMoles(now){
  for(const m of moles){
    if(m.state==='up'){
      const t=(now-m.born)/m.duration;
      if(t>=1){m.state='idle';m.root.visible=false;m.ready=now+rand(.15,.6);if(phase==='playing'){misses++;streak=0;}continue;}
      let height=t<.18?1-Math.pow(1-t/.18,3):t>.71?Math.pow((1-t)/.29,1.4):1;
      m.root.position.y=TOP-2.65+height*2.65;
      m.root.rotation.y=m.yaw+Math.sin(t*9)*.035;
      const squash=t<.18?1-.04*Math.sin(t/.18*Math.PI):1;
      m.root.scale.set(1/squash,squash,1/squash);
    }else if(m.state==='hit'){
      if(now<m.hitAt)continue;
      const t=clamp((now-m.hitAt)/.28,0,1);m.root.position.y=m.hitY-Math.pow(t,1.6)*2.9;m.root.rotation.z=Math.sin(t*Math.PI)*.1;m.root.scale.set(1+Math.sin(t*Math.PI)*.09,1-Math.sin(t*Math.PI)*.12,1);
      if(t>=1){m.state='idle';m.root.visible=false;m.ready=now+.15;}
    }
  }
}
function schedule(now){
  if(now<nextSpawn)return;
  const active=moles.filter(m=>m.state==='up').length;
  const choices=moles.filter(m=>m.state==='idle'&&m.ready<=now);
  if(choices.length&&active<(phase==='playing'?4:2))pop(choices[Math.floor(Math.random()*choices.length)],now,phase!=='playing');
  nextSpawn=now+rand(phase==='playing'?.22:.65,phase==='playing'?.47:1.1);
}
function animateClass(el,name){el.classList.remove(name);void el.offsetWidth;el.classList.add(name);}
function begin(){
  if(!loaded||phase==='playing'||phase==='countdown')return;
  unlockAudio();hideAll();clearEffects();score=hits=spawned=misses=streak=0;scoreEl.textContent='0';hitsEl.textContent='0';timeEl.textContent='30.0';fill.style.width='100%';fill.style.background='#9cbd7c';
  phase='countdown';countStart=performance.now()/1000;lastCount=-1;overlay.classList.add('off');$('countdown').hidden=false;$('announcer').textContent='3초 후 시작합니다.';
}
function play(now){phase='playing';startTime=now;nextSpawn=now+.12;$('countdown').hidden=true;arena.classList.add('playable');$('announcer').textContent='게임 시작! 30초 동안 디디씨를 클릭하세요.';tone(660,.14);}
function finish(){
  if(phase!=='playing')return;phase='ended';hideAll();arena.classList.remove('playable');hammer.style.visibility='hidden';timeEl.textContent='0.0';fill.style.width='0%';
  const isRecord=score>record;record=Math.max(record,score);try{localStorage.setItem('catcher_ddc_best_v1',String(record));}catch(_){}
  $('modal-title').textContent='30초, 수고했어요!';$('modal-desc').textContent=hits?'디디씨와 즐거운 시간을 보냈네요.':'다음에는 디디씨가 올라오면 톡!';document.querySelector('.modal-tag').textContent='TIME’S UP!';document.querySelector('.score-guide').hidden=true;document.querySelector('.score-guide').style.display='none';
  const r=$('result');r.hidden=false;r.replaceChildren();
  const big=document.createElement('div');big.className='final-score';big.append(document.createTextNode(score.toLocaleString('ko-KR')));const small=document.createElement('small');small.textContent='점';big.append(small);r.append(big);
  const details=document.createElement('div');details.className='details';details.textContent=`잡은 디디씨 ${hits}마리 · 평균 ${hits?Math.round(score/hits):0}점`;r.append(details);
  const best=document.createElement('div');best.className='record';best.textContent=`${isRecord?'✦ 새로운 최고 기록!':'최고 기록'} ${record.toLocaleString('ko-KR')}점`;r.append(best);
  start.textContent='한 번 더 도전하기  ↻';overlay.classList.remove('off');$('announcer').textContent=`게임 종료. ${score}점, 디디씨 ${hits}마리.`;tone(523,.2);setTimeout(()=>tone(659,.2),130);nextSpawn=performance.now()/1000+1;
}
function burst(m,now){
  const base=new THREE.Vector3(m.x,Math.max(TOP+.7,m.root.position.y+1.9),m.z);
  for(let i=0;i<18;i++){
    const size=rand(.065,.135);const p=mesh(new THREE.BoxGeometry(size,size,size),standard(i%3===0?0xffed9a:0xffd85a,.5),base.x,base.y,base.z);p.castShadow=false;
    particles.push({mesh:p,born:now,life:rand(.45,.8),v:new THREE.Vector3(rand(-2.7,2.7),rand(2,4.6),rand(-2.3,2.3)),spin:new THREE.Vector3(rand(-6,6),rand(-6,6),rand(-6,6))});
  }
  const ring=mesh(new THREE.TorusGeometry(.35,.025,5,32),new THREE.MeshBasicMaterial({color:0xffdf69,transparent:true,opacity:1}),base.x,base.y,base.z);ring.rotation.copy(camera.rotation);rings.push({mesh:ring,born:now});
}
function floatScore(x,y,points){const node=document.createElement('div');node.className='floating'+(points===100?' perfect':'');node.style.left=x+'px';node.style.top=y+'px';if(points===100){const small=document.createElement('small');small.textContent='PERFECT!';node.append(small);}node.append(document.createTextNode('+'+points));$('float-layer').append(node);setTimeout(()=>node.remove(),900);}
// Pick in screen space: a forgiving visible body area plus the balloon head's
// footprint. The same target selection drives the hover halo and the strike.
function hitZone(m,rect){
  const box=m.body.geometry.boundingBox.clone().applyMatrix4(m.body.matrixWorld);
  if(box.max.y<=TOP+.015)return null;
  box.min.y=Math.max(box.min.y,TOP+.015);
  let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
    const p=new THREE.Vector3(x,y,z).project(camera);
    const sx=rect.left+(p.x+1)*.5*rect.width,sy=rect.top+(1-p.y)*.5*rect.height;
    left=Math.min(left,sx);right=Math.max(right,sx);top=Math.min(top,sy);bottom=Math.max(bottom,sy);
  }
  // Even a peeking face is a comfortable target for small hands.
  const cx=(left+right)/2,cy=(top+bottom)/2;
  const halfW=Math.max((right-left)/2,20),halfH=Math.max((bottom-top)/2,20);
  return {left:cx-halfW,right:cx+halfW,top:cy-halfH,bottom:cy+halfH,cx,cy};
}
function pickTarget(x,y,now,rect=canvas.getBoundingClientRect()){
  scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  const size=hammer.getBoundingClientRect();
  // This matches the SVG balloon head: wide and soft, not a single-pixel ray.
  const rx=Math.max(28,size.width*.46),ry=Math.max(22,size.height*.18);
  let chosen=null,best=Infinity;
  for(const m of moles){
    if(m.state!=='up'||!m.root.visible||now-m.born>=m.duration)continue;
    const z=hitZone(m,rect);if(!z)continue;
    const dx=Math.max(z.left-x,0,x-z.right),dy=Math.max(z.top-y,0,y-z.bottom);
    if((dx/rx)**2+(dy/ry)**2>1)continue;
    // Overlapping assistance areas choose the closest visible character.
    const distance=((x-z.cx)/Math.max(30,(z.right-z.left)/2))**2+((y-z.cy)/Math.max(30,(z.bottom-z.top)/2))**2;
    if(distance<best){best=distance;chosen=m;}
  }
  return chosen;
}
function positionHammer(x,y){hammer.style.transform=`translate(${x}px, ${y}px)`;hammer.style.visibility='visible';}
function updateAim(now){
  for(const m of moles)m.halo.visible=false;
  if(phase!=='playing'||!pointerPosition)return;
  if(now<hammerLockedUntil)return;
  positionHammer(pointerPosition.x,pointerPosition.y);
  const target=pickTarget(pointerPosition.x,pointerPosition.y,now);
  hammer.classList.toggle('target',!!target);
  if(target)target.halo.visible=true;
}
function onStrike(e){
  if(e.button!==undefined&&e.button!==0)return;
  if(phase!=='playing')return;const now=performance.now()/1000;if(now-startTime>=DURATION){finish();return;}
  e.preventDefault();pointerPosition={x:e.clientX,y:e.clientY};positionHammer(e.clientX,e.clientY);
  // Briefly keep the head at the click position until contact, even when the
  // pointer moves quickly. A new click always starts its own swing immediately.
  hammerLockedUntil=now+HAMMER_IMPACT;
  animateClass(hammer,'swing');tone(160,.06,'sine',.025);
  const serial=++touchSerial;
  if(e.pointerType==='touch')setTimeout(()=>{if(serial===touchSerial)leavePointer();},330);
  const rect=canvas.getBoundingClientRect(),m=pickTarget(e.clientX,e.clientY,now,rect);
  if(!m){streak=0;return;}
  const fraction=clamp((now-m.born)/m.duration,0,.999999),points=100-Math.floor(fraction*10)*10;
  // Reserve immediately; sink only when the hammer reaches the aim circle.
  m.state='hit';m.hitAt=now+HAMMER_IMPACT;m.hitY=m.root.position.y;m.halo.visible=false;
  score+=points;hits++;streak++;
  scoreEl.textContent=score.toLocaleString('ko-KR');hitsEl.textContent=String(hits);$('gain').textContent='+'+points;animateClass($('gain'),'pop');animateClass(scoreEl,'bump');impactEffects.push({m,when:now+HAMMER_IMPACT,x:e.clientX-rect.left,y:e.clientY-rect.top,points});
  if(streak>=3&&streak%3===0){$('combo').textContent=`${streak}번 연속으로 톡!`;animateClass($('combo'),'show');}
}
function updatePointer(e){if(phase!=='playing')return;pointerPosition={x:e.clientX,y:e.clientY};if(performance.now()/1000>=hammerLockedUntil)positionHammer(e.clientX,e.clientY);}
function leavePointer(){pointerPosition=null;hammer.style.visibility='hidden';hammer.classList.remove('target');for(const m of moles)m.halo.visible=false;}
function clearEffects(){for(const p of [...particles,...rings]){scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();}particles=[];rings=[];impactEffects=[];$('float-layer').replaceChildren();$('combo').classList.remove('show');}
function effects(now,dt){
  for(let i=impactEffects.length-1;i>=0;i--){const q=impactEffects[i];if(now<q.when)continue;
    impactEffects.splice(i,1);burst(q.m,now);floatScore(q.x,q.y-16,q.points);
    tone(520+q.points*3,.12,'sine',.07);setTimeout(()=>tone(1000+q.points*2,.09,'sine',.04),55);
    const flash=document.createElement('span');flash.className='tap-ring';flash.style.left=q.x+'px';flash.style.top=q.y+'px';$('float-layer').append(flash);setTimeout(()=>flash.remove(),450);
  }
  for(let i=particles.length-1;i>=0;i--){const p=particles[i],age=now-p.born;if(age>=p.life){scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();particles.splice(i,1);continue;}p.v.y-=8*dt;p.mesh.position.addScaledVector(p.v,dt);p.mesh.rotation.x+=p.spin.x*dt;p.mesh.rotation.y+=p.spin.y*dt;p.mesh.rotation.z+=p.spin.z*dt;p.mesh.scale.setScalar(Math.max(0,1-age/p.life));}
  for(let i=rings.length-1;i>=0;i--){const p=rings[i],t=(now-p.born)/.38;if(t>=1){scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();rings.splice(i,1);}else{p.mesh.scale.setScalar(1+t*2.7);p.mesh.material.opacity=1-t;}}
}
function frame(ms){
  const now=ms/1000,dt=Math.min(now-lastFrame,.04);lastFrame=now;
  if(phase==='countdown'){
    const elapsed=now-countStart,n=COUNTDOWN-Math.floor(elapsed);
    if(n<=0)play(now);else if(n!==lastCount){lastCount=n;$('countdown').textContent=n;animateClass($('countdown'),'beat');tone(400,.09);}
  }
  if(phase==='playing'){
    const left=Math.max(0,DURATION-(now-startTime));timeEl.textContent=left.toFixed(1);fill.style.width=left/DURATION*100+'%';if(left<=5)fill.style.background='#e5a2b4';if(left<=0)finish();else schedule(now);
  }else if(phase==='ready')schedule(now);
  tickMoles(now);updateAim(now);effects(now,dt);renderer.render(scene,camera);requestAnimationFrame(frame);
}
function unlockAudio(){try{if(!audio)audio=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();}catch(_){}}
function tone(freq,seconds,type='sine',vol=.045){if(!sound||!audio||audio.state!=='running')return;try{const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime;o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(freq*.7,t+seconds);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+seconds);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+seconds+.02);}catch(_){}}
start.addEventListener('click',begin);canvas.addEventListener('pointerdown',onStrike);canvas.addEventListener('pointermove',updatePointer);canvas.addEventListener('pointerleave',leavePointer);canvas.addEventListener('pointercancel',leavePointer);window.addEventListener('blur',leavePointer);
$('sound').addEventListener('click',()=>{sound=!sound;$('sound').setAttribute('aria-pressed',String(sound));$('sound').setAttribute('aria-label',sound?'효과음 끄기':'효과음 켜기');$('sound').innerHTML='♪ <span>효과음 '+(sound?'켜짐':'꺼짐')+'</span>';if(sound){unlockAudio();tone(660,.1);}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&phase==='playing'&&performance.now()/1000-startTime>=DURATION)finish();});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();phase='error';arena.classList.remove('playable');hammer.style.visibility='hidden';overlay.classList.remove('off');$('modal-title').textContent='화면을 다시 불러와 주세요';$('modal-desc').textContent='3D 화면 연결이 끊겼어요. 새로고침 후 다시 시작해 주세요.';start.disabled=true;start.textContent='새로고침이 필요해요';});
try{init();}catch(error){console.error(error);$('modal-title').textContent='게임을 준비하지 못했어요';$('modal-desc').textContent=error.message;start.textContent='압축 해제 및 WebGL 설정을 확인해 주세요';start.disabled=true;}
})();
