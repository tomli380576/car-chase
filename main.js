import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 3000);
camera.position.set(0, 0, 1000);
camera.up = new THREE.Vector3(0, 0, 1); // z is up
camera.lookAt(new THREE.Vector3(0, 0, 0));
camera.updateProjectionMatrix();
/*
    @param1 = 75 is FOV,
    @param2 is aspect ratio = width / height
    @param3 = 0.1 is near clipping plane, anything close than this will not be rendered
    @param4 = 3000 is far clipping plane, anything farther than this will not be rendered
*/

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setClearColor("#000000");
renderer.setSize(window.innerWidth, window.innerHeight);
camera.position.z = 55;

document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

window.addEventListener('keydown', (event) => {
  switch (event.key) {
    case 'ArrowUp': playerCar.position.x += 10; break
    case 'ArrowDown': playerCar.position.x -= 10; break
    case 'ArrowLeft': playerCar.position.y += 10; break
    case 'ArrowRight': playerCar.position.y -= 10; break
  }
});


const controls = new OrbitControls(camera, renderer.domElement);

// lights
const ambient_light = new THREE.AmbientLight(0xffffff, 0.9);
const direct_light = new THREE.DirectionalLight(0xffffff, 0.56);
scene.add(ambient_light, direct_light);

const playerCar = Car();
scene.add(playerCar);

// helpers
const grid = new THREE.GridHelper(1300, 50);
grid.geometry.rotateX(Math.PI / 2);
const axesHelper = new THREE.AxesHelper(300);
scene.add(grid, axesHelper);

// track
const trackRadius = 225;
const trackWidth = 45;
const innerTrackRadius = trackRadius - trackWidth;
const outerTrackRadius = trackRadius + trackWidth;

const arcAngle1 = (1 / 3) * Math.PI; // 60 degrees

const deltaY = Math.sin(arcAngle1) * innerTrackRadius;
const arcAngle2 = Math.asin(deltaY / outerTrackRadius);

const arcCenterX =
  (Math.cos(arcAngle1) * innerTrackRadius +
    Math.cos(arcAngle2) * outerTrackRadius) /
  2;

const arcAngle3 = Math.acos(arcCenterX / innerTrackRadius);

const arcAngle4 = Math.acos(arcCenterX / outerTrackRadius);

renderMap(900, 700);

// game logic

let ready, playerAngleMoved, score, lastTimestamp;
const scoreElem = document.getElementById("score");
let otherCars = [];



function Car() {
  const car = new THREE.Group();

  const backWheel = Wheel();
  backWheel.position.z = 6;
  backWheel.position.x = -18;

  const frontWheel = Wheel();
  frontWheel.position.z = 6;
  frontWheel.position.x = 18;

  const body = new THREE.Mesh(
    new THREE.BoxBufferGeometry(60, 30, 15),
    new THREE.MeshLambertMaterial({ color: 0xa52523 })
  )

  body.position.z = 12;

  const carFrontTexture = getCarFrontTexture();
  carFrontTexture.center = new THREE.Vector2(0.5, 0.5);
  carFrontTexture.rotation = Math.PI / 2;

  const carBackTexture = getCarFrontTexture();
  carBackTexture.center = new THREE.Vector2(0.5, 0.5);
  carBackTexture.rotation = -Math.PI / 2;

  const carLeftTextture = getCarSideTexture();
  carLeftTextture.center = new THREE.Vector2(0.5, 0.5);
  carLeftTextture.rotation = -Math.PI;


  const cabin = new THREE.Mesh(
    new THREE.BoxBufferGeometry(33, 24, 12),
    [ // Since this is a box, we can define the texture by literally putting an texture on each side
      new THREE.MeshLambertMaterial({ map: carFrontTexture }),
      new THREE.MeshLambertMaterial({ map: carBackTexture }),
      new THREE.MeshLambertMaterial({ map: carLeftTextture }),
      new THREE.MeshLambertMaterial({ map: getCarSideTexture() }),
      new THREE.MeshLambertMaterial({ color: 0xffffff }),
      new THREE.MeshLambertMaterial({ color: 0xffffff }),
    ]
  )

  cabin.position.x = -6
  cabin.position.z = 25.5

  car.add(backWheel, frontWheel, body, cabin);

  return car;
}

function Truck() {
  const truck = new THREE.Group();

  const backWheel = Wheel();
  backWheel.position.z = 6;
  backWheel.position.x = -18;

  const midWheel = Wheel();
  midWheel.position.z = 6;
  midWheel.position.x = 10;

  const frontWheel = Wheel();
  frontWheel.position.z = 6;
  frontWheel.position.x = 38;

  const cargo = new THREE.Mesh(
    new THREE.BoxBufferGeometry(60, 30, 40),
    new THREE.MeshLambertMaterial({ color: 0xffffff })
  )

  cargo.position.z = 12;

  truck.add(backWheel, midWheel, frontWheel, cargo);

  return truck;
}

function Wheel() {
  return new THREE.Mesh(
    new THREE.BoxBufferGeometry(12, 33, 12), // width, height, depth
    new THREE.MeshLambertMaterial({ color: 0x333333 })
  )
}

function getCarFrontTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 32;
  const context = canvas.getContext("2d");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, 64, 32); // draws a white base

  context.fillStyle = "#666666";
  context.fillRect(8, 8, 48, 24); // draws a smaller grey rect

  return new THREE.CanvasTexture(canvas);
}

function getCarSideTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 32;
  const context = canvas.getContext("2d");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, 128, 32);

  context.fillStyle = "#666666";
  context.fillRect(10, 8, 38, 24);
  context.fillRect(58, 8, 60, 24);

  return new THREE.CanvasTexture(canvas);
}

function renderMap(mapWidth, mapHeight) {
  const lineMarkingTexture = getLineMarking(mapWidth, mapHeight);

  const plane = new THREE.Mesh(
    new THREE.PlaneBufferGeometry(mapWidth, mapHeight),
    new THREE.MeshLambertMaterial({ map: lineMarkingTexture })
  )

  scene.add(plane);

  const islandLeft = getLeftIsland();
  const islandRight = getRightIsland();
  const islandMiddle = getMiddleIsland();
  const outerField = getOuterField(mapWidth, mapHeight);

  const field_geom = new THREE.ExtrudeBufferGeometry(
    [islandLeft, islandRight, islandMiddle, outerField],
    {
      depth: 6,
      bevelEnabled: false
    }
  )

  const field = new THREE.Mesh(
    field_geom,
    [
      new THREE.MeshLambertMaterial({ color: 0x67c240 }),
      new THREE.MeshLambertMaterial({ color: 0x23311c }),
    ]
  )

  scene.add(field);
}

function getLineMarking(mapWidth, mapHeight) {
  const canvas = document.createElement("canvas");
  canvas.width = mapWidth;
  canvas.height = mapHeight;
  const context = canvas.getContext("2d");

  context.fillStyle = 0x6e6e6e;
  context.fillRect(0, 0, mapWidth, mapHeight);

  context.lineWidth = 2;
  context.strokeStyle = "#E0FFFF";
  context.setLineDash([10, 14]);

  // left circle
  context.beginPath();
  context.arc(
    mapWidth / 2 - arcCenterX,
    mapHeight / 2,
    trackRadius,
    0,
    Math.PI * 2
  );
  context.stroke();

  // right circle
  context.beginPath();
  context.arc(
    mapWidth / 2 + arcCenterX, // arc center x is the center of the center
    mapHeight / 2,
    trackRadius,
    0,
    Math.PI * 2
  );
  context.stroke();

  return new THREE.CanvasTexture(canvas);
}

function getLeftIsland() {
  const islandLeft = new THREE.Shape();
  islandLeft.absarc(
    -arcCenterX,
    0,
    innerTrackRadius,
    arcAngle1,
    -arcAngle1,
    false
  )

  islandLeft.absarc(
    arcCenterX,
    0,
    outerTrackRadius,
    Math.PI + arcAngle2,
    Math.PI - arcAngle2,
    true
  )

  return islandLeft
}

function getMiddleIsland() {
  const islandMiddle = new THREE.Shape();

  islandMiddle.absarc(
    -arcCenterX,
    0,
    innerTrackRadius,
    arcAngle3,
    -arcAngle3,
    true
  );

  islandMiddle.absarc(
    arcCenterX,
    0,
    innerTrackRadius,
    Math.PI + arcAngle3,
    Math.PI - arcAngle3,
    true
  );

  return islandMiddle;
}

function getRightIsland() {
  const islandRight = new THREE.Shape();

  islandRight.absarc(
    arcCenterX,
    0,
    innerTrackRadius,
    Math.PI - arcAngle1,
    Math.PI + arcAngle1,
    true
  );

  islandRight.absarc(
    -arcCenterX,
    0,
    outerTrackRadius,
    -arcAngle2,
    arcAngle2,
    false
  );

  return islandRight;
}

function getOuterField(mapWidth, mapHeight) {
  console.log(mapWidth, mapHeight);

  const field = new THREE.Shape();

  field.moveTo(-mapWidth / 2, -mapHeight / 2);
  field.lineTo(0, -mapHeight / 2);

  field.absarc(
    -arcCenterX,
    0,
    outerTrackRadius,
    -arcAngle4,
    arcAngle4,
    true
  );

  field.absarc(
    arcCenterX,
    0,
    outerTrackRadius,
    Math.PI - arcAngle4,
    Math.PI + arcAngle4,
    true
  );

  field.lineTo(0, -mapHeight / 2);
  field.lineTo(mapWidth / 2, -mapHeight / 2);
  field.lineTo(mapWidth / 2, mapHeight / 2);
  field.lineTo(-mapWidth / 2, mapHeight / 2);

  return field;
}


function animate() {
  requestAnimationFrame(animate); // tells the browser we are ready, pass in a function
  renderer.render(scene, camera);
}

animate();