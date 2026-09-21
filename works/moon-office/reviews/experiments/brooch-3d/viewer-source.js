// Engineering probe, not production art. Original outline: src/objects.ts.
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function createBrooch() {
  const outline = 'M 164 31 C 111 13 48 41 34 100 C 17 163 63 213 124 215 C 164 216 195 191 208 156 C 175 171 140 160 121 138 C 93 104 111 53 164 31 Z';
  const svg = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${outline}"/></svg>`);
  const shape = SVGLoader.createShapes(svg.paths[0])[0];
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 7, bevelEnabled: true, bevelThickness: 1.5,
    bevelSize: 1.3, bevelSegments: 3, curveSegments: 24,
  });
  geometry.translate(-120, -120, -3.5);
  geometry.scale(0.012, -0.012, 0.012);

  const root = new THREE.Group();
  root.name = 'brooch';
  const metal = new THREE.MeshStandardMaterial({
    color: 0xa4b0a2, metalness: 0.65, roughness: 0.35,
  });
  const moon = new THREE.Mesh(geometry, metal);
  moon.name = 'moon_body';
  root.add(moon);

  // Separate nodes demonstrate editable parts. The pin has no hinge yet.
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.75, 12), metal);
  pin.position.set(-0.52, 0.05, -0.1);
  pin.name = 'hinged_pin';
  root.add(pin);
  const socket = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.26, 0.075), metal);
  socket.position.set(-0.35, -0.65, -0.12);
  socket.name = 'socket';
  root.add(socket);
  return root;
}

async function main() {
  const stage = document.querySelector('#stage');
  const status = document.querySelector('#status');
  const angle = document.querySelector('#angle');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#142526');
  const camera = new THREE.PerspectiveCamera(40, 4 / 3, 0.01, 100);
  camera.position.set(0, 0.1, 5);
  camera.lookAt(0, 0, 0);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  stage.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', '可拖动旋转的胸针形体模型');
  scene.add(new THREE.HemisphereLight(0xfff1ca, 0x1e414d, 3));
  const warm = new THREE.DirectionalLight(0xffdab0, 5);
  warm.position.set(-2, 3, 4);
  scene.add(warm);
  const cool = new THREE.DirectionalLight(0x83becf, 2);
  cool.position.set(3, 1, -3);
  scene.add(cool);

  // Recreate the original in-memory export/import experiment. No network fetch.
  const exported = await new GLTFExporter().parseAsync(createBrooch(), { binary: true });
  const gltf = await new GLTFLoader().parseAsync(exported, '');
  const model = gltf.scene;
  scene.add(model);
  const names = [];
  model.traverse(object => { if (object.name) names.push(object.name); });

  function draw() {
    renderer.render(scene, camera);
    angle.value = String((((model.rotation.y * 180 / Math.PI) % 360) + 360) % 360);
  }
  function resize() {
    const { width, height } = stage.getBoundingClientRect();
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    draw();
  }
  new ResizeObserver(resize).observe(stage);

  let previous = null;
  renderer.domElement.addEventListener('pointerdown', event => {
    previous = [event.clientX, event.clientY];
    renderer.domElement.setPointerCapture(event.pointerId);
  });
  renderer.domElement.addEventListener('pointermove', event => {
    if (!previous) return;
    model.rotation.y += (event.clientX - previous[0]) * 0.012;
    model.rotation.x += (event.clientY - previous[1]) * 0.01;
    previous = [event.clientX, event.clientY];
    draw();
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    renderer.domElement.addEventListener(type, () => { previous = null; });
  }
  angle.addEventListener('input', () => {
    model.rotation.set(0, Number(angle.value) * Math.PI / 180, 0);
    draw();
  });
  for (const button of document.querySelectorAll('[data-angle]')) {
    button.addEventListener('click', () => {
      model.rotation.set(0, Number(button.dataset.angle) * Math.PI / 180, 0);
      draw();
    });
  }
  document.querySelector('#export').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([exported], { type: 'model/gltf-binary' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'brooch-probe.glb';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  window.broochProbe = {
    ready: true, bytes: exported.byteLength, names, threeRevision: THREE.REVISION,
    getRotation: () => model.rotation.toArray().slice(0, 3),
    exportBytes: () => Array.from(new Uint8Array(exported)),
  };
  status.textContent = `GLB 往返成功 · ${exported.byteLength.toLocaleString()} bytes · 三个独立部件`;
  resize();
}

main().catch(error => {
  document.querySelector('#status').textContent = `探针无法启动：${error.message}`;
  console.error(error);
});
