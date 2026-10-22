import * as THREE from 'three';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';
import {MTLLoader} from 'three/addons/loaders/MTLLoader.js';

import {SoftwareRenderer} from './software-renderer.js';

const $=id=>document.getElementById(id), clamp=THREE.MathUtils.clamp, mix=THREE.MathUtils.lerp;
const rand=(a,b)=>a+Math.random()*(b-a), smooth=t=>t*t*(3-2*t);
const canvas=$('game');
let renderer;
try { renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'}); }
catch(e){ renderer=new SoftwareRenderer(canvas);document.querySelector('.live').innerHTML='<i></i> LITE MODE'; }
renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
const scene=new THREE.Scene();scene.background=new THREE.Color('#e6eddf');
const camera=new THREE.OrthographicCamera(-10,10,7,-7,.1,130);
const mainCamera=new THREE.Vector3(10.8,13.4,21),topCamera=new THREE.Vector3(1,25,5.8),lookAt=new THREE.Vector3(.5,3.5,.1);
let isTop=false,zoomSpan=14.8;
camera.position.copy(mainCamera);camera.lookAt(lookAt);
scene.add(new THREE.HemisphereLight(0xf9ffef,0xa0ac90,2.5));
const keyLight=new THREE.DirectionalLight(0xfff8e9,3.2);keyLight.position.set(-5,15,9);keyLight.castShadow=true;
keyLight.shadow.mapSize.set(2048,2048);Object.assign(keyLight.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:.1,far:45});keyLight.shadow.normalBias=.035;keyLight.shadow.bias=-.0001;scene.add(keyLight);
const fill=new THREE.DirectionalLight(0xd4e6ff,1.6);fill.position.set(9,8,-5);scene.add(fill);
const mat=(color,roughness=.6,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const C={frame:mat('#315746',.4,.18),mint:mat('#b5d39b'),ivory:mat('#f2f1db'),floor:mat('#d4e8b8'),chrome:mat('#c9ded8',.25,.82),dark:mat('#244235',.5,.35),purple:mat('#aa8dce'),purpleDark:mat('#715595'),purpleLight:mat('#d7c6ed'),gold:mat('#dac273',.35,.4)};
const glass=new THREE.MeshPhysicalMaterial({color:'#deedca',transparent:true,opacity:.10,roughness:.12,depthWrite:false,side:THREE.DoubleSide});
function box(w,h,d,m,x,y,z,parent=scene){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function cylinder(r1,r2,h,m,x,y,z,parent=scene){const o=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,20),m);o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o;}
function rod(a,b,r,m,parent=scene){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),o=cylinder(r,r,av.distanceTo(bv),m,0,0,0,parent);o.position.copy(av).add(bv).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),bv.sub(av).normalize());return o;}
function label(text,w,h,color,bg,font=70){const c=document.createElement('canvas');c.width=512;c.height=128;const g=c.getContext('2d');if(bg){g.fillStyle=bg;g.fillRect(0,0,512,128);}g.fillStyle=color;g.font=`700 ${font}px Arial, sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(text,256,66);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const o=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}));return o;}
// The open front keeps the original character and the claw legible.
const FLOOR=1.05,TOP=7.35,HOME={x:-4.15,z:1.9},CHUTE={x:4.7,z:-1.45};
box(200,.12,200,mat('#e2eada'),0,-.28,0).userData.softwareHidden=true;
box(8.6,.72,6.65,C.frame,-1.25,.46,0);box(8.38,.24,6.4,C.ivory,-1.25,.91,0);
box(8.15,.12,6.15,C.floor,-1.25,1.02,0);
for(const x of [-5.45,2.95])for(const z of [-3.23,3.23]){box(.19,6.5,.19,C.frame,x,4,z);box(.28,.17,.28,C.gold,x,1.2,z);}
box(8.6,.25,.18,C.frame,-1.25,7.35,-3.23);box(8.6,.25,.18,C.frame,-1.25,7.35,3.23);box(.18,.25,6.65,C.frame,-5.45,7.35,0);box(.18,.25,6.65,C.frame,2.95,7.35,0);
box(8.6,.3,.34,C.ivory,-1.25,7.64,3.1);box(8.6,.3,.34,C.mint,-1.25,7.64,-3.1);
box(.2,.3,6.6,C.mint,-5.5,7.64,0);box(.2,.3,6.6,C.mint,3,7.64,0);
box(8.22,5.9,.06,glass,-1.25,4.2,-3.17).castShadow=false;
box(.06,5.9,6.25,glass,-5.4,4.2,0).castShadow=false;
box(8.25,.45,.11,C.mint,-1.25,1.28,-3.13);
box(.11,.45,6.2,C.mint,-5.35,1.28,0);
// Delicate floor grid and light strips.
const grid=new THREE.GridHelper(8,16,'#aec995','#c1d9a6');grid.position.set(-1.25,1.09,0);grid.scale.z=.75;grid.material.transparent=true;grid.material.opacity=.35;scene.add(grid);
const stripMat=new THREE.MeshBasicMaterial({color:'#edfdd0'});
box(7.7,.055,.07,stripMat,-1.25,7.12,-3);box(.07,.055,5.8,stripMat,-5.22,7.12,0);
const title=label('DDC CLAW CLUB',3.6,.52,'#2e523c',null,50);title.position.set(-1.4,7.65,3.285);scene.add(title);
const badge=label('GOOD LUCK  /  FREE PLAY',3.2,.36,'#e1edc8',null,31);badge.position.set(-1.25,.49,3.34);scene.add(badge);
for(let i=0;i<5;i++)cylinder(.035,.035,.09,C.gold,-2.8+i*.8,7.85,3.1);
// Purple collector: an open box above an open, visible rolling ramp.
const collector=new THREE.Group();scene.add(collector);
box(2.4,.18,2.1,C.purpleDark,4.7,2.64,-1.45,collector);
box(.17,1.0,2.1,C.purple,3.53,3.16,-1.45,collector);box(.17,1,2.1,C.purple,5.87,3.16,-1.45,collector);
box(2.4,1,.17,C.purple,4.7,3.16,-2.46,collector);
box(2.4,.3,.17,C.purpleLight,4.7,2.88,-.43,collector);
box(2.55,.11,.23,C.purpleLight,4.7,3.72,-2.46,collector);
box(.23,.11,2.2,C.purpleLight,3.53,3.72,-1.45,collector);box(.23,.11,2.2,C.purpleLight,5.87,3.72,-1.45,collector);
const slotLabel=label('DROP HERE',2.0,.35,'#fff8ff',null,47);slotLabel.position.set(4.7,3.32,-2.35);collector.add(slotLabel);
const slotArrow=label('↓',.45,.4,'#fff8ff',null,90);slotArrow.position.set(4.7,3.0,-.32);collector.add(slotArrow);
const trackPoints=[new THREE.Vector3(4.7,2.84,-1.55),new THREE.Vector3(4.7,2.48,-.3),new THREE.Vector3(4.7,1.25,1.2),new THREE.Vector3(4.7,.4,3.15),new THREE.Vector3(4.7,.35,3.8)];
const track=new THREE.CatmullRomCurve3(trackPoints);
// A ribbon surface between two rails, following the same path as the prize.
const vertices=[],indices=[];for(let i=0;i<=50;i++){const p=track.getPoint(i/50);vertices.push(p.x-.91,p.y,p.z,p.x+.91,p.y,p.z);if(i<50){let k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}}
const rampGeo=new THREE.BufferGeometry();rampGeo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));rampGeo.setIndex(indices);rampGeo.computeVertexNormals();
const ramp=new THREE.Mesh(rampGeo,new THREE.MeshStandardMaterial({color:'#d6c2ec',roughness:.5,side:THREE.DoubleSide}));ramp.receiveShadow=true;scene.add(ramp);
for(const side of [-1,1]){const railPoints=trackPoints.map(p=>new THREE.Vector3(p.x+side*.98,p.y+.25,p.z));const geo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(railPoints),40,.065,8,false);const rail=new THREE.Mesh(geo,C.purpleLight);rail.castShadow=true;scene.add(rail);}
box(2.65,.22,2.1,C.purpleDark,4.7,.15,4.2);box(.14,.45,2.1,C.purpleLight,3.43,.35,4.2);box(.14,.45,2.1,C.purpleLight,5.97,.35,4.2);box(2.65,.45,.13,C.purple,4.7,.35,5.2);
const prizeLabel=label('YOUR LITTLE JOY',2.25,.28,'#fcf7ff',null,35);prizeLabel.position.set(4.7,.39,5.28);scene.add(prizeLabel);
for(const [x,z] of [[3.55,-2.4],[5.8,-2.4],[5.8,-.5]])box(.1,2.5,.1,C.purpleDark,x,1.3,z);
// The XY carriage and cable are actual geometry rather than a painted overlay.
const railGroup=new THREE.Group();scene.add(railGroup);
for(const x of [-5,2.5])rod([x,7.05,-2.9],[x,7.05,2.9],.055,C.chrome);
const bridge=box(7.6,.16,.18,C.chrome,-1.25,7.02,HOME.z);
const carriage=box(.66,.28,.55,C.dark,HOME.x,6.99,HOME.z);
const wire=cylinder(.027,.027,1,C.dark,0,0,0);
const claw=new THREE.Group();scene.add(claw);
cylinder(.24,.27,.4,C.chrome,0,0,0,claw);cylinder(.3,.3,.09,C.gold,0,-.11,0,claw);
const clawLight=new THREE.Mesh(new THREE.SphereGeometry(.065,12,8),new THREE.MeshBasicMaterial({color:'#c7ff9a'}));clawLight.position.set(0,.09,.24);claw.add(clawLight);
const fingers=[];
for(let i=0;i<3;i++){
 const pivot=new THREE.Group();pivot.rotation.y=i*Math.PI*2/3;claw.add(pivot);
 const segments=[];for(let j=0;j<3;j++)segments.push(cylinder(.055,.06,1,C.chrome,0,0,0,pivot));
 const joint=new THREE.Mesh(new THREE.SphereGeometry(.09,12,8),C.dark);pivot.add(joint);fingers.push({pivot,segments,joint});
}
function poseClaw(closed){for(const f of fingers){const a=new THREE.Vector3(.19,-.12,0),b=new THREE.Vector3(mix(.72,.47,closed),-.56,0),c=new THREE.Vector3(mix(.81,.4,closed),-1.05,0),d=new THREE.Vector3(mix(.58,.14,closed),-1.19,0);const pts=[a,b,c,d];f.joint.position.copy(b);for(let j=0;j<3;j++){const u=pts[j],v=pts[j+1],o=f.segments[j];o.position.copy(u).add(v).multiplyScalar(.5);o.scale.y=u.distanceTo(v);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.clone().sub(u).normalize());}}}
// Floor crosshair: the circle marks the actual catching centre.
const aim=new THREE.Group();scene.add(aim);
const aimMat=new THREE.MeshBasicMaterial({color:'#43664d',transparent:true,opacity:.65,depthWrite:false});
const ring=new THREE.Mesh(new THREE.RingGeometry(.37,.4,48),aimMat);ring.rotation.x=-Math.PI/2;aim.add(ring);
for(const [x,z,w,d] of [[0,0,.24,.025],[0,0,.025,.24],[.56,0,.15,.025],[-.56,0,.15,.025],[0,.56,.025,.15],[0,-.56,.025,.15]])box(w,.008,d,aimMat,x,0,z,aim);
const beam=new THREE.Mesh(new THREE.CylinderGeometry(.002,.002,1,5),new THREE.MeshBasicMaterial({color:'#88a777',transparent:true,opacity:.22,depthWrite:false}));scene.add(beam);
// Read the supplied OBJ and MTL from a plain JS data file; file:// needs no fetch.
const materials=new MTLLoader().parse(window.DDC_MODEL.mtl,'');materials.preload();
const original=new OBJLoader().setMaterials(materials).parse(window.DDC_MODEL.obj);
original.rotation.x=-Math.PI/2;original.updateMatrixWorld(true);
const rawBounds=new THREE.Box3().setFromObject(original),rawSize=rawBounds.getSize(new THREE.Vector3()),rawCentre=rawBounds.getCenter(new THREE.Vector3());
// Bake the Z-up conversion and centring once, then share geometry across all dolls.
const dollTemplate=new THREE.Group();
original.traverse(o=>{if(!o.isMesh)return;const geo=o.geometry.clone();geo.applyMatrix4(o.matrixWorld);geo.translate(-rawCentre.x,-rawCentre.y,-rawCentre.z);geo.scale(1.52/rawSize.y,1.52/rawSize.y,1.52/rawSize.y);geo.computeVertexNormals();
 const sourceMats=Array.isArray(o.material)?o.material:[o.material];
 const converted=sourceMats.map(m=>new THREE.MeshStandardMaterial({color:m.color,roughness:.84,metalness:0,side:THREE.DoubleSide}));
 const mesh=new THREE.Mesh(geo,Array.isArray(o.material)?converted:converted[0]);mesh.castShadow=true;mesh.receiveShadow=true;dollTemplate.add(mesh);
});
const dollBounds=new THREE.Box3().setFromObject(dollTemplate),half=dollBounds.getSize(new THREE.Vector3()).multiplyScalar(.5);
const toys=[],celebrations=[],keys=new Set(),pointerKeys=new Map();
let elapsed=0,phase='aim',phaseTime=0,tries=0,wins=0,held=null,closed=0,lowerY=2.1,gripQuality=0,slipAt=Infinity,transportStart=null,releaseStart=null,toastUntil=0;
const pos=new THREE.Vector3(HOME.x,5.9,HOME.z),vel=new THREE.Vector2(),swing=new THREE.Vector2();
let audio=null,soundOn=false;
function beep(freq=600,duration=.08,type='sine',volume=.035){if(!soundOn)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const osc=audio.createOscillator(),gain=audio.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,audio.currentTime);gain.gain.setValueAtTime(volume,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+duration);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+duration);}catch{}}
function status(title,detail){$('status-title').textContent=title;$('status-detail').textContent=detail;}
function notify(text){$('toast').textContent=text;$('toast').classList.add('show');toastUntil=elapsed+2.4;}
function halfHeight(t){const e=new THREE.Matrix4().makeRotationFromQuaternion(t.mesh.quaternion).elements;return (Math.abs(e[1])*half.x+Math.abs(e[5])*half.y+Math.abs(e[9])*half.z)*t.scale;}
function newToy(x,z,index){const mesh=dollTemplate.clone(true),scale=rand(.91,1.05);mesh.scale.setScalar(scale);mesh.position.set(x,2,z);mesh.rotation.set(index%4===0?rand(-.18,.18):rand(-1.18,1.18),rand(-.5,.5),rand(-.42,.42));scene.add(mesh);const t={mesh,scale,v:new THREE.Vector3(),spin:new THREE.Vector3(),mode:'floor',bounces:0,rollTime:0,rollStart:0};mesh.position.y=FLOOR+halfHeight(t)+.025;toys.push(t);return t;}
function fillToys(){const positions=[[-4.25,-1.9],[-2.5,-1.9],[-.75,-1.85],[1.2,-1.8],[-4.25,.2],[-2.55,.12],[-.65,.1],[1.25,.3],[-4.15,2.0],[-2.3,1.9],[-.4,2.0],[1.4,2.0]];positions.forEach(([x,z],i)=>newToy(x+rand(-.18,.18),z+rand(-.17,.17),i));}
function setPhase(next){phase=next;phaseTime=0;const isAim=next==='aim';$('drop').disabled=!isAim;$('drop-label').textContent=isAim?'집게 내리기':'뽑는 중…';document.querySelectorAll('[data-dir]').forEach(b=>b.disabled=!isAim);$('reset').disabled=!isAim;['aim','grab','win'].forEach(s=>$('step-'+s).classList.toggle('current',s===(isAim?'aim':(['release','return'].includes(next)?'win':'grab'))));if(!isAim){keys.clear();pointerKeys.clear();vel.set(0,0);}}
function drop(){if(phase!=='aim')return;tries++;$('tries').textContent=String(tries).padStart(2,'0');const candidate=nearestToy(.91);lowerY=candidate?candidate.mesh.position.y+1.12:2.0;slipAt=Infinity;setPhase('lower');status('조심조심 내려가는 중…','집게가 인형을 만나면 자동으로 오므려요.');beep(350,.14);}
function nearestToy(radius){let found=null,best=radius;for(const t of toys){if(t.mode!=='floor')continue;const d=Math.hypot(t.mesh.position.x-pos.x,t.mesh.position.z-pos.z);if(d<best){best=d;found=t;}}return found;}
function grab(){const t=nearestToy(.78);if(t){const d=Math.hypot(t.mesh.position.x-pos.x,t.mesh.position.z-pos.z);gripQuality=clamp(1-d/.91,.1,1);const gripChance=.5+.48*gripQuality;
 if(Math.random()<gripChance){held=t;t.mode='held';t.offset=new THREE.Vector3(clamp(t.mesh.position.x-pos.x,-.35,.35),-1.07,clamp(t.mesh.position.z-pos.z,-.35,.35));t.gripRot=t.mesh.rotation.clone();const survival=.40+.46*gripQuality;slipAt=Math.random()<survival?Infinity:rand(.45,5.6);status('잡았어요! 버텨줄까요?','흔들림을 견디면 보라색 상자로 가져가요.');beep(700,.15);return;}
 t.v.set(rand(-.3,.3),.7,rand(-.3,.3));t.spin.set(rand(-.6,.6),rand(-.3,.3),rand(-.5,.5));}
 status('앗, 집게 사이로 빠졌어요.','조준 원의 가운데에 인형 몸통을 맞춰 보세요.');beep(210,.18);}
function letSlip(){if(!held)return;const t=held;held=null;t.mode='floor';t.v.set(rand(-.5,.5),-.4,rand(-.4,.4));t.spin.set(rand(-2,2),rand(-1,1),rand(-2,2));closed=.55;status('아슬아슬… 놓쳐버렸어요!','다음에는 조금 더 몸통 가운데를 노려 보세요.');notify('앗, 미끄러졌어요!');beep(160,.23,'triangle');}
function returnToAim(){pos.y=5.9;setPhase('aim');closed=0;if(toys.every(t=>t.mode!=='floor')){fillToys();notify('새 인형을 채웠어요!');}status('다시 한 번 도전해 볼까요?','방향 버튼 / 화살표로 이동 · SPACE로 집게 하강');}
function celebrate(t){wins++;$('wins').textContent=String(wins).padStart(2,'0');t.mode='rolling';t.rollTime=0;notify('디디씨 획득! ✳');status('보라 상자에 쏙! 성공이에요.','인형이 경사로를 따라 아래로 굴러 내려와요.');[700,880,1050,1400].forEach((f,i)=>setTimeout(()=>beep(f,.17,'sine'),i*100));for(let i=0;i<34;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.055,.10,.025),mat(['#b9df88','#c19ee0','#fff3bf','#93c5ab'][i%4]));m.position.set(CHUTE.x,4.25,CHUTE.z);scene.add(m);celebrations.push({mesh:m,v:new THREE.Vector3(rand(-2,2),rand(2.4,5),rand(-2,2)),life:rand(1.2,2)});}}
function updateClaw(dt){phaseTime+=dt;
 if(phase==='aim'){
 const dx=(keys.has('right')?1:0)-(keys.has('left')?1:0),dz=(keys.has('down')?1:0)-(keys.has('up')?1:0),len=Math.hypot(dx,dz)||1;
 const tx=dx/len*2.65,tz=dz/len*2.65;vel.x=mix(vel.x,tx,1-Math.exp(-dt*9));vel.y=mix(vel.y,tz,1-Math.exp(-dt*9));
 pos.x=clamp(pos.x+vel.x*dt,-4.85,2.15);pos.z=clamp(pos.z+vel.y*dt,-2.55,2.65);closed=mix(closed,0,dt*7);
 }else if(phase==='lower'){
 pos.y=Math.max(lowerY,pos.y-dt*1.7);if(pos.y<=lowerY+.001){setPhase('close');beep(440,.10);}
 }else if(phase==='close'){
 closed=clamp(phaseTime/.8,0,1);if(phaseTime>=.88){grab();setPhase('lift');}
 }else if(phase==='lift'){
 pos.y=Math.min(5.9,pos.y+dt*1.25);if(held&&phaseTime>slipAt)letSlip();
 if(pos.y>=5.9){if(held){transportStart=pos.clone();setPhase('carry');status('상자까지 천천히…','집게가 흔들리고 있어요. 끝까지 버텨줘!');}else{transportStart=pos.clone();setPhase('return');}}
 }else if(phase==='carry'){
 const t=clamp(phaseTime/3.1,0,1),s=smooth(t);pos.x=mix(transportStart.x,CHUTE.x,s);pos.z=mix(transportStart.z,CHUTE.z,s);
 // A sampled slip time gives the same random outcome at any frame rate.
 if(held&&phaseTime+2.9>slipAt&&t<.82)letSlip();
 if(!held){transportStart=pos.clone();setPhase('return');}else if(t===1){releaseStart=held.mesh.position.clone();setPhase('release');status('보라 상자에 넣는 중!','조금만 기다리면 인형이 굴러 내려와요.');}
 }else if(phase==='release'){
 closed=mix(1,0,clamp(phaseTime/.55,0,1));if(held&&phaseTime>.45){held.mode='tochute';held.v.set(0,-.15,0);held.spin.set(rand(-1,1),0,rand(-.5,.5));held=null;}
 if(phaseTime>1.5){transportStart=pos.clone();setPhase('return');}
 }else if(phase==='return'){
 const t=clamp(phaseTime/2.2,0,1),s=smooth(t);pos.x=mix(transportStart.x,HOME.x,s);pos.z=mix(transportStart.z,HOME.z,s);closed=mix(closed,0,dt*4);if(t===1)returnToAim();
 }
 // Pendulum lag, motor jitter and doll wobble are visible in all moving states.
 const moving=phase==='aim'?vel.length():(['carry','return'].includes(phase)?2.2:.4);
 swing.x=mix(swing.x,Math.sin(elapsed*3.2)*(.018+moving*.02),1-Math.exp(-dt*4));swing.y=mix(swing.y,Math.sin(elapsed*2.7+.7)*(.015+moving*.025),1-Math.exp(-dt*4));
 const jitter=(phase==='aim'?.025:.045);
 claw.position.set(pos.x+Math.sin(elapsed*4.3)*jitter,pos.y,pos.z+Math.sin(elapsed*3.7)*jitter);
 claw.rotation.set(swing.x,Math.sin(elapsed*1.5)*.06,swing.y);poseClaw(closed);
 carriage.position.x=pos.x;carriage.position.z=pos.z;bridge.position.z=pos.z;
 const length=6.83-pos.y;wire.position.set(claw.position.x,pos.y+length*.5+.16,claw.position.z);wire.scale.y=Math.max(.01,length-.2);
 aim.position.set(pos.x,1.105,pos.z);aim.visible=phase==='aim';aim.rotation.y=elapsed*.13;
 beam.position.set(pos.x,(pos.y+FLOOR)*.5,pos.z);beam.scale.y=Math.max(.01,pos.y-FLOOR);beam.visible=phase==='aim';
 if(held){const t=held,extra=1-gripQuality;t.mesh.position.copy(claw.position).add(t.offset);t.mesh.position.x+=Math.sin(elapsed*7)*(.025+extra*.07);t.mesh.rotation.set(t.gripRot.x+Math.sin(elapsed*5)*.13,t.gripRot.y+Math.sin(elapsed*3)*.14,t.gripRot.z+Math.sin(elapsed*4.5)*(.14+extra*.13));}
}
function updateToys(dt){for(const t of toys){const m=t.mesh;
 if(t.mode==='floor'){
 t.v.y-=9.8*dt;m.position.addScaledVector(t.v,dt);m.rotation.x+=t.spin.x*dt;m.rotation.y+=t.spin.y*dt;m.rotation.z+=t.spin.z*dt;
 const rest=FLOOR+halfHeight(t)+.018;
 if(m.position.y<rest){m.position.y=rest;if(t.v.y<-.7){t.v.y*=-.24;t.v.x+=rand(-.13,.13);t.v.z+=rand(-.13,.13);beep(110,.035,'triangle',.012);}else t.v.y=0;
 t.v.x*=Math.exp(-5*dt);t.v.z*=Math.exp(-5*dt);t.spin.multiplyScalar(Math.exp(-7*dt));}
 // Constrain dropped dolls to the playable bed, never behind the chute.
 if(m.position.x< -4.85||m.position.x>2.2){m.position.x=clamp(m.position.x,-4.85,2.2);t.v.x*=-.35;}
 if(m.position.z< -2.6||m.position.z>2.65){m.position.z=clamp(m.position.z,-2.6,2.65);t.v.z*=-.35;}
 }else if(t.mode==='tochute'){
 t.v.y-=8*dt;m.position.addScaledVector(t.v,dt);m.rotation.z+=dt*.7;
 if(m.position.y<3.48){m.position.set(CHUTE.x,3.48,CHUTE.z);celebrate(t);}
 }else if(t.mode==='rolling'){
 t.rollTime+=dt;const u=clamp(t.rollTime/2.9,0,1),p=track.getPoint(u);m.position.copy(p);m.position.y+=halfHeight(t)+.025;m.rotation.x=t.rollTime*4;m.rotation.z=Math.sin(t.rollTime*7)*.2;
 if(u===1){t.mode='prize';t.prizeSlot=(wins-1)%6;t.baseX=4.7+((t.prizeSlot%2)-.5)*.55;t.baseZ=3.95+Math.floor(t.prizeSlot/2)*.24;t.v.set(rand(-.15,.15),.8,.1);const old=toys.filter(v=>v.mode==='prize');if(old.length>6){old[0].mode='stored';old[0].mesh.visible=false;}}
 }else if(t.mode==='prize'){
 const k=1-Math.exp(-4*dt);m.position.x=mix(m.position.x,t.baseX,k);m.position.z=mix(m.position.z,t.baseZ,k);m.rotation.x=mix(m.rotation.x,Math.PI/2,k);m.rotation.z=mix(m.rotation.z,0,k);m.position.y=mix(m.position.y,.34+halfHeight(t),k);
 }
 }
 // Soft, bounded horizontal doll-to-doll contacts after a drop.
 for(let i=0;i<toys.length;i++)for(let j=i+1;j<toys.length;j++){const a=toys[i],b=toys[j];if(a.mode!=='floor'||b.mode!=='floor')continue;if(Math.abs(a.mesh.position.y-b.mesh.position.y)>.9)continue;const dx=b.mesh.position.x-a.mesh.position.x,dz=b.mesh.position.z-a.mesh.position.z,d=Math.hypot(dx,dz),r=.7;if(d>0&&d<r){const push=(r-d)*.5;a.mesh.position.x-=dx/d*push;a.mesh.position.z-=dz/d*push;b.mesh.position.x+=dx/d*push;b.mesh.position.z+=dz/d*push;}}
}
function reset(){if(phase!=='aim')return;for(const t of toys)scene.remove(t.mesh);toys.length=0;for(const c of celebrations){scene.remove(c.mesh);c.mesh.geometry.dispose();c.mesh.material.dispose();}celebrations.length=0;tries=wins=0;held=null;keys.clear();pointerKeys.clear();$('tries').textContent='00';$('wins').textContent='00';pos.set(HOME.x,5.9,HOME.z);vel.set(0,0);fillToys();status('어디를 잡아볼까요?','방향 버튼을 길게 눌러 집게를 움직여 주세요.');notify('새 게임을 시작했어요');}
const map={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'};
window.addEventListener('keydown',e=>{if(map[e.code]||e.code==='Space'){e.preventDefault();if(e.code==='Space'){if(!e.repeat)drop();}else if(phase==='aim')keys.add(map[e.code]);}});
window.addEventListener('keyup',e=>{if(map[e.code]){e.preventDefault();keys.delete(map[e.code]);}});
window.addEventListener('blur',()=>{keys.clear();pointerKeys.clear();});
document.addEventListener('visibilitychange',()=>{keys.clear();pointerKeys.clear();last=performance.now();});
document.querySelectorAll('[data-dir]').forEach(b=>{
 const d=b.dataset.dir;b.addEventListener('pointerdown',e=>{e.preventDefault();if(phase!=='aim')return;b.setPointerCapture(e.pointerId);pointerKeys.set(e.pointerId,d);keys.add(d);beep(380,.025,'sine',.014);});
 const release=e=>{pointerKeys.delete(e.pointerId);if(![...pointerKeys.values()].includes(d))keys.delete(d);};
 b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release);
 // Keyboard activation of a direction button makes a small precise nudge.
 b.addEventListener('click',e=>{if(e.detail===0&&phase==='aim'){const v={up:[0,-.22],down:[0,.22],left:[-.22,0],right:[.22,0]}[d];pos.x=clamp(pos.x+v[0],-4.85,2.15);pos.z=clamp(pos.z+v[1],-2.55,2.65);}});
});
$('drop').addEventListener('click',drop);$('reset').addEventListener('click',reset);
$('camera').addEventListener('click',()=>{isTop=!isTop;$('camera').querySelector('span').textContent=isTop?'정면에서 보기':'위에서 보기';$('camera').setAttribute('aria-pressed',String(isTop));beep(550,.06);});
$('sound').addEventListener('click',()=>{soundOn=!soundOn;$('sound').setAttribute('aria-pressed',String(soundOn));$('sound').querySelector('span').textContent=soundOn?'소리 켜짐':'소리 꺼짐';beep(850,.1);});
function resize(){const r=$('viewport').getBoundingClientRect(),a=r.width/r.height;renderer.setSize(r.width,r.height,false);zoomSpan=a<1.1?13.9:12.8;const h=Math.max(zoomSpan,15.8/a);camera.left=-h*a/2;camera.right=h*a/2;camera.top=h/2;camera.bottom=-h/2;camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe($('viewport'));
fillToys();resize();$('loading').remove();
let last=performance.now();
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.2);last=now;elapsed+=dt;let remaining=dt;while(remaining>0){const step=Math.min(remaining,.025);updateClaw(step);updateToys(step);remaining-=step;}
 const target=isTop?topCamera:mainCamera;camera.position.lerp(target,1-Math.exp(-dt*4));camera.lookAt(lookAt);
 for(let i=celebrations.length-1;i>=0;i--){const c=celebrations[i];c.life-=dt;c.v.y-=5*dt;c.mesh.position.addScaledVector(c.v,dt);c.mesh.rotation.x+=dt*4;c.mesh.rotation.z+=dt*3;if(c.life<=0){scene.remove(c.mesh);c.mesh.geometry.dispose();c.mesh.material.dispose();celebrations.splice(i,1);}}
 if(elapsed>toastUntil)$('toast').classList.remove('show');document.querySelectorAll('[data-dir]').forEach(b=>b.classList.toggle('active',keys.has(b.dataset.dir)));
 canvas.dataset.state=JSON.stringify({phase,tries,wins,held:!!held,position:pos.toArray().map(v=>+v.toFixed(2)),modelColors:[...new Set(dollTemplate.children.flatMap(o=>(Array.isArray(o.material)?o.material:[o.material]).map(m=>m.color.getHexString())))],toys:toys.map(t=>({mode:t.mode,p:t.mesh.position.toArray().map(v=>+v.toFixed(2))}))});renderer.render(scene,camera);
}
requestAnimationFrame(frame);
// Read-only diagnostics for QA; production controls use the UI and keyboard.
Object.defineProperty(window,'DDC_GAME',{get:()=>({phase,tries,wins,held:!!held,position:pos.toArray(),gripQuality,slipAt,model:{meshes:dollTemplate.children.length,materials:[...new Set(dollTemplate.children.flatMap(o=>(Array.isArray(o.material)?o.material:[o.material]).map(m=>m.color.getHexString())))],height:half.y*2},toys:toys.map(t=>({mode:t.mode,position:t.mesh.position.toArray()}))})});
