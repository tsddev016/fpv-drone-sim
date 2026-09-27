(function () {
  var texCache = {};

  function canvasTex(THREE, w, h, draw) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    t.needsUpdate = true;
    return t;
  }

  function groundTex(THREE) {
    return canvasTex(THREE, 512, 512, function (ctx, w, h) {
      ctx.fillStyle = '#3d5c3a';
      ctx.fillRect(0, 0, w, h);
      for (var i = 0; i < 8000; i++) {
        var x = Math.random() * w, y = Math.random() * h;
        var g = 40 + Math.random() * 50;
        ctx.fillStyle = 'rgba(' + (g * 0.4) + ',' + g + ',' + (g * 0.35) + ',' + (0.15 + Math.random() * 0.35) + ')';
        ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 3);
      }
      for (var j = 0; j < 40; j++) {
        ctx.fillStyle = 'rgba(60,50,30,' + (0.08 + Math.random() * 0.12) + ')';
        ctx.beginPath();
        ctx.ellipse(Math.random() * w, Math.random() * h, 20 + Math.random() * 40, 10 + Math.random() * 20, Math.random(), 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  function asphaltTex(THREE) {
    return canvasTex(THREE, 256, 256, function (ctx, w, h) {
      ctx.fillStyle = '#2a2a2e';
      ctx.fillRect(0, 0, w, h);
      for (var i = 0; i < 3000; i++) {
        var v = 30 + Math.random() * 25;
        ctx.fillStyle = 'rgba(' + v + ',' + v + ',' + (v + 5) + ',0.4)';
        ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
      }
      ctx.strokeStyle = 'rgba(15,15,18,0.5)';
      ctx.lineWidth = 1;
      for (var k = 0; k < 8; k++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * w, Math.random() * h);
        ctx.lineTo(Math.random() * w, Math.random() * h);
        ctx.stroke();
      }
    });
  }

  function brickTex(THREE) {
    return canvasTex(THREE, 256, 256, function (ctx, w, h) {
      ctx.fillStyle = '#6a5a4a';
      ctx.fillRect(0, 0, w, h);
      var bw = 32, bh = 16;
      for (var y = 0; y < h; y += bh) {
        var off = (Math.floor(y / bh) % 2) * (bw / 2);
        for (var x = -bw; x < w + bw; x += bw) {
          var r = 90 + Math.random() * 40;
          var g = 55 + Math.random() * 30;
          var b = 40 + Math.random() * 20;
          ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
          ctx.fillRect(x + off + 1, y + 1, bw - 2, bh - 2);
        }
      }
    });
  }

  function concreteTex(THREE) {
    return canvasTex(THREE, 256, 256, function (ctx, w, h) {
      ctx.fillStyle = '#7a7a78';
      ctx.fillRect(0, 0, w, h);
      for (var i = 0; i < 4000; i++) {
        var v = 90 + Math.random() * 40;
        ctx.fillStyle = 'rgba(' + v + ',' + v + ',' + (v - 2) + ',0.3)';
        ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
      }
    });
  }

  function enhanceLighting(THREE, scene) {
    var sun = null;
    scene.traverse(function (o) { if (o.isDirectionalLight) sun = o; });
    if (sun) {
      sun.intensity = Math.max(sun.intensity || 1, 1.35);
      sun.castShadow = true;
      try {
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.camera.near = 1;
        sun.shadow.camera.far = 300;
        sun.shadow.camera.left = -80;
        sun.shadow.camera.right = 80;
        sun.shadow.camera.top = 80;
        sun.shadow.camera.bottom = -80;
        sun.shadow.bias = -0.0002;
      } catch (e) {}
    }
    if (!scene.userData._hemiBoost) {
      scene.add(new THREE.HemisphereLight(0xc8e8ff, 0x3a2a18, 0.55));
      scene.add(new THREE.AmbientLight(0x404050, 0.35));
      var fill = new THREE.DirectionalLight(0x88aacc, 0.35);
      fill.position.set(-40, 30, -20);
      scene.add(fill);
      scene.userData._hemiBoost = true;
    }
  }

  function enhanceGround(THREE, scene) {
    var gtex = groundTex(THREE);
    gtex.repeat.set(40, 40);
    scene.traverse(function (o) {
      if (!o.isMesh || !o.geometry) return;
      if (o.geometry.type === 'PlaneGeometry' || (o.geometry.parameters && o.geometry.parameters.width >= 200)) {
        var mat = o.material;
        if (mat && mat.isMeshStandardMaterial) {
          mat.map = gtex;
          mat.roughness = 0.95;
          mat.metalness = 0.02;
          mat.color.setHex(0xffffff);
          mat.needsUpdate = true;
          o.receiveShadow = true;
        }
      }
    });
  }

  function enhanceBuildings(THREE, scene) {
    var brick = brickTex(THREE); brick.repeat.set(2, 4);
    var concrete = concreteTex(THREE); concrete.repeat.set(2, 2);
    var asphalt = asphaltTex(THREE); asphalt.repeat.set(8, 20);
    scene.traverse(function (o) {
      if (!o.isMesh || !o.material) return;
      var m = o.material;
      if (!m.isMeshStandardMaterial) return;
      var p = o.parent;
      while (p) {
        if (p.userData && (p.userData.realistic || p.name === 'fpv-realistic')) return;
        p = p.parent;
      }
      try {
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        var box = o.geometry.boundingBox;
        if (!box) return;
        var sx = box.max.x - box.min.x;
        var sy = box.max.y - box.min.y;
        if (sy < 0.2 && sx > 5) {
          m.map = asphalt; m.roughness = 0.9; m.metalness = 0.05;
          m.color.setHex(0xffffff); m.needsUpdate = true; return;
        }
        if (sy > 2 && sx > 1) {
          if (sy > 12) { m.map = concrete; m.metalness = 0.15; m.roughness = 0.55; }
          else { m.map = brick; m.metalness = 0.05; m.roughness = 0.85; }
          m.color.setHex(0xffffff); m.needsUpdate = true;
          o.castShadow = true; o.receiveShadow = true;
        }
      } catch (e) {}
    });
  }

  function addSkyDome(THREE, scene) {
    if (scene.userData._skyDome) return;
    var sky = new THREE.Mesh(
      new THREE.SphereGeometry(280, 32, 16),
      new THREE.MeshBasicMaterial({ color: 0x87b8e0, side: THREE.BackSide, fog: false, depthWrite: false })
    );
    sky.userData.noCollision = true;
    scene.add(sky);
    scene.userData._skyDome = sky;
    var sunMesh = new THREE.Mesh(
      new THREE.CircleGeometry(12, 24),
      new THREE.MeshBasicMaterial({ color: 0xfff5d0, fog: false, depthWrite: false })
    );
    sunMesh.position.set(80, 120, 40);
    sunMesh.lookAt(0, 0, 0);
    sunMesh.userData.noCollision = true;
    scene.add(sunMesh);
  }

  function addAmbientProps(THREE, scene, addEnv) {
    if (scene.userData._ambientProps) return;
    scene.userData._ambientProps = true;
    for (var i = 0; i < 25; i++) {
      var rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.8, 0),
        new THREE.MeshStandardMaterial({ color: 0x6a6a62, roughness: 0.95, flatShading: true })
      );
      rock.position.set((Math.random() - 0.5) * 160, 0.2, (Math.random() - 0.5) * 160);
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      rock.castShadow = true;
      if (addEnv) addEnv(rock); else scene.add(rock);
    }
    for (var b = 0; b < 30; b++) {
      var bush = new THREE.Mesh(
        new THREE.SphereGeometry(0.5 + Math.random() * 0.6, 6, 5),
        new THREE.MeshStandardMaterial({ color: 0x2a5a28, roughness: 1 })
      );
      bush.position.set((Math.random() - 0.5) * 150, 0.4, (Math.random() - 0.5) * 150);
      bush.scale.y = 0.6 + Math.random() * 0.4;
      if (addEnv) addEnv(bush); else scene.add(bush);
    }
  }

  function polishRenderer(THREE, renderer) {
    if (!renderer) return;
    try {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      if (THREE.ACESFilmicToneMapping) {
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;
      }
      if (THREE.SRGBColorSpace && renderer.outputColorSpace !== undefined)
        renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    } catch (e) {}
  }

  function boostAll() {
    var THREE = window.THREE, scene = window.__FPV_SCENE;
    if (!THREE || !scene) return;
    enhanceLighting(THREE, scene);
    enhanceGround(THREE, scene);
    enhanceBuildings(THREE, scene);
    addSkyDome(THREE, scene);
    addAmbientProps(THREE, scene, null);
    polishRenderer(THREE, window.__FPV_RENDERER);
    var drone = window.__FPV_DRONE;
    if (drone && !drone.userData._blobShadow) {
      var blob = new THREE.Mesh(
        new THREE.CircleGeometry(0.45, 16),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false })
      );
      blob.rotation.x = -Math.PI / 2;
      blob.position.y = 0.02;
      drone.add(blob);
      drone.userData._blobShadow = blob;
    }
  }

  var frames = 0;
  function loop() {
    frames++;
    if (window.__FPV_SCENE && window.THREE) {
      if (frames < 5 || frames % 90 === 0) boostAll();
    }
    requestAnimationFrame(loop);
  }

  setInterval(function () {
    if (typeof window.__FPV_AFTER_MAP === 'function' && !window.__FPV_AFTER_MAP._viz) {
      var orig = window.__FPV_AFTER_MAP;
      window.__FPV_AFTER_MAP = function (mapId, scene, addEnv, THREE, drone, camera) {
        orig(mapId, scene, addEnv, THREE, drone, camera);
        window.THREE = THREE;
        window.__FPV_SCENE = scene;
        window.__FPV_DRONE = drone;
        setTimeout(function () {
          enhanceLighting(THREE, scene);
          enhanceGround(THREE, scene);
          enhanceBuildings(THREE, scene);
          addSkyDome(THREE, scene);
          addAmbientProps(THREE, scene, addEnv);
          polishRenderer(THREE, window.__FPV_RENDERER);
        }, 120);
      };
      window.__FPV_AFTER_MAP._viz = true;
    }
  }, 500);

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', function () { requestAnimationFrame(loop); });
  else requestAnimationFrame(loop);
})();
