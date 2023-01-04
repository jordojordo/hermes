<script>
import * as THREE from "three";
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

    this.loader.load("./assets/models/hermes-v8.gltf", (gltf) => {
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );

      this.renderer = new THREE.WebGLRenderer({ alpha: true });
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      const hemiLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 2);
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);

      this.camera.position.x = 7.03;
      this.camera.position.y = 4.17;
      this.camera.position.z = 6.81;

      this.scene.add(this.camera);
      this.scene.add(hemiLight);
      this.scene.add(dirLight);
      this.scene.add(this.cube);
      this.scene.add(gltf.scene);

      this.scene.background = new THREE.Color("hsl(0, 100%, 100%)");

      this.renderer.setSize(window.innerWidth, window.innerHeight);

      this.animate();
    });
  },

  methods: {
    animate() {
      this.$refs.canvas.appendChild(this.renderer.domElement);

      requestAnimationFrame(this.animate);

      this.renderer.render(this.scene, this.camera);
      this.controls.update();

      if (this.camera) {
        const { x, y, z } = this.camera.position;

        this.cameraPosition = {
          x: x.toFixed(2),
          y: y.toFixed(2),
          z: z.toFixed(2),
        };
      }
    },
  },
};
</script>

<template>
  <div ref="canvas">
    <template v-if="cameraPosition">
      <div class="canvas-stats">
        {{ cameraPosition }}
      </div>
    </template>
  </div>
</template>

<style scoped>
.canvas-stats {
  position: absolute;
}
</style>