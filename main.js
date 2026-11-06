import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js';

const canvas = document.querySelector('#game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.13;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111d27);
scene.fog = new THREE.FogExp2(0x111d27, 0.0038);
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.08, 420);
scene.add(camera);
const clock = new THREE.Clock();
const world = new THREE.Group(); scene.add(world);

const COLORS = { asphalt:0x202a2d, concrete:0x525854, sidewalk:0x62615a, amber:0xe9b45f, ivory:0xe5e0d1 };
scene.add(new THREE.HemisphereLight(0x8eabc0, 0x20221e, 1.05));
const moon = new THREE.DirectionalLight(0x9eb7db, 1.7); moon.position.set(-70,100,35); scene.add(moon);
const cityGlow = new THREE.PointLight(0xe0a963, 52, 150, 2); cityGlow.position.set(-12,16,-24); scene.add(cityGlow);
const warmFill = new THREE.PointLight(0xffbf70, 24, 95, 2); warmFill.position.set(65,13,-75); scene.add(warmFill);
const mat = (color, roughness=.85, extra={}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });
const asphaltMat=mat(COLORS.asphalt), sidewalkMat=mat(COLORS.sidewalk), concreteMat=mat(COLORS.concrete), lineMat=mat(0xc3b795,.9,{emissive:0x40331e,emissiveIntensity:.28});
const boxGeo=new THREE.BoxGeometry(1,1,1);
function box(parent, x,y,z, sx,sy,sz, material, cast=false){ const m=new THREE.Mesh(boxGeo,material); m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=cast;m.receiveShadow=true;parent.add(m);return m; }
function plane(parent,x,y,z,sx,sz,material){const m=new THREE.Mesh(new THREE.PlaneGeometry(sx,sz),material);m.rotation.x=-Math.PI/2;m.position.set(x,y,z);parent.add(m);return m;}

// A compact, walkable downtown grid. Streets, towers, stoops and lights are all generated locally.
plane(world,0,-.19,0,330,330,mat(0x29302d));
for(let lane=-132;lane<=132;lane+=44){
  plane(world,lane,0,0,13,310,asphaltMat); plane(world,0,0,lane,310,13,asphaltMat);
  for(let offset=-132;offset<=132;offset+=44){
    // curb lips and short dashed lane dividers
    box(world,lane-7.15,.06,offset, .3,.16,13,sidewalkMat); box(world,lane+7.15,.06,offset,.3,.16,13,sidewalkMat);
    box(world,offset,.06,lane-7.15,13,.16,.3,sidewalkMat); box(world,offset,.06,lane+7.15,13,.16,.3,sidewalkMat);
    if(offset<132){box(world,lane, .014,offset+20, .12,.025,3.8,lineMat);box(world,offset+20,.014,lane,.12,.025,3.8,lineMat)}
  }
}
const buildingSolids=[]; const windowInstances=[];
const facadePalette=[0x444e4b,0x53504a,0x555f60,0x4c4946,0x535b54,0x4d565d,0x62584c,0x474b4d];
const windowDark=mat(0x25363b,.45,{metalness:.2}); const windowLit=mat(0xd8ae69,.38,{emissive:0xc88139,emissiveIntensity:1.35});
const windowGeometry=new THREE.BoxGeometry(1,1,.045);
const darkInst=new THREE.InstancedMesh(windowGeometry,windowDark,12000), litInst=new THREE.InstancedMesh(windowGeometry,windowLit,12000);darkInst.count=0;litInst.count=0;darkInst.instanceMatrix.setUsage(THREE.StaticDrawUsage);litInst.instanceMatrix.setUsage(THREE.StaticDrawUsage);
const dummy=new THREE.Object3D();
let windowDarkCount=0,windowLitCount=0;
function placeWindow(x,y,z,sx,sy,sz){dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();if(Math.random()<.30){litInst.setMatrixAt(windowLitCount++,dummy.matrix)}else{darkInst.setMatrixAt(windowDarkCount++,dummy.matrix)}}
for(let gx=-2;gx<=2;gx++)for(let gz=-2;gz<=2;gz++){
  const cx=gx*44+22,cz=gz*44+22;
  // Five small buildings per block make the streets feel like a lived-in old port city.
  for(let n=0;n<5;n++){
    const bx=cx+(n%2?7:-7)+(Math.random()-.5)*3, bz=cz+(n<2?-7:n>2?7:0)+(Math.random()-.5)*3;
    if(Math.hypot(bx,bz)<18) continue;
    const w=8+Math.random()*5,d=8+Math.random()*5,h=11+Math.random()*34;
    const color=facadePalette[Math.floor(Math.random()*facadePalette.length)];
    const facade=mat(color,.94), trim=mat(0x787263,.8);
    box(world,bx,h/2,bz,w,h,d,facade,true);buildingSolids.push({minX:bx-w/2-1,maxX:bx+w/2+1,minZ:bz-d/2-1,maxZ:bz+d/2+1});
    box(world,bx,h+.08,bz,w+.35,.2,d+.35,trim);
    // Vertical rows of windows on the four street-facing walls
    const cols=Math.floor(w/2.1), rows=Math.floor((h-3)/3.2);
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
      const yy=2.2+row*3.1, xx=bx-w/2+(col+.5)*w/cols;
      placeWindow(xx,yy,bz-d/2-.035,1.05,1.4,.05);placeWindow(xx,yy,bz+d/2+.035,1.05,1.4,.05);
    }
    const sideCols=Math.floor(d/2.3);
    for(let row=0;row<rows;row++)for(let col=0;col<sideCols;col++){
      const yy=2.2+row*3.1, zz=bz-d/2+(col+.5)*d/sideCols;
      placeWindow(bx-w/2-.035,yy,zz,.05,1.4,1.05);placeWindow(bx+w/2+.035,yy,zz,.05,1.4,1.05);
    }
    // Ground-floor storefront, awning, and one warm sign.
    if(Math.random()<.7){const awning=mat([0x8e493b,0x6a7263,0x9d764d,0x4d6265][Math.floor(Math.random()*4)]);box(world,bx,2.25,bz-d/2-.55,w*.82,.28,.8,awning);box(world,bx,1.35,bz-d/2-.08,w*.62,1.8,.12,mat(0x252a28,.35,{emissive:0x73532f,emissiveIntensity:.36}));}
  }
}
darkInst.count=windowDarkCount;litInst.count=windowLitCount;world.add(darkInst,litInst);

// Street lamps provide warm pools of light and a recognizable avenue rhythm.
const lampMat=mat(0x222a29,.55,{metalness:.55}), lampGlow=mat(0xf2c57d,.25,{emissive:0xffae55,emissiveIntensity:2});
for(let street=-132;street<=132;street+=44)for(let along=-110;along<=110;along+=22){
  for(const side of [-1,1]){
    const x=street+side*7.9,z=along;
    if(Math.abs(x)<4&&Math.abs(z)<4)continue;
    box(world,x,2.8,z,.12,5.6,.12,lampMat);box(world,x+side*.85,5.45,z,.12,.12,.12,lampMat);box(world,x+side*1.35,5.3,z,.9,.16,.35,lampGlow);
  }
}
// Planters, trees and benches add quieter neighborhood corners.
const trunkMat=mat(0x554435),leafMat=mat(0x40584c);for(let bx=-110;bx<=110;bx+=44)for(let bz=-110;bz<=110;bz+=44){for(const sx of [-1,1])for(const sz of [-1,1]){const x=bx+sx*7.9,z=bz+sz*7.9;box(world,x,.65,z,2,.8,2,mat(0x4b514a));box(world,x,2.0,z,.32,2.6,.32,trunkMat);const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(1.35,1),leafMat);crown.position.set(x,3.4,z);crown.scale.set(1,1.25,1);world.add(crown);}}

// Road furniture: crosswalk bars, a bus shelter and a payphone near the first pickup.
const stripeMat=mat(0xbab5a5,.9,{emissive:0x39362d,emissiveIntensity:.18});
for(const center of [-88,-44,0,44,88])for(let i=-4;i<=4;i++){
  box(world,i*1.05,.025,center-5.3,.62,.03,2.2,stripeMat);box(world,center-5.3,.025,i*1.05,2.2,.03,.62,stripeMat);
}
const phone=new THREE.Group();phone.position.set(3,0,-30);world.add(phone);box(phone,0,.8,0,.4,1.6,.26,mat(0x293c3d));box(phone,0,1.35,-.15,.47,.42,.1,mat(0xd0a250,.4,{emissive:0x74501d,emissiveIntensity:.45}));box(phone,0,.65,-.18,.24,.28,.1,mat(0x151b1b));
box(world,-4,1.4,-30,3,2.8,.18,mat(0x26302f));box(world,-4,2.9,-30,3.2,.16,.28,mat(0xb4804c));box(world,-5.3,.7,-30,.13,1.4,.15,lampMat);box(world,-2.7,.7,-30,.13,1.4,.15,lampMat);

// Player vehicle — the exterior is rendered on foot; a minimal dashboard stays in view while driving.
const car=new THREE.Group();world.add(car);car.position.set(0,.15,-5.5);
const carBodyMat=mat(0x738477,.36,{metalness:.35}), carGlass=mat(0x142329,.25,{metalness:.2}), tireMat=mat(0x141718,.9), chrome=mat(0xb7b9ac,.35,{metalness:.65});
const carBody=box(car,0,.53,0,2.0,.62,4.0,carBodyMat,true);box(car,0,.96,.18,1.65,.72,1.85,carGlass,true);box(car,0,.6,-1.35,1.8,.45,1.05,carBodyMat,true);box(car,0,.6,1.4,1.8,.42,1.05,carBodyMat,true);
for(const x of [-.97,.97])for(const z of [-1.32,1.32]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.39,.39,.22,16),tireMat);wheel.rotation.z=Math.PI/2;wheel.position.set(x,.34,z);car.add(wheel);const hub=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,.23,12),chrome);hub.rotation.z=Math.PI/2;hub.position.copy(wheel.position);car.add(hub);}
for(const x of [-.63,.63]){box(car,x,.63,-2.025,.4,.18,.03,mat(0xf5c774,.25,{emissive:0xff9d42,emissiveIntensity:1.7}));box(car,x,.67,2.025,.4,.18,.03,mat(0x9c4639,.25,{emissive:0x58170e,emissiveIntensity:.7}));}
const dashboard=new THREE.Group();camera.add(dashboard);box(dashboard,0,-.58,-.82,1.5,.23,.55,mat(0x151b1c,.65));box(dashboard,0,-.72,-1.15,1.4,.19,1.0,mat(0x303936,.65));box(dashboard,0,-.55,-1.03,.44,.12,.04,mat(0x91aa87,.3,{emissive:0x405941,emissiveIntensity:.8}));
const wheelMesh=new THREE.Mesh(new THREE.TorusGeometry(.3,.045,8,24),mat(0x171b1b,.6));wheelMesh.position.set(.0,-.48,-.64);wheelMesh.rotation.z=0;dashboard.add(wheelMesh);
const hood=box(dashboard,0,-.7,-2.35,1.55,.14,1.45,carBodyMat);hood.position.y=-.83;dashboard.visible=false;

// Moving traffic follows the cross streets, giving the town a pulse without blocking play.
const traffic=[];const trafficColors=[0x8a5141,0x687a81,0xa18b69,0x384d4f,0x8d8a78];
for(let i=0;i<8;i++){
 const g=new THREE.Group();const c=mat(trafficColors[i%trafficColors.length],.42,{metalness:.25});box(g,0,.52,0,1.8,.55,3.5,c);box(g,0,.88,.15,1.42,.5,1.6,carGlass);
 for(const x of [-.9,.9])for(const z of [-1.1,1.1]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.2,12),tireMat);w.rotation.z=Math.PI/2;w.position.set(x,.28,z);g.add(w)}
 const lane=-88+(i%5)*44;g.position.set(-145+(i*29)%280,.03,lane+(i%2?2.3:-2.3));g.rotation.y=i%2?0:Math.PI;world.add(g);traffic.push({group:g,speed:5+(i%4)*1.5,direction:i%2?1:-1});
}

// Distinctive amber beacon and ring for the current objective.
const marker=new THREE.Group();world.add(marker);
const beaconMat=new THREE.MeshBasicMaterial({color:0xf2b65d,transparent:true,opacity:.22,depthWrite:false});const beacon=new THREE.Mesh(new THREE.CylinderGeometry(.5,.95,17,20,1,true),beaconMat);beacon.position.y=8.5;marker.add(beacon);
const ringMat=new THREE.MeshBasicMaterial({color:0xf7c46f,transparent:true,opacity:.9});const ring=new THREE.Mesh(new THREE.TorusGeometry(1.15,.07,8,32),ringMat);ring.rotation.x=Math.PI/2;ring.position.y=.2;marker.add(ring);
const diamond=new THREE.Mesh(new THREE.OctahedronGeometry(.52,0),new THREE.MeshBasicMaterial({color:0xffd385}));diamond.position.y=2.3;marker.add(diamond);
const beaconLight=new THREE.PointLight(0xe7a649,7,30,2);marker.add(beaconLight);

const player={x:3,z:2,yaw:0,pitch:0,height:1.68,car:false};
camera.position.set(player.x,player.height,player.z);
let vehicleSpeed=0, wallet=1250, rep=1, missionStage=0, missionIndex=1, objectiveType='pickup', target={x:3,z:-30};
const deliveryStops=[{x:44,z:-44,name:'EAST MARKET',title:'Last-mile delivery'},{x:-44,z:-88,name:'CANAL STREET',title:'A package for Jo'},{x:88,z:0,name:'GRAND AVENUE',title:'One final stop'}];
let currentDelivery=0, started=false, toastTimer=0, audioOn=false, audioContext=null;
const $=s=>document.querySelector(s);
function setTarget(x,z){target={x,z};marker.position.set(x,0,z);}
setTarget(target.x,target.z);
function updateMissionUI(){
 const title=objectiveType==='pickup'?'A quick favor':deliveryStops[currentDelivery].title;
 $('#mission-title').textContent=title;$('#mission-copy').textContent=objectiveType==='pickup'?'Pick up the envelope at the payphone.':'Take the envelope to the marked drop-off.';
 $('#mission-state').textContent=objectiveType==='pickup'?'NEXT · OLD TOWN':'DELIVER · '+deliveryStops[currentDelivery].name;
 $('#objective-text').textContent=objectiveType==='pickup'?'Find the payphone':'Deliver the envelope';
 $('#mission-reward').textContent='+$'+(objectiveType==='pickup'?'250':'500');$('#run-count').textContent=String(missionIndex).padStart(2,'0')+' / 03';
 $('#progress-fill').style.width=objectiveType==='pickup'?'28%':'68%';
}
function showToast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');toastTimer=2.6;}
function updateWallet(){ $('#wallet').textContent='$'+wallet.toLocaleString('en-US');$('#rep').textContent=String(rep).padStart(2,'0'); }
function completeObjective(){
 if(objectiveType==='pickup'){
  wallet+=250;objectiveType='delivery';const stop=deliveryStops[currentDelivery];setTarget(stop.x,stop.z);showToast('ENVELOPE SECURED · NOW MAKE THE DROP');
 }else{
  wallet+=500;rep++;currentDelivery++;missionIndex++;
  if(currentDelivery>=deliveryStops.length){currentDelivery=0;missionIndex=1;showToast('RUN COMPLETE · THE CITY KNOWS YOUR NAME');}
  objectiveType='pickup';setTarget(3,-30);showToast('DELIVERY COMPLETE · +$500');
 }
 updateMissionUI();updateWallet();
}
updateMissionUI();updateWallet();

function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));}
addEventListener('resize',resize);

const keys=new Set(), touchKeys=new Set();
addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='KeyE')interact();if(e.code==='Escape')document.exitPointerLock?.();});
addEventListener('keyup',e=>keys.delete(e.code));
function isDown(...codes){return codes.some(code=>keys.has(code)||touchKeys.has(code));}
function collides(x,z,r=.48){if(Math.abs(x)>153||Math.abs(z)>153)return true;for(const b of buildingSolids)if(x+r>b.minX&&x-r<b.maxX&&z+r>b.minZ&&z-r<b.maxZ)return true;return false;}
function requestLook(){canvas.requestPointerLock?.();}
$('#start-screen').addEventListener('click',()=>{started=true;$('#start-screen').classList.add('hidden');requestLook();showToast('WELCOME TO PORTSIDE · FIND THE PAYPHONE');});
canvas.addEventListener('click',()=>{if(started&&!$('#help-panel').classList.contains('open'))requestLook();});
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas&&started&&!$('#help-panel').classList.contains('open')){player.yaw-=e.movementX*.0022;player.pitch=Math.max(-1.25,Math.min(1.15,player.pitch-e.movementY*.0018));}});
$('#help-btn').addEventListener('click',()=>{$('#help-panel').classList.toggle('open');document.exitPointerLock?.();});$('#close-help').addEventListener('click',()=>$('#help-panel').classList.remove('open'));
$('#audio-btn').addEventListener('click',()=>{audioOn=!audioOn;$('#audio-btn').style.color=audioOn?'#e3ac5e':'';$('#track-sub').textContent=audioOn?'CITY AMBIENCE · ON':'TALK RADIO · 98.6';if(audioOn&&!audioContext){try{audioContext=new AudioContext();}catch{}}if(audioContext)audioContext.resume();});

function enterCar(){player.car=true;vehicleSpeed=0;carBody.visible=false;for(const child of car.children)if(child!==carBody)child.visible=false;dashboard.visible=true;$('#car-hud').classList.add('active');$('#crosshair').style.opacity=0;showToast('VEHICLE READY · TAKE IT EASY');}
function exitCar(){player.car=false;carBody.visible=true;for(const child of car.children)child.visible=true;dashboard.visible=false;const side=new THREE.Vector3(1,0,0).applyAxisAngle(new THREE.Vector3(0,1,0),car.rotation.y);player.x=car.position.x+side.x*2.15;player.z=car.position.z+side.z*2.15;player.yaw=car.rotation.y;camera.rotation.set(player.pitch,player.yaw,0,'YXZ');$('#car-hud').classList.remove('active');$('#crosshair').style.opacity=.54;showToast('BACK ON FOOT');}
function interact(){if(!started)return;if(player.car){if(Math.abs(vehicleSpeed)<4)exitCar();return;}const distance=Math.hypot(player.x-car.position.x,player.z-car.position.z);if(distance<4.2){enterCar();return;}if(Math.hypot(player.x-target.x,player.z-target.z)<3.7){completeObjective();return;}showToast('NOTHING TO DO HERE');}
function updateInteraction(){if(!started||player.car){$('#interaction').classList.remove('active');return;}const carNear=Math.hypot(player.x-car.position.x,player.z-car.position.z)<4.2;const targetNear=Math.hypot(player.x-target.x,player.z-target.z)<3.7;if(carNear||targetNear){$('#interaction').classList.add('active');$('#interaction span').textContent=carNear?'Enter vehicle':(objectiveType==='pickup'?'Pick up envelope':'Make delivery');}else $('#interaction').classList.remove('active');}

// Touch controls are optional and only shown where a pointer is not available.
const mobile=matchMedia('(pointer:coarse)').matches;
if(mobile)$('#mobile-controls').classList.add('active');
for(const button of document.querySelectorAll('[data-control]')){
 const control=button.dataset.control;
 if(control==='look'){
  let lastX=0,lastY=0;button.addEventListener('pointerdown',e=>{lastX=e.clientX;lastY=e.clientY;button.setPointerCapture(e.pointerId)});
  button.addEventListener('pointermove',e=>{if(!e.buttons)return;player.yaw-=(e.clientX-lastX)*.009;player.pitch=Math.max(-1.1,Math.min(1.1,player.pitch-(e.clientY-lastY)*.008));lastX=e.clientX;lastY=e.clientY;});
  continue;
 }
 const map={forward:'KeyW',back:'KeyS',left:'KeyA',right:'KeyD'};const code=map[control];
 button.addEventListener('pointerdown',e=>{e.preventDefault();if(control==='action')interact();else touchKeys.add(code);});
 for(const ev of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(ev,()=>{if(code)touchKeys.delete(code)});
}

// Minimap is a clean hand-drawn street map with the current objective and player heading.
const mapCanvas=$('#minimap'),ctx=mapCanvas.getContext('2d');
function drawMap(){const w=mapCanvas.width,h=mapCanvas.height,s=w/330;ctx.clearRect(0,0,w,h);ctx.fillStyle='#192326';ctx.fillRect(0,0,w,h);ctx.fillStyle='#414845';for(let p=-132;p<=132;p+=44){const q=(p+165)*s;ctx.fillRect(q-3,0,6,h);ctx.fillRect(0,q-3,w,6);}ctx.strokeStyle='#8c8a7a';ctx.lineWidth=1;for(let p=-132;p<=132;p+=44){let q=(p+165)*s;ctx.beginPath();ctx.moveTo(q,0);ctx.lineTo(q,h);ctx.moveTo(0,q);ctx.lineTo(w,q);ctx.stroke();}const tx=(target.x+165)*s,tz=(target.z+165)*s;ctx.fillStyle='#efb95d';ctx.beginPath();ctx.arc(tx,tz,4.5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#edb45d88';ctx.beginPath();ctx.arc(tx,tz,8,0,Math.PI*2);ctx.stroke();const px=((player.car?car.position.x:player.x)+165)*s,pz=((player.car?car.position.z:player.z)+165)*s;ctx.save();ctx.translate(px,pz);ctx.rotate(-player.yaw);ctx.fillStyle='#f4eee0';ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(5,5);ctx.lineTo(-5,5);ctx.closePath();ctx.fill();ctx.restore();}

const forward=new THREE.Vector3(), right=new THREE.Vector3();
function updatePlayer(dt){
 const f=(isDown('KeyW','ArrowUp')?1:0)-(isDown('KeyS','ArrowDown')?1:0), strafe=(isDown('KeyD','ArrowRight')?1:0)-(isDown('KeyA','ArrowLeft')?1:0);
 if(player.car){
  const accel=f>0?14:f<0?-10:0;vehicleSpeed+=accel*dt;vehicleSpeed*=Math.exp(-dt*(f?0.34:1.3));if(isDown('Space'))vehicleSpeed*=Math.exp(-dt*5.5);vehicleSpeed=THREE.MathUtils.clamp(vehicleSpeed,-7,26);
  const steer=(isDown('KeyA','ArrowLeft')?1:0)-(isDown('KeyD','ArrowRight')?1:0);car.rotation.y+=steer*dt*(.7+Math.abs(vehicleSpeed)*.035)*Math.sign(vehicleSpeed||1);
  const dx=-Math.sin(car.rotation.y)*vehicleSpeed*dt,dz=-Math.cos(car.rotation.y)*vehicleSpeed*dt;
  if(!collides(car.position.x+dx,car.position.z+dz,1.35)){car.position.x+=dx;car.position.z+=dz}else vehicleSpeed*=-.2;
  camera.position.set(car.position.x,car.position.y+1.52,car.position.z);camera.rotation.set(0,car.rotation.y,0,'YXZ');wheelMesh.rotation.z=Math.sin(clock.elapsedTime*8)*.04;$('#speed').textContent=String(Math.round(Math.abs(vehicleSpeed)*3.1)).padStart(3,'0');
 }else{
  camera.position.set(player.x,player.height,player.z);camera.rotation.set(player.pitch,player.yaw,0,'YXZ');
  const speed=isDown('ShiftLeft','ShiftRight')?9:5.2;forward.set(-Math.sin(player.yaw),0,-Math.cos(player.yaw));right.set(Math.cos(player.yaw),0,-Math.sin(player.yaw));
  const length=Math.hypot(f,strafe)||1;const dx=(forward.x*f+right.x*strafe)/length*speed*dt,dz=(forward.z*f+right.z*strafe)/length*speed*dt;
  if(!collides(player.x+dx,player.z,.42))player.x+=dx;if(!collides(player.x,player.z+dz,.42))player.z+=dz;
 }
 for(const t of traffic){t.group.position.x+=t.speed*t.direction*dt;if(t.group.position.x>150)t.group.position.x=-150;if(t.group.position.x< -150)t.group.position.x=150;}
 const dist=Math.hypot((player.car?car.position.x:player.x)-target.x,(player.car?car.position.z:player.z)-target.z);$('#distance').textContent=Math.round(dist)+' m';if(dist<3.4&&started){completeObjective();}
 updateInteraction();
}

let last=0;
function animate(now){requestAnimationFrame(animate);const dt=Math.min(.04,(now-last)/1000||0);last=now;clock.getDelta();if(started)updatePlayer(dt);marker.position.y=Math.sin(now*.002)*.14;diamond.rotation.y=now*.0008;ring.rotation.z=now*.00055;drawMap();renderer.render(scene,camera);}
requestAnimationFrame(animate);
