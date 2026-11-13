/* Water duel simulation: no rendering dependency. */
(function(root){'use strict';
class WaterArena{
 constructor(blocked=()=>false,clear=()=>true){this.blocked=blocked;this.clear=clear;this.events=[];this.serial=0;this.players=[{id:0,name:'핑크인간',spawn:{x:-3,z:-10,yaw:Math.PI/2}},{id:1,name:'DDC',spawn:{x:2,z:-10,yaw:-Math.PI/2}}];this.reset();}
 reset(){this.events.length=0;for(const p of this.players)Object.assign(p,{...p.spawn,wet:0,score:0,respawn:0,shield:0,cooldown:0,held:false,ball:null,moving:false});}
 press(id){const p=this.players[id];if(p.held)return;p.held=true;if(p.respawn>0||p.cooldown>0||p.ball)return;const dx=Math.sin(p.yaw),dz=Math.cos(p.yaw),offset=.78;let x=p.x+dx*offset,z=p.z+dz*offset;if(this.blocked(x,z,.13)){x=p.x;z=p.z;}p.ball={id:++this.serial,owner:id,x,z,dx,dz,age:0};this.events.push({type:'launch',owner:id});}
 release(id){const p=this.players[id];p.held=false;if(p.ball)this.burst(p,'release');}
 cancelShots(){for(const p of this.players){p.ball=null;p.held=false;}}
 burst(owner,reason){const b=owner.ball;if(!b)return;owner.ball=null;owner.cooldown=.32;const event={type:'splash',owner:owner.id,x:b.x,z:b.z,radius:2.65,reason,hits:[]};for(const p of this.players){if(p.id===owner.id||p.respawn>0||p.shield>0)continue;const distance=Math.hypot(p.x-b.x,p.z-b.z);if(distance>event.radius||!this.clear(b.x,b.z,p.x,p.z))continue;const amount=Math.round(46-22*distance/event.radius);p.wet=Math.min(100,p.wet+amount);event.hits.push({id:p.id,amount,x:p.x,z:p.z});if(p.wet>=100){p.respawn=2;p.shield=0;p.ball=null;owner.score++;this.events.push({type:'score',owner:owner.id,target:p.id});}}
 this.events.push(event);}
 facePlayer(player, dx, dz) {
  if (player.respawn <= 0 && (dx || dz)) {
   player.yaw = Math.atan2(dx, dz);
  }
 }

 movePlayer(player, dx, dz, dt, turn = true) {
  const length = Math.hypot(dx, dz);
  player.moving = false;
  if (!length || player.respawn > 0) return;

  dx /= length;
  dz /= length;
  if (turn) this.facePlayer(player, dx, dz);

  const speed = 3.8 * dt;
  const steps = Math.max(1, Math.ceil(speed / .08));
  const other = this.players[1 - player.id];
  const canMove = (x, z) => !this.blocked(x, z, .28) &&
    (other.respawn > 0 || Math.hypot(x - other.x, z - other.z) > .64);

  for (let i = 0; i < steps; i++) {
   const nextX = player.x + dx * speed / steps;
   if (canMove(nextX, player.z)) {
    player.x = nextX;
    player.moving = true;
   }
   const nextZ = player.z + dz * speed / steps;
   if (canMove(player.x, nextZ)) {
    player.z = nextZ;
    player.moving = true;
   }
  }
 }
 update(dt,moves=[{x:0,z:0},{x:0,z:0}]){dt=Math.min(Math.max(dt,0),.05);for(const p of this.players){p.cooldown=Math.max(0,p.cooldown-dt);p.shield=Math.max(0,p.shield-dt);if(p.respawn>0){p.respawn=Math.max(0,p.respawn-dt);p.moving=false;if(p.respawn===0){p.x=p.spawn.x;p.z=p.spawn.z;p.yaw=p.spawn.yaw;p.wet=0;p.shield=1.4;this.events.push({type:'respawn',id:p.id});}continue;}const move=moves[p.id];
 this.movePlayer(p,move?.x||0,move?.z||0,dt,move?.turn!==false);}
 for(const p of this.players){const b=p.ball;if(!b)continue;b.age+=dt;const distance=8.8*dt,steps=Math.max(1,Math.ceil(distance/.09));for(let i=0;i<steps;i++){const x=b.x+b.dx*distance/steps,z=b.z+b.dz*distance/steps;if(this.blocked(x,z,.13)){this.burst(p,'wall');break;}b.x=x;b.z=z;}if(p.ball&&b.age>=3.2)this.burst(p,'range');}}
 drain(){return this.events.splice(0);}
}
root.DDCWaterArena=WaterArena;if(typeof module!=='undefined'&&module.exports)module.exports=WaterArena;
})(typeof window!=='undefined'?window:globalThis);
