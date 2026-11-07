// Canvas fallback uses the same Three.js scene, geometry and camera as WebGL.
// It is only selected if the browser cannot create a WebGL2 context.
import * as THREE from 'three';
export class SoftwareRenderer {
 constructor(canvas){this.domElement=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.shadowMap={};this.ratio=1;this.last=0;this.cache=new WeakMap();this.mvp=new THREE.Matrix4();this.view=new THREE.Matrix4();this.normalMatrix=new THREE.Matrix3();this.color=new THREE.Color();this.light=new THREE.Vector3(-.4,.85,.45).normalize();this.isSoftware=true;}
 setPixelRatio(r){this.ratio=Math.min(r,1.1);}
 setSize(w,h){this.w=w;this.h=h;this.domElement.width=Math.round(w*this.ratio);this.domElement.height=Math.round(h*this.ratio);}
 compileGeometry(g){const position=g.attributes.position,normal=g.attributes.normal,index=g.index;const triangles=[];const count=index?index.count:position.count;
 for(let i=0;i<count;i+=3){const ids=[0,1,2].map(j=>index?index.getX(i+j):i+j);const pts=ids.map(k=>[position.getX(k),position.getY(k),position.getZ(k)]);const n=normal?ids.reduce((a,k)=>[a[0]+normal.getX(k)/3,a[1]+normal.getY(k)/3,a[2]+normal.getZ(k)/3],[0,0,0]):[0,1,0];let mi=0;for(const gr of g.groups)if(i>=gr.start&&i<gr.start+gr.count){mi=gr.materialIndex;break;}triangles.push({pts,n,mi});}
 if(position.count>10000){
 const clusters=new Map(), step=.05;
 const key=(p,mi)=>mi+':'+p.map(v=>Math.round(v/step)).join(',');
 for(const f of triangles)for(const p of f.pts){const k=key(p,f.mi);let c=clusters.get(k);if(!c){c={p:[0,0,0],n:0};clusters.set(k,c);}c.n++;for(let j=0;j<3;j++)c.p[j]+=p[j];}
 for(const c of clusters.values())for(let j=0;j<3;j++)c.p[j]/=c.n;
 const reduced=[],seen=new Set();for(const f of triangles){const ks=f.pts.map(p=>key(p,f.mi));if(new Set(ks).size!==3)continue;const sig=[...ks].sort().join('|');if(seen.has(sig))continue;seen.add(sig);reduced.push({pts:ks.map(k=>clusters.get(k).p),n:f.n,mi:f.mi});}
 this.cache.set(g,reduced);return reduced;
 }
 this.cache.set(g,triangles);return triangles;}
 render(scene,camera){const now=performance.now();if(now-this.last<80)return;this.last=now;const ctx=this.ctx,w=this.w,h=this.h;if(!ctx||!w||!h)return;
 ctx.setTransform(this.ratio,0,0,this.ratio,0,0);ctx.fillStyle='#e6eddf';ctx.fillRect(0,0,w,h);
 scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);this.view.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
 const faces=[];scene.traverseVisible(o=>{if(!o.isMesh||o.userData.softwareHidden||o.material?.map)return;const geo=o.geometry,triangles=this.cache.get(geo)||this.compileGeometry(geo);this.mvp.multiplyMatrices(this.view,o.matrixWorld);const m=this.mvp.elements;this.normalMatrix.getNormalMatrix(o.matrixWorld);const nm=this.normalMatrix.elements;
 const mats=Array.isArray(o.material)?o.material:[o.material];const shades=mats.map(mat=>{const colors=[];for(let i=0;i<16;i++){const brightness=.68+i*.042;this.color.copy(mat.color||new THREE.Color('#ffffff')).multiplyScalar(brightness).convertLinearToSRGB();colors.push('#'+this.color.getHexString(THREE.LinearSRGBColorSpace));}return colors;});
 for(const f of triangles){const pts=f.pts.map(([x,y,z])=>{const iw=1/(m[3]*x+m[7]*y+m[11]*z+m[15]);return [(m[0]*x+m[4]*y+m[8]*z+m[12])*iw,(m[1]*x+m[5]*y+m[9]*z+m[13])*iw,(m[2]*x+m[6]*y+m[10]*z+m[14])*iw];});
 if(pts.every(p=>p[0]<-1)||pts.every(p=>p[0]>1)||pts.every(p=>p[1]<-1)||pts.every(p=>p[1]>1)||pts.some(p=>p[2]>1||p[2]<-1))continue;
 const material=mats[f.mi]||mats[0];if(!material||material.opacity===0)continue;
 const cross=(pts[1][0]-pts[0][0])*(pts[2][1]-pts[0][1])-(pts[1][1]-pts[0][1])*(pts[2][0]-pts[0][0]);if(material.side===THREE.FrontSide&&cross<0)continue;
 const [nx,ny,nz]=f.n;let x=nm[0]*nx+nm[3]*ny+nm[6]*nz,y=nm[1]*nx+nm[4]*ny+nm[7]*nz,z=nm[2]*nx+nm[5]*ny+nm[8]*nz;const l=Math.hypot(x,y,z)||1;const dot=Math.max(0,(x*this.light.x+y*this.light.y+z*this.light.z)/l);const shade=Math.floor(dot*15);
 faces.push({p:pts,z:(pts[0][2]+pts[1][2]+pts[2][2])/3,color:(shades[f.mi]||shades[0])[shade],opacity:material.transparent?material.opacity:1});
 }
 });
 faces.sort((a,b)=>b.z-a.z);
 for(const f of faces){ctx.globalAlpha=f.opacity;ctx.fillStyle=f.color;ctx.beginPath();ctx.moveTo((f.p[0][0]+1)*w/2,(1-f.p[0][1])*h/2);ctx.lineTo((f.p[1][0]+1)*w/2,(1-f.p[1][1])*h/2);ctx.lineTo((f.p[2][0]+1)*w/2,(1-f.p[2][1])*h/2);ctx.closePath();ctx.fill();}
 ctx.globalAlpha=1;
 // Canvas textures used for machine lettering can be projected as flat labels.
 scene.traverseVisible(o=>{if(!o.isMesh||!o.material?.map?.image||!o.geometry.parameters?.width)return;const v=o.getWorldPosition(new THREE.Vector3()).project(camera);if(Math.abs(v.x)>1||Math.abs(v.y)>1)return;const params=o.geometry.parameters;const pxPerUnit=h/(camera.top-camera.bottom);const iw=params.width*pxPerUnit,ih=params.height*pxPerUnit;ctx.drawImage(o.material.map.image,(v.x+1)*w/2-iw/2,(1-v.y)*h/2-ih/2,iw,ih);});
 }
}
