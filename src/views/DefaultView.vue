<script setup lang="ts">
import { ref, onMounted } from 'vue';
import * as THREE from 'three';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { Water } from 'three/addons/objects/Water.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface CameraPos {
  x: number;
  y: number;
  z: number;
};

interface GUIParameters {
  elevation: number;
  azimuth: number;
  turbidity: number;
  rayleigh: number;
  mieCoefficient: number;
  mieDirectionalG: number;
  waterColor: string;
  sunIntensity: number;
  dirLightColor: string;
  dirLightIntensity: number;
  dirLightPositionX: number;
  dirLightPositionY: number;
  dirLightPositionZ: number;
  showDirLightHelper: boolean;
  showCameraPosition: boolean;
}

interface ThreeCanvas {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  sun: THREE.Vector3;
  water: Water;
  sky: Sky;
  dirLight: THREE.DirectionalLight;
  parameters: GUIParameters;
}

let cameraPosition = ref<CameraPos>({
  x: 0,
  y: 0,
  z: 0
});

const canvas = ref<HTMLElement | null>(null);

let config: ThreeCanvas;
let dirLightHelper: THREE.DirectionalLightHelper;
let cameraPositionVisible = ref(false);

let isLoading = ref(true);
let loadingProgress = ref(0);

// Setup the LoadingManager
const manager = new THREE.LoadingManager();

manager.onStart = function(url, itemsLoaded, itemsTotal) {
  console.log('Started loading:', url, `. Loaded ${ itemsLoaded } of ${ itemsTotal }.`);
};

manager.onProgress = function(url, itemsLoaded, itemsTotal) {
  // Calculate the progress as a percentage
  const progress = (itemsLoaded / itemsTotal) * 100;

  loadingProgress.value = progress;
  console.log(`Loading progress: ${ progress }%`);
};

manager.onLoad = function() {
  console.log('All assets loaded.');
  isLoading.value = false; // Set isLoading to false once all assets are loaded
};

manager.onError = function(url) {
  console.error(`There was an error loading ${  url }`);
};

const loader: GLTFLoader = new GLTFLoader(manager);

onMounted(() => {
  loader.load('./assets/models/hermes-v3.gltf', (gltf) => {
    const scene = initScene(gltf);
    const renderer = initRenderer();
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 20000);
    const controls = initControls(scene, renderer, camera);
    const sun = new THREE.Vector3();
    const water = initWater(scene);
    const sky = initSky(scene);
    const dirLight = initDirLight(scene);

    const parameters: GUIParameters = {
      elevation:          22.5,
      azimuth:            113.5,
      turbidity:          10,
      rayleigh:           2,
      mieCoefficient:     0.005,
      mieDirectionalG:    0.8,
      waterColor:         '#001e0f',
      sunIntensity:       1,
      dirLightColor:      '#ffffff',
      dirLightIntensity:  5,
      dirLightPositionX:  294,
      dirLightPositionY:  302,
      dirLightPositionZ:  -255,
      showDirLightHelper: false,
      showCameraPosition: false
    };

    config = {
      scene,
      renderer,
      camera,
      controls,
      sun,
      water,
      sky,
      dirLight,
      parameters
    };

    if ( config.renderer?.domElement && canvas.value ) {
      canvas.value.appendChild(config.renderer.domElement);
      animate();
    }

    updateEnvironment();

    const gui = updateGui();

    gui.close();

    isLoading.value = false;
  });
});

function initScene(gltf: GLTF): THREE.Scene {
  const scene = new THREE.Scene();

  scene.add(gltf.scene);
  scene.children[0].position.y = 55;

  return scene;
}

function initRenderer(): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    alpha:     true,
    antialias: true
  });

  renderer.setSize(window.innerWidth, window.innerHeight);
  // renderer.physicallyCorrectLights = true;

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.5;

  return renderer;
}

function initControls(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera
): OrbitControls {
  const controls = new OrbitControls(camera, renderer?.domElement as HTMLElement);

  camera.position.set(223.96, 213.81, 223.2);
  scene?.add(camera);

  return controls;
}

function initWater(scene: THREE.Scene): Water {
  const waterGeometry = new THREE.PlaneGeometry(10000, 10000);

  const water = new Water(waterGeometry, {
    textureWidth:  512,
    textureHeight: 512,
    waterNormals:  new THREE.TextureLoader().load(
      './assets/textures/waternormals.jpg',
      (texture) => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      },
    ),
    sunDirection:    new THREE.Vector3(),
    sunColor:        0xffffff,
    waterColor:      0x001e0f,
    distortionScale: 3.7,
    fog:             scene?.fog !== undefined,
  });

  if ( water && scene ) {
    water.rotation.x = -Math.PI / 2;
    scene.add(water);
  }

  return water;
}

function initSky(scene: THREE.Scene): Sky {
  const sky = new Sky();

  sky.scale.setScalar(450000);

  scene?.add(sky);

  const skyUniforms = sky.material.uniforms;

  skyUniforms['turbidity'].value = 10;
  skyUniforms['rayleigh'].value = 2;
  skyUniforms['mieCoefficient'].value = 0.005;
  skyUniforms['mieDirectionalG'].value = 0.8;

  return sky;
};

function initDirLight(scene: THREE.Scene): THREE.DirectionalLight {
  const dirLight = new THREE.DirectionalLight( 0xffffff, 5 );

  dirLight.color.setHSL( 0.1, 1, 0.95 );
  dirLight.position.set( 294, 302, -255 );
  dirLight.position.multiplyScalar( 500 );
  scene.add(dirLight);

  dirLight.castShadow = true;

  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;

  const d = 50;

  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;

  dirLight.shadow.camera.far = 3500;
  dirLight.shadow.bias = -0.0001;

  return dirLight;
}

function animate(): any {
  requestAnimationFrame(animate);

  if ( config.water ) {
    config.water.material.uniforms['time'].value += 1.0 / 60.0;
  }

  if ( config.renderer && config.scene && config.camera ) {
    config.renderer.render(config.scene, config.camera);
  }

  if ( config.controls ) {
    config.controls.update(0.01);
  }


  if ( config.camera ) {
    cameraPosition.value = {
      x: config.camera.position.x,
      y: config.camera.position.y,
      z: config.camera.position.z,
    };
  }
}

function updateLightHelperVisibility(): void {
  if ( config.parameters.showDirLightHelper ) {
    if ( !dirLightHelper ) {
      dirLightHelper = new THREE.DirectionalLightHelper(config.dirLight, 5);
      config.scene.add(dirLightHelper);
    } else {
      // Helper exists but was previously removed from the scene
      config.scene.add(dirLightHelper);
    }
  } else {
    // Remove the helper from the scene if it exists
    if ( dirLightHelper ) {
      config.scene.remove(dirLightHelper);
    }
  }
}

function updateGui(): GUI {
  const { parameters, water } = config;
  const gui = new GUI();

  // Camera Folder
  const cameraFolder = gui.addFolder('Camera');

  cameraFolder.add(parameters, 'showCameraPosition').onChange(() => {
    cameraPositionVisible.value = parameters.showCameraPosition;
  });

  // Sky Folder
  const skyFolder = gui.addFolder('Sky');

  skyFolder.add(parameters, 'turbidity', 1, 20).onChange(updateEnvironment);
  skyFolder.add(parameters, 'rayleigh', 0, 4, 0.001).onChange(updateEnvironment);
  skyFolder.add(parameters, 'mieCoefficient', 0.001, 0.1, 0.001).onChange(updateEnvironment);
  skyFolder.add(parameters, 'mieDirectionalG', 0.0, 1, 0.001).onChange(updateEnvironment);

  // Sun Folder
  const sunFolder = gui.addFolder('Sun');

  sunFolder.add(parameters, 'elevation', 0, 90, 0.1).onChange(updateEnvironment);
  sunFolder.add(parameters, 'azimuth', -180, 180, 0.1).onChange(updateEnvironment);
  sunFolder.add(parameters, 'sunIntensity', 0, 2, 0.1).onChange(updateEnvironment);

  // Water Folder
  const waterFolder = gui.addFolder('Water');

  waterFolder.addColor(parameters, 'waterColor').onChange(updateEnvironment);
  waterFolder.add(water.material.uniforms.distortionScale, 'value', 0, 8, 0.1).name('distortionScale');

  // Directional Light Folder
  const dirLightFolder = gui.addFolder('Directional Light');

  dirLightFolder.addColor(parameters, 'dirLightColor').onChange(updateEnvironment);
  dirLightFolder.add(parameters, 'dirLightIntensity', 0, 10, 0.1).onChange(updateEnvironment);
  dirLightFolder.add(parameters, 'dirLightPositionX', -500, 500).onChange(updateEnvironment);
  dirLightFolder.add(parameters, 'dirLightPositionY', -500, 500).onChange(updateEnvironment);
  dirLightFolder.add(parameters, 'dirLightPositionZ', -500, 500).onChange(updateEnvironment);
  dirLightFolder.add(parameters, 'showDirLightHelper').onChange(updateLightHelperVisibility);

  return gui;
}

function updateEnvironment(): void {
  let {
    parameters, sun, sky, water, dirLight
  } = config;

  // Update sun position based on elevation and azimuth
  const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
  const theta = THREE.MathUtils.degToRad(parameters.azimuth);

  sun.setFromSphericalCoords(1, phi, theta);

  // Update sky properties
  sky.material.uniforms['turbidity'].value = parameters.turbidity;
  sky.material.uniforms['rayleigh'].value = parameters.rayleigh;
  sky.material.uniforms['mieCoefficient'].value = parameters.mieCoefficient;
  sky.material.uniforms['mieDirectionalG'].value = parameters.mieDirectionalG;
  sky.material.uniforms['sunPosition'].value.copy(sun);

  // Update water color
  // Convert color from GUI (hex string) to numerical format expected by Three.js
  const waterColor = new THREE.Color(parameters.waterColor);

  water.material.uniforms['waterColor'].value = waterColor;

  // Update sun intensity (affects how bright the sun is)
  water.material.uniforms['sunDirection'].value.copy(sun).normalize();
  // Assuming 'sunIntensity' affects both the light intensity and how it reflects off the water surface

  // Update directional light properties
  const dirLightColor = new THREE.Color(parameters.dirLightColor);

  dirLight.color.set(dirLightColor);
  dirLight.intensity = parameters.dirLightIntensity;
  dirLight.position.set(parameters.dirLightPositionX, parameters.dirLightPositionY, parameters.dirLightPositionZ);
};
</script>

<template>
  <div v-if="isLoading" id="loading-screen">
    <div>
      <p class="loading-text">Loading...</p>
      <span class="loading-text">{{ loadingProgress.toFixed(0) }}%</span>
    </div>
    <div class="progress-bar-container">
      <div class="progress-bar" :style="{ width: loadingProgress + '%' }"></div>
    </div>
  </div>
  <div ref="canvas">
    <template v-if="cameraPositionVisible">
      <div class="camera-pos">
        <span>x: {{ cameraPosition.x.toFixed(2) }}</span>
        <span>y: {{ cameraPosition.y.toFixed(2) }}</span>
        <span>z: {{ cameraPosition.z.toFixed(2) }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped >
#loading-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 2em;
  z-index: 1000;
}

#loading-screen div:nth-child(1) {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.progress-bar-container {
  width: 80%;
  background-color: #eee;
  border-radius: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  margin-top: 20px;
  overflow: hidden;
}

.progress-bar {
  height: 20px;
  background: linear-gradient(to right, #4ca1af, #c4e0e5);
  width: 0%; /* Initial width */
  transition: width 0.4s ease;
  border-radius: 20px;
}

.loading-text {
  font-size: 1.5rem;
  color: white;
  margin-bottom: 10px;
}

.camera-pos {
  position: absolute;
  top: 0;
  left: 15px;
  display: flex;
  flex-direction: column;
  color: white;
  background-color: rgba(0, 0, 0, 0.5);
  padding: 8px;
}
</style>
