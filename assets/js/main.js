/**
 * Created by Enthusiasmus on 31.03.14.
 */

var visualization = {
  divWebGl: "webgl-output",
  divStats: "stats-output",
  scene: null,
  camera: null,
  renderer: null,
  stats: null,
  controls: null,
  ground: null,
  axes: null,
  innerBody: null,
  cornerBodies: [],
  start: function () {
    this.stats = this.initStats();
    this.scene = new THREE.Scene();

    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(0xEEEEEE, 1.0);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(-5, 40, 30);
    this.camera.lookAt(this.scene.position);

    this.axes = new THREE.AxisHelper(20);
    this.scene.add(this.axes);

    var groundGeometry = new THREE.PlaneGeometry(60, 20, 1, 1);
    var groundMaterial = new THREE.MeshLambertMaterial({color: 0xffffff});
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.rotation.x = -0.5 * Math.PI;
    this.ground.position.x = 15;
    this.ground.position.y = 0;
    this.ground.position.z = 0;
    this.scene.add(this.ground);

    var ambientLight = new THREE.AmbientLight(0x0c0c0c);
    this.scene.add(ambientLight);

    var spotLight = new THREE.SpotLight(0xffffff);
    spotLight.position.set(-40, 60, -10);
    this.scene.add(spotLight);

    this.drawGeometries(5, 0.5);
    this.initControls();

    $("#" + this.divWebGl).append(this.renderer.domElement);
    this.renderScene();
  },
  drawGeometries: function (innerBodySize, cornerBodySize) {
    var outerGeometry = new THREE.SphereGeometry(innerBodySize);
    var innerBodyMaterialWireFrame = new THREE.MeshLambertMaterial({ opacity: 0.6, color: 0x44ff44, transparent: true });
    var innerBodyMaterialOpacity = new THREE.MeshLambertMaterial({ color: 0x000000, wireframe: true });
    this.innerBody = THREE.SceneUtils.createMultiMaterialObject(outerGeometry, [innerBodyMaterialWireFrame, innerBodyMaterialOpacity]);
    this.innerBody.name = "innerBody";
    this.innerBody.position.set(0, 5, 0);
    this.scene.add(this.innerBody);

    var n = 50;
    //https://www.gaffga.de/punkte-gleichmaessig-auf-einer-kugel-verteilen/
    for (var i = 0; i < n; i++) {
      var y = i * 2 / n - 1 + (1 / n);
      var r = Math.sqrt(1 - y * y);
      var phi = i * 3.141592765 * (3 - Math.sqrt(5));

      var x = Math.cos(phi) * r;
      var z = Math.sin(phi) * r;

      var geometry = new THREE.SphereGeometry(cornerBodySize);
      var cornerBodyMaterialWireFrame = new THREE.MeshLambertMaterial({ opacity: 0.6, color: 0x44ff44, transparent: true });
      var cornerBodyMaterialOpacity = new THREE.MeshLambertMaterial({ color: 0x000000, wireframe: true });
      var cornerBody = THREE.SceneUtils.createMultiMaterialObject(geometry, [cornerBodyMaterialWireFrame, cornerBodyMaterialOpacity]);
      cornerBody.position.set(x * innerBodySize, y * innerBodySize + innerBodySize, z * innerBodySize);
      cornerBody.name = "cornerBody";
      this.cornerBodies.push(cornerBody);
      this.scene.add(cornerBody);
    }
  },
  initStats: function () {
    var stats = new Stats();
    stats.setMode(0);
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.left = '0px';
    stats.domElement.style.top = '0px';
    $("#" + this.divStats).append(stats.domElement);
    return stats;
  },
  initControls: function () {
    this.controls = new function () {
      this.rotateY = 0.01;

      this.cameraX = -5;
      this.cameraY = 25;
      this.cameraZ = 20;

      this.geometryX = 0;
      this.geometryY = 5;
      this.geometryZ = 0;
    };

    var gui = new dat.GUI();
    gui.add(this.controls, 'cameraX', -40, 40);
    gui.add(this.controls, 'cameraY', -40, 40);
    gui.add(this.controls, 'cameraZ', -40, 40);
    gui.add(this.controls, 'rotateY', 0, 0.1);
    gui.add(this.controls, 'geometryX', -20, 20);
    gui.add(this.controls, 'geometryY', -20, 20);
    gui.add(this.controls, 'geometryZ', -20, 20);

  },
  renderScene: function () {
    var scale = this.getScaleByAudio("byte") / 2 + 0.8;
    this.stats.update();

    this.camera.position.x = this.controls.cameraX;
    this.camera.position.y = this.controls.cameraY;
    this.camera.position.z = this.controls.cameraZ;

    this.innerBody.rotation.y -= this.controls.rotateY;
    var center = this.scene.position;
    center.y = 5;
    this.camera.lookAt(center);

    this.innerBody.position.x = this.controls.geometryX;
    this.innerBody.position.y = this.controls.geometryY;
    this.innerBody.position.z = this.controls.geometryZ;

    this.innerBody.scale.set(scale, scale, scale);

    this.scene.traverse(function (e) {
      if (e.name === "cornerBody") {
        e.scale.set(scale, scale, scale);

        var currentPos = e.position;
        var distance2D = Math.sqrt(currentPos.x * currentPos.x + currentPos.z * currentPos.z);
        var distance3D = Math.sqrt(currentPos.x * currentPos.x + currentPos.y * currentPos.y + currentPos.z * currentPos.z);

        //Place the cornerBodies around the innerBody with var scale
        var scaledDistance3D = distance3D*scale;


        //Rotate the cornerBodies around the innerBody with var rotate
        var phi = Math.atan2(currentPos.z, currentPos.x);
        var rotateStep = visualization.controls.rotateY;
        var x = Math.cos(phi + rotateStep) * distance2D;
        var z = Math.sin(phi + rotateStep) * distance2D;
        e.position.x = x;
        e.position.z = z;
      }
    });

    requestAnimationFrame(this.renderScene.bind(this));
    this.renderer.render(this.scene, this.camera);
  },
  getScaleByAudio: function (type) {
    var data = [];

    if (type === "time") {
      //values from 0 to 255
      //data length 2048
      data = new Uint8Array(audioCapture.analyser.fftSize);
      audioCapture.analyser.getByteTimeDomainData(data);
    } else if (type === "fft") {
      //values from -255 to 0
      //data length 2048
      data = new Float32Array(audioCapture.analyser.fftSize);
      audioCapture.analyser.getFloatFrequencyData(data);
    } else if (type === "byte") {
      //values from 0 to 255
      //data length 2048
      data = new Uint8Array(audioCapture.analyser.fftSize);
      audioCapture.analyser.getByteFrequencyData(data);
    }

    return Math.abs(data[0] / 255);
  }
};

var audioCapture = {
  audio: null,
  context: null,
  analyser: null,
  init: function () {
    this.audio = new Audio();
    this.context = new webkitAudioContext();
    this.analyser = this.context.createAnalyser();

    this.audio.addEventListener("canplay", function () {
      var source = audioCapture.context.createMediaElementSource(audioCapture.audio);
      source.connect(audioCapture.analyser);
      audioCapture.analyser.connect(audioCapture.context.destination);
    });

    this.audio.src = "assets/mp3/Elise.mp3";
    this.audio.play();
  }
};

$(document).ready(function () {
  audioCapture.init();
  visualization.start();
});

