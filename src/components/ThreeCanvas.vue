<script>
import * as THREE from "three";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { Water } from "three/addons/objects/Water.js";
import { Sky } from "three/addons/objects/Sky.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

export default {
  data() {
    const cameraPosition = { x: 0, y: 0, z: 0 };

    return {
      cameraPosition,
    };
  },

  created() {
    this.loader = new GLTFLoader();

    this.loader.load("./assets/models/hermes-v3.gltf", (gltf) => {
      this.scene = new THREE.Scene();
      this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.physicallyCorrectLights = true;

      // Model
      this.scene.add(gltf.scene);
      this.scene.children[0].position.y = 55;

      // Camera & Controls
      this.camera = null;
      this.controls = null;
      this.initControls();

      // Sun
      this.sun = new THREE.Vector3();

      // Water
      this.water = null;
      this.initWater();

      // Sky
      this.sky = null;
      this.initSky();

      this.animate();
      this.updateSun();

      // Use for debugging
      // this.updateGui();
    });
  },

  methods: {
    animate() {
      this.$refs.canvas.appendChild(this.renderer.domElement);
      this.water.material.uniforms["time"].value += 1.0 / 60.0;

      requestAnimationFrame(this.animate);

      this.renderer.render(this.scene, this.camera);
      this.controls.update(0.01);

      if (this.camera) {
        const { x, y, z } = this.camera.position;

        this.cameraPosition = {
          x: x.toFixed(2),
          y: y.toFixed(2),
          z: z.toFixed(2),
        };
      }
    },

    initControls() {
      this.camera = new THREE.PerspectiveCamera(
        55,
        window.innerWidth / window.innerHeight,
        1,
        20000,
      );
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.movementSpeed = 1000;
      this.controls.rollSpeed = Math.PI / 6;
      this.controls.autoForward = false;
      this.controls.dragToLook = true;

      // this.camera.position.set(194, 168, 500);
      // "x": "205.13", "y": "215.46", "z": "167.14
      this.camera.position.set(206.72, 204.12, 169.52);
      this.scene.add(this.camera);
    },

    initSky() {
      this.sky = new Sky();
      this.sky.scale.setScalar(10000);

      this.scene.add(this.sky);

      const skyUniforms = this.sky.material.uniforms;

      skyUniforms["turbidity"].value = 10;
      skyUniforms["rayleigh"].value = 2;
      skyUniforms["mieCoefficient"].value = 0.005;
      skyUniforms["mieDirectionalG"].value = 0.8;

      this.parameters = {
        elevation: 10,
        azimuth: 122.5,
      };

      this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    },

    initWater() {
      const waterGeometry = new THREE.PlaneGeometry(10000, 10000);

      this.water = new Water(waterGeometry, {
        textureWidth: 512,
        textureHeight: 512,
        waterNormals: new THREE.TextureLoader().load(
          "./assets/textures/waternormals.jpg",
          function (texture) {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
          },
        ),
        sunDirection: new THREE.Vector3(),
        sunColor: 0xffffff,
        waterColor: 0x001e0f,
        distortionScale: 3.7,
        fog: this.scene.fog !== undefined,
      });

      this.water.rotation.x = -Math.PI / 2;

      this.scene.add(this.water);
    },

    updateGui() {
      const gui = new GUI();

      const folderSky = gui.addFolder("Sky");
      folderSky
        .add(this.parameters, "elevation", 0, 90, 0.1)
        .onChange(this.updateSun);
      folderSky
        .add(this.parameters, "azimuth", -180, 180, 0.1)
        .onChange(this.updateSun);
      folderSky.open();

      const waterUniforms = this.water.material.uniforms;

      const folderWater = gui.addFolder("Water");
      folderWater
        .add(waterUniforms.distortionScale, "value", 0, 8, 0.1)
        .name("distortionScale");
      folderWater.add(waterUniforms.size, "value", 0.1, 10, 0.1).name("size");
      folderWater.open();
    },

    updateSun() {
      const phi = THREE.MathUtils.degToRad(90 - this.parameters.elevation);
      const theta = THREE.MathUtils.degToRad(this.parameters.azimuth);

      this.sun.setFromSphericalCoords(1, phi, theta);

      this.sky.material.uniforms["sunPosition"].value.copy(this.sun);
      this.water.material.uniforms["sunDirection"].value
        .copy(this.sun)
        .normalize();

      if (this.renderTarget !== undefined) this.renderTarget.dispose();

      this.renderTarget = this.pmremGenerator.fromScene(this.sky);

      this.scene.environment = this.renderTarget.texture;
    },
  },
};
</script>

<template>
  <div ref="canvas">
    <!-- <template v-if="cameraPosition">
      <div style="position: absolute">{{ cameraPosition }}</div>
    </template> -->
  </div>
</template>
