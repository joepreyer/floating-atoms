if (WEBGL.isWebGLAvailable() === false) {
  document.body.appendChild(WEBGL.getWebGLErrorMessage());
}

// VARIABLES

var MARGIN = 0;

var SCREEN_WIDTH = window.innerWidth;
var SCREEN_HEIGHT = window.innerHeight - 2 * MARGIN;

var container, stats;

var camera, scene, renderer;

var materials, current_material;

var light, ambientLight;

var effect, resolution;

var composer, effectFXAA, hblur, vblur;

var effectController;

var time = 0;
var clock = new THREE.Clock();

init();
animate();

// In this init function, setupGUI() is called
function init() {
  container = document.getElementById("container");

  // CAMERA

  camera = new THREE.PerspectiveCamera(
    45,
    SCREEN_WIDTH / SCREEN_HEIGHT,
    1,
    10000
  );
  camera.position.set(0, 0, 1000);

  // SCENE

  scene = new THREE.Scene();
  scene.background = new THREE.Color("#ACD2FF"); // Set background color

  // LIGHTS

  light = new THREE.DirectionalLight("#ACD2FF");
  light.position.set(0.5, 0.5, 1);
  scene.add(light);

  ambientLight = new THREE.AmbientLight("#ACD2FF");
  scene.add(ambientLight);

  // MATERIALS

  materials = generateMaterials();
  current_material = "testMaterial";

  // MARCHING CUBES

  resolution = 28;

  effect = new THREE.MarchingCubes(
    resolution,
    materials[current_material].m,
    true,
    true
  );
  effect.position.set(0, 0, 0);
  effect.scale.set(700, 700, 700);

  scene.add(effect);

  // var axesHelper = new THREE.AxesHelper(1000);
  // scene.add(axesHelper);

  // RENDERER

  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);

  renderer.domElement.style.position = "absolute";
  renderer.domElement.style.top = MARGIN + "px";
  renderer.domElement.style.left = "0px";

  container.appendChild(renderer.domElement);

  //

  renderer.gammaInput = true;
  renderer.gammaOutput = true;

  // CONTROLS

  var controls = new THREE.OrbitControls(camera, renderer.domElement);

  // STATS (lets us see FPS etc in top left corner)

  stats = new Stats();
  container.appendChild(stats.dom);

  // GUI

  setupGui();

  // COMPOSER (This is only used for the postprocessing blur)

  renderer.autoClear = false;

  var renderTargetParameters = {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBFormat,
    stencilBuffer: false
  };
  var renderTarget = new THREE.WebGLRenderTarget(
    SCREEN_WIDTH,
    SCREEN_HEIGHT,
    renderTargetParameters
  );

  effectFXAA = new THREE.ShaderPass(THREE.FXAAShader);

  hblur = new THREE.ShaderPass(THREE.HorizontalTiltShiftShader);
  vblur = new THREE.ShaderPass(THREE.VerticalTiltShiftShader);

  var bluriness = effectController.blurLevel;

  hblur.uniforms["h"].value = bluriness / SCREEN_WIDTH;
  vblur.uniforms["v"].value = bluriness / SCREEN_HEIGHT;

  hblur.uniforms["r"].value = vblur.uniforms["r"].value = 0.5;

  effectFXAA.uniforms["resolution"].value.set(
    1 / SCREEN_WIDTH,
    1 / SCREEN_HEIGHT
  );

  var renderModel = new THREE.RenderPass(scene, camera);

  vblur.renderToScreen = true;
  //effectFXAA.renderToScreen = true;

  composer = new THREE.EffectComposer(renderer, renderTarget);

  composer.addPass(renderModel);

  composer.addPass(effectFXAA);

  composer.addPass(hblur);
  composer.addPass(vblur);

  // EVENTS

  window.addEventListener("resize", onWindowResize, false);
}

//

function onWindowResize() {
  SCREEN_WIDTH = window.innerWidth;
  SCREEN_HEIGHT = window.innerHeight - 2 * MARGIN;

  camera.aspect = SCREEN_WIDTH / SCREEN_HEIGHT;
  camera.updateProjectionMatrix();

  renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
  composer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);

  hblur.uniforms["h"].value = 4 / SCREEN_WIDTH;
  vblur.uniforms["v"].value = 4 / SCREEN_HEIGHT;

  effectFXAA.uniforms["resolution"].value.set(
    1 / SCREEN_WIDTH,
    1 / SCREEN_HEIGHT
  );
}

function generateMaterials() {
  // environment map

  // toons

  var toonMaterial1 = createShaderMaterial("toon1", light, ambientLight),
    toonMaterial2 = createShaderMaterial("toon2", light, ambientLight);

  var materials = {
    matte: {
      m: new THREE.MeshPhongMaterial({
        color: 0x000000,
        specular: 0x111111,
        shininess: 1
      }),
      h: 0,
      s: 0,
      l: 1
    },

    flat: {
      m: new THREE.MeshLambertMaterial({
        color: 0x000000,
        flatShading: true
      }),
      h: 0,
      s: 0,
      l: 1
    },

    toon1: {
      m: toonMaterial1,
      h: 0.2,
      s: 1,
      l: 0.75
    },

    toon2: {
      m: toonMaterial2,
      h: 0.4,
      s: 1,
      l: 0.75
    },

    testMaterial: {
      m: new THREE.MeshLambertMaterial({
        color: "#3679E0",
        wireframe: false
      }),
      h: 0,
      s: 0,
      l: 1
    }
  };

  return materials;
}

function createShaderMaterial(id, light, ambientLight) {
  var shader = THREE.ShaderToon[id];

  var u = THREE.UniformsUtils.clone(shader.uniforms);

  var vs = shader.vertexShader;
  var fs = shader.fragmentShader;

  var material = new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: vs,
    fragmentShader: fs
  });

  material.uniforms.uDirLightPos.value = light.position;
  material.uniforms.uDirLightColor.value = light.color;

  material.uniforms.uAmbientLightColor.value = ambientLight.color;

  return material;
}

// this controls content of marching cubes voxel field

function updateCubes(object, time, numblobs, floor, wallx, wallz) {
  object.reset();

  // fill the field with some metaballs

  var i, ballx, bally, ballz, subtract, strength;

  subtract = 12;
  strength = 1.2 / ((Math.sqrt(numblobs) - 1) / 4 + 1);

  // These values determine how far the balls will fly
  // Therefore can make z value equal if don't want depth

  for (i = 0; i < numblobs; i++) {
    ballx =
      Math.sin(i + 1.26 * time * (1.03 + 0.5 * Math.cos(0.21 * i))) * 0.4 + 0.5;
    bally =
      Math.abs(Math.cos(i + 1.12 * time * Math.cos(1.22 + 0.1424 * i))) * 0.8 +
      0.1; // dip into the floor
    ballz =
      Math.cos(i + 1.32 * time * 0.1 * Math.sin(0.92 + 0.53 * i)) * 0.1 + 0.5;

    object.addBall(ballx, bally, ballz, strength, subtract);
  }

  if (floor) object.addPlaneY(2, 12);
  if (wallz) object.addPlaneZ(2, 12);
  if (wallx) object.addPlaneX(2, 12);
}

//

function animate() {
  requestAnimationFrame(animate);

  render();
  stats.update();
}

function render() {
  var delta = clock.getDelta();

  time += delta * effectController.speed * 0.5;

  // marching cubes

  if (effectController.resolution !== resolution) {
    resolution = effectController.resolution;
    effect.init(Math.floor(resolution));
  }

  if (effectController.isolation !== effect.isolation) {
    effect.isolation = effectController.isolation;
  }

  updateCubes(
    effect,
    time,
    effectController.numBlobs,
    effectController.floor,
    effectController.wallx,
    effectController.wallz
  );

  // materials

  if (effect.material instanceof THREE.ShaderMaterial) {
    effect.material.uniforms.uBaseColor.value.setHSL(
      effectController.hue,
      effectController.saturation,
      effectController.lightness
    );
  } else {
    effect.material.color.setHSL(
      effectController.hue,
      effectController.saturation,
      effectController.lightness
    );
  }

  // lights

  light.position.set(
    effectController.lx,
    effectController.ly,
    effectController.lz
  );
  light.position.normalize();

  // render

  if (effectController.postprocessing) {
    composer.render(delta);
  } else {
    renderer.clear();
    renderer.render(scene, camera);
  }
}
