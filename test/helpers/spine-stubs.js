// Minimal DOM and Spine runtime stubs so the viewer island can be driven in
// Node. The viewer only touches a narrow slice of both: element creation with
// class-tagged markup, a <select>, and the SpineCanvas app lifecycle.

function matches(element, selector) {
  return selector.startsWith(".") && element.classes.has(selector.slice(1));
}

export function makeElement(tag = "div") {
  const element = {
    tagName: String(tag).toUpperCase(),
    children: [],
    classes: new Set(),
    style: {},
    dataset: {},
    listeners: new Map(),
    options: [],
    disabled: false,
    value: "",
    textContent: "",
    isConnected: true,
    clientWidth: 400,
    clientHeight: 300,
    innerHTMLValue: "",

    get className() {
      return Array.from(element.classes).join(" ");
    },
    set className(value) {
      element.classes = new Set(String(value).split(/\s+/).filter(Boolean));
    },

    get innerHTML() {
      return element.innerHTMLValue;
    },
    // Good enough for this viewer: every child it later queries carries a class
    // attribute in the template string.
    set innerHTML(value) {
      element.innerHTMLValue = String(value);
      element.children = [];
      element.options = [];
      for (const match of String(value).matchAll(/class="([^"]+)"/g)) {
        const child = makeElement("div");
        child.className = match[1];
        element.children.push(child);
      }
    },

    classList: {
      add: (...names) => names.forEach((name) => element.classes.add(name)),
      remove: (...names) => names.forEach((name) => element.classes.delete(name)),
      toggle: (name, force) => (force ? element.classes.add(name) : element.classes.delete(name)),
      contains: (name) => element.classes.has(name),
    },

    append: (...kids) => element.children.push(...kids),
    appendChild(kid) {
      element.children.push(kid);
      if (kid.tagName === "OPTION") element.options.push(kid);
      return kid;
    },
    replaceChildren: (...kids) => {
      element.children = kids;
    },

    querySelector(selector) {
      for (const child of element.children) {
        if (matches(child, selector)) return child;
        const nested = child.querySelector?.(selector);
        if (nested) return nested;
      }
      return null;
    },
    querySelectorAll() {
      return [];
    },

    addEventListener: (type, listener) => element.listeners.set(type, listener),
    dispatch: (type, event) => element.listeners.get(type)?.(event),

    getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 300 }),
    requestFullscreen() {},
  };

  return element;
}

export function installDom() {
  const document = {
    createElement: (tag) => makeElement(tag),
    querySelectorAll: () => [],
    head: makeElement("head"),
    body: makeElement("body"),
    fullscreenElement: null,
    addEventListener() {},
  };

  globalThis.document = document;
  globalThis.window = {
    document,
    // No-op: the atlas metadata race must settle on the fetch, and a real timer
    // would keep the test process alive.
    setTimeout: () => 0,
    addEventListener() {},
  };
  globalThis.fetch = async () => ({ ok: true, text: async () => "size: 1024,1024\npma: false\n" });

  return document;
}

// `layerAnimations` maps a skeleton URL to that layer's [{name, duration}].
export function installSpineRuntime(layerAnimations) {
  const states = [];

  class AnimationState {
    constructor(stateData) {
      this.skeletonData = stateData.skeletonData;
      this.current = null;
      this.time = 0;
      states.push(this);
    }
    setAnimation(_track, name, _loop) {
      const animation = this.skeletonData.findAnimation(name);
      // Mirrors the real runtime, which throws before touching the track.
      if (!animation) throw new Error(`Animation not found: ${name}`);
      this.current = { animation };
      this.time = 0;
      return this.current;
    }
    getCurrent() {
      return this.current;
    }
    update(delta) {
      this.time += delta;
    }
    apply() {}
  }

  const runtime = {
    states,
    lastCanvas: null,
    Physics: { update: "physics-update" },
    ResizeMode: { Expand: "expand" },
    Vector2: class {
      constructor() {
        this.x = 0;
        this.y = 0;
      }
    },
    Vector3: class {
      constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
      }
    },
    AtlasAttachmentLoader: class {
      constructor(atlas) {
        this.atlas = atlas;
      }
    },
    SkeletonBinary: class {
      readSkeletonData(skeletonUrl) {
        const animations = (layerAnimations[skeletonUrl] || []).map((a) => ({ ...a }));
        return {
          animations,
          findAnimation: (name) => animations.find((a) => a.name === name) || null,
        };
      }
    },
    Skeleton: class {
      constructor(data) {
        this.data = data;
      }
      setToSetupPose() {}
      updateWorldTransform() {}
      getBounds(offset, size) {
        offset.x = 0;
        offset.y = 0;
        size.x = 100;
        size.y = 200;
      }
    },
    AnimationStateData: class {
      constructor(skeletonData) {
        this.skeletonData = skeletonData;
        this.defaultMix = 0;
      }
    },
    AnimationState,
    SpineCanvas: class {
      constructor(canvas, { app }) {
        this.htmlCanvas = canvas;
        this.app = app;
        this.assetManager = {
          loadBinary() {},
          loadTextureAtlas() {},
          require: (url) => url,
        };
        this.renderer = {
          camera: {
            position: { set() {}, add() {} },
            zoom: 1,
            update() {},
          },
          resize() {},
          begin() {},
          drawSkeleton() {},
          end() {},
        };
        this.drawn = [];
        runtime.lastCanvas = this;
        app.loadAssets(this);
        app.initialize(this);
      }
      clear() {}
      dispose() {}
    },
  };

  globalThis.window.spine = runtime;
  return runtime;
}
