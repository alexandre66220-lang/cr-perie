import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ─── Constants ────────────────────────────────────────────
const IS_MOBILE   = window.innerWidth < 1024;
const FACE_ANGLES = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
const CIRC        = 2 * Math.PI * 17;   // SVG progress ring circumference

// Fade window: fully visible within ±20°, gone by ±50°
const FULL_RAD = (20 * Math.PI) / 180;
const FADE_RAD = (50 * Math.PI) / 180;

// ─── DOM refs ─────────────────────────────────────────────
const canvasEl      = document.getElementById('canvas');
const loaderEl      = document.getElementById('loader');
const sectionEl     = document.getElementById('scroll-section');
const scrollHintEl  = document.getElementById('scroll-hint');
const faceTextEls   = [...document.querySelectorAll('.face-text')];
const faceDotEls    = [...document.querySelectorAll('.face-nav__dot')];
const progressFill  = document.getElementById('progress-fill');

// ─── Renderer ─────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({
  canvas:    canvasEl,
  antialias: true,
  alpha:     false,
});
renderer.setClearColor(0x0c0b10, 1);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace  = THREE.SRGBColorSpace;
renderer.toneMapping       = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

// ─── Scene & Camera ───────────────────────────────────────
const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  42,
  window.innerWidth / window.innerHeight,
  0.01,
  200
);
camera.position.set(0, 0, 5);

// ─── Lighting ─────────────────────────────────────────────
// Soft warm ambient
const ambientLight = new THREE.AmbientLight(0xfff6ea, 0.55);
scene.add(ambientLight);

// Main frontal light (face-forward)
const mainLight = new THREE.DirectionalLight(0xffffff, 2.6);
mainLight.position.set(1.5, 3.5, 5);
scene.add(mainLight);

// Soft fill from left to avoid complete darkness on sides
const fillLight = new THREE.DirectionalLight(0xffe8cc, 0.65);
fillLight.position.set(-4, 1.5, 2);
scene.add(fillLight);

// Cool rim from behind for sculptural depth
const rimLight = new THREE.DirectionalLight(0x99aadd, 1.3);
rimLight.position.set(-2, 0.5, -5);
scene.add(rimLight);

// Subtle top light for crown detail
const topLight = new THREE.DirectionalLight(0xffffff, 0.5);
topLight.position.set(0, 6, 1);
scene.add(topLight);

// ─── State ────────────────────────────────────────────────
let model          = null;
let targetRotation = 0;
let currentRotation = 0;

// ─── Load model ───────────────────────────────────────────
const loader = new GLTFLoader();

loader.load(
  'angel_bust.glb',

  // onLoad
  (gltf) => {
    model = gltf.scene;

    // Center model on its bounding box
    const box    = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size   = box.getSize(new THREE.Vector3());

    model.position.sub(center);

    // Fit camera distance to model height
    const tallest = Math.max(size.x, size.y, size.z);
    const fovRad  = (camera.fov * Math.PI) / 180;
    camera.position.z = (tallest / 2) / Math.tan(fovRad / 2) * 1.75;
    camera.updateProjectionMatrix();

    scene.add(model);

    // First face text visible immediately
    if (!IS_MOBILE) {
      updateTexts(0);
      updateDots(0);
      initScroll();
    }

    // Dismiss loader
    loaderEl.classList.add('hidden');
  },

  // onProgress
  undefined,

  // onError
  (err) => {
    console.error('[hero3d] GLB load error:', err);
    loaderEl.querySelector('.loader__label').textContent = 'Modèle introuvable';
  }
);

// ─── Scroll handler ───────────────────────────────────────
function initScroll() {
  window.addEventListener('scroll', onScroll, { passive: true });
}

function onScroll() {
  const rect      = sectionEl.getBoundingClientRect();
  const scrolled  = -rect.top;
  const maxScroll = sectionEl.offsetHeight - window.innerHeight;
  const progress  = Math.max(0, Math.min(scrolled / maxScroll, 1));

  targetRotation = progress * Math.PI * 2;

  // Hide scroll hint after 4% scroll
  if (progress > 0.04 && scrollHintEl) {
    scrollHintEl.classList.add('hidden');
  }

  // Update SVG progress ring
  if (progressFill) {
    progressFill.style.strokeDashoffset = (CIRC * (1 - progress)).toFixed(2);
  }
}

// ─── Face text fader ──────────────────────────────────────
function updateTexts(rotation) {
  const rot = ((rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

  faceTextEls.forEach((el, i) => {
    const angle = FACE_ANGLES[i];
    let diff = Math.abs(rot - angle);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;

    const opacity =
      diff < FULL_RAD ? 1
      : diff < FADE_RAD ? 1 - (diff - FULL_RAD) / (FADE_RAD - FULL_RAD)
      : 0;

    el.style.opacity = Math.max(0, opacity).toFixed(3);
  });
}

// ─── Face dot indicators ──────────────────────────────────
function updateDots(rotation) {
  const rot = ((rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  let minDiff = Infinity;
  let active  = 0;

  FACE_ANGLES.forEach((angle, i) => {
    let diff = Math.abs(rot - angle);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    if (diff < minDiff) { minDiff = diff; active = i; }
  });

  faceDotEls.forEach((dot, i) => dot.classList.toggle('active', i === active));
}

// ─── Animation loop ───────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);

  if (model) {
    if (IS_MOBILE) {
      // Gentle auto-rotate on mobile
      model.rotation.y += 0.004;
    } else {
      // Lerp toward scroll target (factor 0.06 ≈ smooth but responsive)
      currentRotation += (targetRotation - currentRotation) * 0.06;
      model.rotation.y = currentRotation;
      updateTexts(currentRotation);
      updateDots(currentRotation);
    }
  }

  renderer.render(scene, camera);
}

animate();

// ─── Resize ───────────────────────────────────────────────
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
