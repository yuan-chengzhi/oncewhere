import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const stage = document.querySelector('#stage');
const status = document.querySelector('#status');
const slider = document.querySelector('#yaw');
const original = document.querySelector('#original');
const mode = document.querySelector('#mode');
let isOriginal = false;
let mesh;
let renderer;
let metrics;

try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor('#0a1211');
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  stage.prepend(renderer.domElement);
  metrics = await fetch('metrics.json').then(r => r.json());
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(metrics.vertical_fov_deg, 1.6, 0.05, 100);
  const gltf = await new GLTFLoader().loadAsync('office-surface.glb');
  const materials = [];
  gltf.scene.traverse(object => {
    if (!object.isMesh) return;
    // Use the observed source color exactly; the lighting is already painted.
    // PBR relighting would not make this photographed surface a complete asset.
    object.material = new THREE.MeshBasicMaterial({ map: object.material.map, side: THREE.DoubleSide });
    materials.push(object.material);
    mesh = object;
  });
  scene.add(gltf.scene);
  const cut = await new GLTFLoader().loadAsync('office-surface-cut.glb');
  cut.scene.traverse(object => {
    if (!object.isMesh) return;
    object.material = new THREE.MeshBasicMaterial({ map: object.material.map, side: THREE.DoubleSide });
    materials.push(object.material);
  });
  cut.scene.visible = false;
  scene.add(cut.scene);
  const draw = () => {
    const degrees = Number(slider.value);
    const radians = THREE.MathUtils.degToRad(degrees);
    const focus = metrics.focus_depth;
    camera.position.set(Math.sin(radians) * focus, 0, -focus + Math.cos(radians) * focus);
    camera.lookAt(0, 0, -focus);
    renderer.render(scene, camera);
    document.querySelector('#angle').textContent = `${degrees}°`;
    status.textContent = isOriginal ? '原始插画 · 固定视角' : `实际几何渲染 · 转角 ${degrees}°${Math.abs(degrees) > 8 ? ' · 注意遮挡处的缺面与拉伸' : ''}`;
  };
  const resize = () => {
    renderer.setSize(stage.clientWidth, stage.clientHeight, false);
    camera.aspect = stage.clientWidth / stage.clientHeight;
    camera.updateProjectionMatrix();
    draw();
  };
  new ResizeObserver(resize).observe(stage);
  resize();
  slider.addEventListener('input', draw);
  mode.addEventListener('click', () => {
    isOriginal = !isOriginal;
    original.style.display = isOriginal ? 'block' : 'none';
    mode.setAttribute('aria-pressed', String(isOriginal));
    mode.textContent = isOriginal ? '回到空间实验' : '查看原始插画';
    draw();
  });
  for (const [id, value] of [['small', 4], ['large', 18], ['reset', 0]]) {
    document.querySelector(`#${id}`).addEventListener('click', () => {
      if (isOriginal) mode.click();
      slider.value = String(value);
      draw();
    });
  }
  document.querySelector('#wire').addEventListener('click', event => {
    const enabled = event.currentTarget.getAttribute('aria-pressed') !== 'true';
    event.currentTarget.setAttribute('aria-pressed', String(enabled));
    for (const material of materials) material.wireframe = enabled;
    draw();
  });
  document.querySelector('#cut').addEventListener('click', event => {
    const enabled = event.currentTarget.getAttribute('aria-pressed') !== 'true';
    event.currentTarget.setAttribute('aria-pressed', String(enabled));
    event.currentTarget.textContent = enabled ? '恢复连续表面' : '切开深度断层';
    gltf.scene.visible = !enabled;
    cut.scene.visible = enabled;
    draw();
  });
  document.querySelector('#metrics').textContent = `输入 ${metrics.input_size.join(' × ')}；CPU 8 线程，单次推理 ${metrics.inference_seconds_excluding_load} 秒（不含下载／载入）；${metrics.vertices.toLocaleString()} 顶点、${metrics.triangles.toLocaleString()} 三角形。这个数字只描述本次小模型与当前机器，不代表 MoGe-3 或其他设备性能。`;
  window.depthRoomReady = true;
} catch (error) {
  status.classList.add('error');
  status.textContent = `空间实验未能载入：${error.message}。可先阅读同目录结果截图。`;
  original.style.display = 'block';
  console.error(error);
}
