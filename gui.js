function setupGui() {
  var createHandler = function(id) {
    return function() {
      var mat_old = materials[current_material];
      mat_old.h = m_h.getValue();
      mat_old.s = m_s.getValue();
      mat_old.l = m_l.getValue();

      current_material = id;

      var mat = materials[id];
      effect.material = mat.m;

      m_h.setValue(mat.h);
      m_s.setValue(mat.s);
      m_l.setValue(mat.l);
    };
  };

  effectController = {
    material: "toon1",

    speed: 0.1,
    numBlobs: 12,
    resolution: 100,
    isolation: 200,

    floor: false,
    wallx: false,
    wallz: false,

    r: 255,
    g: 200,
    b: 0,

    lx: 1,
    ly: -1,
    lz: 1,

    postprocessing: true,
    blurLevel: 20,

    dummy: function() {}
  };

  var h, m_h, m_s, m_l;

  var gui = new dat.GUI();

  // material (type)

  h = gui.addFolder("Materials");

  for (var m in materials) {
    effectController[m] = createHandler(m);
    h.add(effectController, m).name(m);
  }

  // material (color)

  h = gui.addFolder("Material color");

  m_h = h.add(effectController, "r", 0, 255, 1);
  m_s = h.add(effectController, "g", 0, 255, 1);
  m_l = h.add(effectController, "b", 0, 255, 1);

  // light (directional)

  h = gui.addFolder("Directional light orientation");

  h.add(effectController, "lx", -1.0, 1.0, 0.025).name("x");
  h.add(effectController, "ly", -1.0, 1.0, 0.025).name("y");
  h.add(effectController, "lz", -1.0, 1.0, 0.025).name("z");

  // simulation

  h = gui.addFolder("Simulation");

  h.add(effectController, "speed", 0.1, 8.0, 0.05);
  h.add(effectController, "numBlobs", 1, 50, 1);
  h.add(effectController, "resolution", 14, 100, 1);
  h.add(effectController, "isolation", 10, 300, 1);

  h.add(effectController, "floor");
  h.add(effectController, "wallx");
  h.add(effectController, "wallz");

  // rendering

  h = gui.addFolder("Rendering");
  h.add(effectController, "postprocessing");
  h.add(effectController, "blurLevel", 0, 50, 1).name("bluriness");
}
