const RESOLUTION_PRESETS = [
  { id: "1280x720", label: "1280×720 (16:9 HD)", x: 1280, y: 720 },
  { id: "1600x900", label: "1600×900 (16:9)", x: 1600, y: 900 },
  { id: "1920x1080", label: "1920×1080 (16:9 Full HD)", x: 1920, y: 1080 },
  { id: "2560x1440", label: "2560×1440 (16:9 QHD)", x: 2560, y: 1440 },
  { id: "3840x2160", label: "3840×2160 (16:9 4K)", x: 3840, y: 2160 },
  { id: "1280x800", label: "1280×800 (16:10 Steam Deck)", x: 1280, y: 800 },
  { id: "1440x900", label: "1440×900 (16:10)", x: 1440, y: 900 },
  { id: "1680x1050", label: "1680×1050 (16:10)", x: 1680, y: 1050 },
  { id: "1920x1200", label: "1920×1200 (16:10)", x: 1920, y: 1200 },
  { id: "2560x1600", label: "2560×1600 (16:10)", x: 2560, y: 1600 },
  { id: "2560x1080", label: "2560×1080 (21:9 ultrawide)", x: 2560, y: 1080 },
  { id: "3440x1440", label: "3440×1440 (21:9 ultrawide)", x: 3440, y: 1440 },
  { id: "3840x1600", label: "3840×1600 (24:10 ultrawide)", x: 3840, y: 1600 },
  { id: "1024x768", label: "1024×768 (4:3 test)", x: 1024, y: 768 },
  { id: "1280x1024", label: "1280×1024 (5:4 test)", x: 1280, y: 1024 },
  { id: "custom", label: "Custom", x: 0, y: 0 }
];

const COMPONENTS = {
  "station-window": {
    label: "Station Window",
    category: "container",
    canHaveChildren: true,
    dataClass: "cImGuiWindowData",
    factory: "StationGui_CreateDefaultWindowData()",
    defaultSettingsText: ""
  },
  "group": {
    label: "Group",
    category: "container",
    canHaveChildren: true
  },
  "station-button": {
    label: "Station Button",
    category: "element",
    dataClass: "cImGuiButtonData",
    factory: "StationGui_CreateDefaultButtonData()",
    defaultSettingsText: ""
  },
  "station-toggle-button": {
    label: "Station Toggle",
    category: "element",
    dataClass: "cImGuiButtonData",
    factory: "StationGui_CreateToggleButtonData()",
    defaultSettingsText: ""
  },
  "label": {
    label: "Label",
    category: "element"
  },
  "text-frame": {
    label: "Text Frame",
    category: "element",
    dataClass: "cImGuiTextFrameData",
    factory: "StationGui_CreateDefaultTextFrameData()",
    defaultSettingsText: ""
  },
  "image": {
    label: "Image",
    category: "element"
  },
  "gauge": {
    label: "Gauge",
    category: "element",
    dataClass: "cImGuiGaugeData",
    factory: "StationGui_CreateDefaultGaugeData()",
    defaultSettingsText: ""
  },
  "fill": {
    label: "Fill / Frame",
    category: "element"
  },
  "station-numpad": {
    label: "Numpad helper",
    category: "helper",
    warning: "StationGui_Numpad is a stock helper. Placement is passed through its position/size parameters."
  },
  "station-text-reader-single": {
    label: "Text Reader helper",
    category: "helper",
    dataClass: "cStationGui_TextReaderSettings",
    factory: "cStationGui_TextReaderSettings()",
    defaultSettingsText: "mvTextFontSize=ImGui_NrmSizeKeepRatio(0.0325f)\nmbDrawAppIcon=true\nmbFullScreen=false"
  },
  "advanced-imgui": {
    label: "Advanced HPS",
    category: "advanced"
  }
};

const BLOCK_DEFAULTS = {
  "station-window": {
    caption: "MainWindow",
    text: "",
    parentId: "screen",
    xN: 0.1,
    yN: 0.1,
    wN: 0.8,
    hN: 0.72,
    z: 1
  },
  "group": {
    caption: "Group",
    parentId: "screen",
    xN: 0.1,
    yN: 0.1,
    wN: 0.5,
    hN: 0.5,
    z: 1
  },
  "station-button": {
    caption: "Confirm",
    parentId: "screen",
    xN: 0.65,
    yN: 0.82,
    wN: 0.25,
    hN: 0.1,
    z: 1
  },
  "station-toggle-button": {
    caption: "Toggle",
    parentId: "screen",
    xN: 0.65,
    yN: 0.7,
    wN: 0.25,
    hN: 0.1,
    z: 1
  },
  "label": {
    caption: "LabelText",
    parentId: "screen",
    xN: 0.1,
    yN: 0.1,
    wN: 0.4,
    hN: 0.08,
    z: 1
  },
  "text-frame": {
    caption: "BodyText",
    text: "BodyTextEntry",
    parentId: "screen",
    xN: 0.45,
    yN: 0.12,
    wN: 0.5,
    hN: 0.55,
    z: 1
  },
  "image": {
    caption: "Image",
    arg: "my_image",
    parentId: "screen",
    xN: 0.05,
    yN: 0.12,
    wN: 0.35,
    hN: 0.45,
    z: 1
  },
  "gauge": {
    caption: "Gauge",
    arg: "0.5f",
    parentId: "screen",
    xN: 0.1,
    yN: 0.78,
    wN: 0.5,
    hN: 0.08,
    z: 1
  },
  "fill": {
    caption: "Fill",
    parentId: "screen",
    xN: 0,
    yN: 0,
    wN: 1,
    hN: 1,
    z: 0
  },
  "station-numpad": {
    caption: "EnterCode",
    arg: "4",
    parentId: "screen",
    xN: 0.125,
    yN: 0.1,
    wN: 0.75,
    hN: 0.8,
    z: 1.5
  },
  "station-text-reader-single": {
    caption: "SystemStatus",
    text: "SystemStatusBody",
    parentId: "screen",
    xN: 0.05,
    yN: 0.02,
    wN: 0.9,
    hN: 0.775,
    z: 1
  },
  "advanced-imgui": {
    caption: "Advanced",
    code: "// Custom HPS here.",
    parentId: "screen",
    xN: 0.1,
    yN: 0.1,
    wN: 0.3,
    hN: 0.2,
    z: 1
  }
};

const DEFAULT_DOC = {
  schemaVersion: 3,
  target: "terminal-on-gui",
  functionName: "DrawGeneratedCustomScreen",
  translationCategory: "GeneratedTerminal",
  previewResolution: { x: 1280, y: 800 },
  resolutionPreset: "1280x800",
  gridSize: 10,
  snapToGrid: true,
  selectedBlockId: "MainWindow",
  blocks: [
    makeBlock("station-window", "MainWindow", {
      caption: "MyWindowCaption",
      parentId: "screen",
      xN: 0.1,
      yN: 0.1,
      wN: 0.8,
      hN: 0.72,
      z: 1
    }),
    makeBlock("image", "InfoImage", {
      caption: "Info image",
      arg: "my_image",
      parentId: "MainWindow",
      xN: 0.05,
      yN: 0.1,
      wN: 0.35,
      hN: 0.45,
      z: 1
    }),
    makeBlock("text-frame", "BodyText", {
      caption: "Body text",
      text: "MyTextEntry",
      parentId: "MainWindow",
      xN: 0.45,
      yN: 0.1,
      wN: 0.5,
      hN: 0.55,
      z: 1
    }),
    makeBlock("station-button", "ConfirmButton", {
      caption: "Confirm",
      parentId: "MainWindow",
      xN: 0.7,
      yN: 0.85,
      wN: 0.25,
      hN: 0.1,
      z: 1
    })
  ]
};

const state = {
  doc: clone(DEFAULT_DOC),
  selectedId: DEFAULT_DOC.selectedBlockId,
  previewTab: "hps",
  drag: null
};

const el = {
  targetSelect: document.getElementById("targetSelect"),
  functionNameInput: document.getElementById("functionNameInput"),
  translationCategoryInput: document.getElementById("translationCategoryInput"),
  resolutionPresetSelect: document.getElementById("resolutionPresetSelect"),
  widthInput: document.getElementById("widthInput"),
  heightInput: document.getElementById("heightInput"),
  gridInput: document.getElementById("gridInput"),
  snapInput: document.getElementById("snapInput"),
  useBrowserSizeBtn: document.getElementById("useBrowserSizeBtn"),
  canvas: document.getElementById("canvas"),
  canvasInfo: document.getElementById("canvasInfo"),
  hierarchy: document.getElementById("hierarchy"),
  validationList: document.getElementById("validationList"),
  emptySelection: document.getElementById("emptySelection"),
  propertiesForm: document.getElementById("propertiesForm"),
  codePreview: document.getElementById("codePreview"),
  copyCodeBtn: document.getElementById("copyCodeBtn"),
  tabHps: document.getElementById("tabHps"),
  tabPreload: document.getElementById("tabPreload"),
  propId: document.getElementById("propId"),
  propType: document.getElementById("propType"),
  propX: document.getElementById("propX"),
  propY: document.getElementById("propY"),
  propW: document.getElementById("propW"),
  propH: document.getElementById("propH"),
  propZ: document.getElementById("propZ"),
  propState: document.getElementById("propState"),
  propCaption: document.getElementById("propCaption"),
  propText: document.getElementById("propText"),
  propArg: document.getElementById("propArg"),
  propItems: document.getElementById("propItems"),
  propSettings: document.getElementById("propSettings"),
  propCode: document.getElementById("propCode"),
  propEnabled: document.getElementById("propEnabled"),
  propDrawBack: document.getElementById("propDrawBack")
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeBlock(type, id, overrides = {}) {
  const defaults = BLOCK_DEFAULTS[type] || BLOCK_DEFAULTS["advanced-imgui"];
  const component = COMPONENTS[type] || COMPONENTS["advanced-imgui"];

  return {
    id,
    type,
    parentId: defaults.parentId ?? "screen",
    xN: defaults.xN ?? 0.1,
    yN: defaults.yN ?? 0.1,
    wN: defaults.wN ?? 0.25,
    hN: defaults.hN ?? 0.1,
    z: defaults.z ?? 1,
    caption: defaults.caption ?? id,
    text: defaults.text ?? "",
    arg: defaults.arg ?? "",
    itemsText: defaults.itemsText ?? "",
    settingsText: component.defaultSettingsText ?? "",
    code: defaults.code ?? "",
    enabled: true,
    drawBack: false,
    ...overrides
  };
}

function selectedBlock() {
  return state.doc.blocks.find((block) => block.id === state.selectedId) || null;
}

function getBlock(id) {
  return state.doc.blocks.find((block) => block.id === id) || null;
}

function getChildren(parentId) {
  return state.doc.blocks.filter((block) => block.parentId === parentId);
}

function isContainer(block) {
  return !!COMPONENTS[block?.type]?.canHaveChildren;
}

function cloneDoc() {
  return clone(DEFAULT_DOC);
}

function asNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeString(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, "\\\"")
    .replace(/\r?\n/g, "\\n");
}

function validIdentifier(name) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

function safeId(value, fallback = "Item") {
  const clean = String(value || fallback).replace(/[^A-Za-z0-9_]/g, "");
  return validIdentifier(clean) ? clean : fallback;
}

function uniqueId(base) {
  const cleanBase = safeId(base, "Item");
  let id = cleanBase;
  let i = 1;
  while (state.doc.blocks.some((block) => block.id === id) || id === "screen") {
    id = `${cleanBase}${i++}`;
  }
  return id;
}

function getPreviewSize() {
  return {
    x: Math.max(1, asNumber(state.doc.previewResolution.x, 1280)),
    y: Math.max(1, asNumber(state.doc.previewResolution.y, 800))
  };
}

function nrm(value) {
  return Number(value).toFixed(4).replace(/0+$/, "").replace(/\.$/, "") || "0";
}

function detectPreset() {
  const size = getPreviewSize();
  const preset = RESOLUTION_PRESETS.find((candidate) => candidate.x === size.x && candidate.y === size.y);
  return preset?.id || "custom";
}

function parentAbsRect(block) {
  if (!block || block.parentId === "screen") {
    return { x: 0, y: 0, w: getPreviewSize().x, h: getPreviewSize().y };
  }

  const parent = getBlock(block.parentId);
  if (!parent) return { x: 0, y: 0, w: getPreviewSize().x, h: getPreviewSize().y };
  return absoluteRect(parent);
}

function absoluteRect(block) {
  const parent = parentAbsRect(block);
  return {
    x: parent.x + block.xN * parent.w,
    y: parent.y + block.yN * parent.h,
    w: block.wN * parent.w,
    h: block.hN * parent.h
  };
}

function snapPx(value) {
  if (!state.doc.snapToGrid) return value;
  const grid = Math.max(1, state.doc.gridSize || 10);
  return Math.round(value / grid) * grid;
}

function render() {
  syncDocumentControls();
  renderCanvas();
  renderHierarchy();
  renderProperties();
  renderValidation();
  renderPreview();
}

function syncDocumentControls() {
  el.targetSelect.value = state.doc.target;
  el.functionNameInput.value = state.doc.functionName;
  el.translationCategoryInput.value = state.doc.translationCategory;
  el.widthInput.value = state.doc.previewResolution.x;
  el.heightInput.value = state.doc.previewResolution.y;
  el.gridInput.value = state.doc.gridSize;
  el.snapInput.checked = state.doc.snapToGrid;

  el.resolutionPresetSelect.innerHTML = "";
  for (const preset of RESOLUTION_PRESETS) {
    el.resolutionPresetSelect.add(new Option(preset.label, preset.id));
  }
  el.resolutionPresetSelect.value = state.doc.resolutionPreset || detectPreset();

  const size = getPreviewSize();
  const aspect = (size.x / size.y).toFixed(3);
  el.canvasInfo.textContent = `${size.x}×${size.y}px · aspect ${aspect} · ${state.doc.blocks.length} elements`;
}

function renderCanvas() {
  const size = getPreviewSize();
  const maxPreviewWidth = 980;
  const scale = Math.min(1, maxPreviewWidth / size.x);

  el.canvas.innerHTML = "";
  el.canvas.style.width = `${size.x}px`;
  el.canvas.style.height = `${size.y}px`;
  el.canvas.style.transform = `scale(${scale})`;
  el.canvas.style.marginBottom = `${size.y * (scale - 1)}px`;
  el.canvas.style.backgroundSize = `${state.doc.gridSize}px ${state.doc.gridSize}px`;

  const sorted = [...state.doc.blocks].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
  for (const block of sorted) {
    const rect = absoluteRect(block);
    const node = document.createElement("div");
    node.className = `widget widget-${cssType(block.type)}${block.id === state.selectedId ? " selected" : ""}`;
    node.dataset.id = block.id;
    node.style.left = `${rect.x}px`;
    node.style.top = `${rect.y}px`;
    node.style.width = `${Math.max(4, rect.w)}px`;
    node.style.height = `${Math.max(4, rect.h)}px`;
    node.style.zIndex = String(Math.round((block.z ?? 0) * 10));
    node.title = `${block.id} (${block.type}) parent=${block.parentId}`;

    const title = document.createElement("span");
    title.className = "widget-title";
    title.textContent = `${block.caption || block.id} · ${COMPONENTS[block.type]?.label || block.type}`;
    node.appendChild(title);

    const handle = document.createElement("span");
    handle.className = "resize-handle";
    node.appendChild(handle);

    node.addEventListener("mousedown", (event) => startDrag(event, block.id, false));
    handle.addEventListener("mousedown", (event) => startDrag(event, block.id, true));
    el.canvas.appendChild(node);
  }
}

function cssType(type) {
  if (type.includes("button")) return "button";
  if (type === "image") return "image";
  if (type === "text-frame" || type === "label") return "textbox";
  if (type === "gauge") return "gauge";
  if (type === "fill") return "frame";
  return "frame";
}

function renderHierarchy() {
  el.hierarchy.innerHTML = "";

  const addItems = (parentId, depth) => {
    for (const block of getChildren(parentId)) {
      const item = document.createElement("div");
      item.className = `hierarchy-item${block.id === state.selectedId ? " selected" : ""}`;
      item.style.marginLeft = `${depth * 12}px`;
      item.innerHTML = `<span>${block.id}</span><small>${COMPONENTS[block.type]?.label || block.type}</small>`;
      item.addEventListener("click", () => {
        state.selectedId = block.id;
        render();
      });
      el.hierarchy.appendChild(item);
      addItems(block.id, depth + 1);
    }
  };

  const root = document.createElement("div");
  root.className = "hierarchy-item";
  root.innerHTML = `<span>screen</span><small>root</small>`;
  el.hierarchy.appendChild(root);
  addItems("screen", 1);
}

function renderProperties() {
  const block = selectedBlock();
  if (!block) {
    el.emptySelection.classList.remove("hidden");
    el.propertiesForm.classList.add("hidden");
    return;
  }

  el.emptySelection.classList.add("hidden");
  el.propertiesForm.classList.remove("hidden");

  el.propId.value = block.id;
  el.propType.value = block.type;
  el.propX.value = nrm(block.xN * 100);
  el.propY.value = nrm(block.yN * 100);
  el.propW.value = nrm(block.wN * 100);
  el.propH.value = nrm(block.hN * 100);
  el.propZ.value = block.z ?? 0;
  el.propState.value = block.parentId ?? "screen";
  el.propCaption.value = block.caption ?? "";
  el.propText.value = block.text ?? "";
  el.propArg.value = block.arg ?? "";
  el.propItems.value = block.itemsText ?? "";
  el.propSettings.value = block.settingsText ?? "";
  el.propCode.value = block.code ?? "";
  el.propEnabled.checked = block.enabled !== false;
  el.propDrawBack.checked = block.drawBack !== false;
}

function validateDocument(doc) {
  const errors = [];
  if (!validIdentifier(doc.functionName)) errors.push("Function name must be a valid AngelScript identifier.");
  if (!doc.translationCategory) errors.push("Translation category is recommended for generated GUI text.");
  if (doc.previewResolution.x <= 0 || doc.previewResolution.y <= 0) errors.push("Preview resolution must be positive.");

  const ids = new Set();
  for (const block of doc.blocks) {
    if (!validIdentifier(block.id)) errors.push(`${block.id}: element ID must be a valid identifier.`);
    if (ids.has(block.id)) errors.push(`${block.id}: duplicate element ID.`);
    ids.add(block.id);

    if (block.parentId !== "screen") {
      const parent = getBlock(block.parentId);
      if (!parent) errors.push(`${block.id}: parent '${block.parentId}' does not exist.`);
      else if (!isContainer(parent)) errors.push(`${block.id}: parent '${block.parentId}' is not a container.`);
    }

    if (block.xN < 0 || block.yN < 0 || block.wN <= 0 || block.hN <= 0) {
      errors.push(`${block.id}: normalized position/size must be positive.`);
    }
    if (block.xN + block.wN > 1.001 || block.yN + block.hN > 1.001) {
      errors.push(`${block.id}: element extends outside its parent coordinate space.`);
    }

    const component = COMPONENTS[block.type];
    if (component?.warning) errors.push(`${block.id}: ${component.warning}`);
  }

  return [...new Set(errors)];
}

function renderValidation() {
  const errors = validateDocument(state.doc);
  el.validationList.innerHTML = "";
  el.validationList.classList.toggle("ok", errors.length === 0);

  if (errors.length === 0) {
    const item = document.createElement("li");
    item.textContent = "No validation issues.";
    el.validationList.appendChild(item);
    return;
  }

  for (const error of errors) {
    const item = document.createElement("li");
    item.textContent = error;
    el.validationList.appendChild(item);
  }
}

function renderPreview() {
  el.tabHps.classList.toggle("active", state.previewTab === "hps");
  el.tabPreload.classList.toggle("active", state.previewTab === "preload");
  el.codePreview.textContent = state.previewTab === "preload" ? generatePreloadSnippet() : generateHps(state.doc);
}

function startDrag(event, id, resize) {
  event.preventDefault();
  event.stopPropagation();

  const block = getBlock(id);
  if (!block) return;

  state.selectedId = id;
  state.drag = {
    id,
    resize,
    startClientX: event.clientX,
    startClientY: event.clientY,
    startXN: block.xN,
    startYN: block.yN,
    startWN: block.wN,
    startHN: block.hN
  };

  window.addEventListener("mousemove", onPointerMove);
  window.addEventListener("mouseup", endDrag);
  render();
}

function onPointerMove(event) {
  if (!state.drag) return;
  const block = getBlock(state.drag.id);
  if (!block) return;

  const parent = parentAbsRect(block);
  const scale = Math.min(1, 980 / getPreviewSize().x);
  const dxPx = (event.clientX - state.drag.startClientX) / scale;
  const dyPx = (event.clientY - state.drag.startClientY) / scale;

  if (state.drag.resize) {
    const wPx = snapPx(state.drag.startWN * parent.w + dxPx);
    const hPx = snapPx(state.drag.startHN * parent.h + dyPx);
    block.wN = clamp(Math.max(4, wPx) / parent.w, 0.001, 1 - block.xN);
    block.hN = clamp(Math.max(4, hPx) / parent.h, 0.001, 1 - block.yN);
  } else {
    const xPx = snapPx(state.drag.startXN * parent.w + dxPx);
    const yPx = snapPx(state.drag.startYN * parent.h + dyPx);
    block.xN = clamp(xPx / parent.w, 0, 1 - block.wN);
    block.yN = clamp(yPx / parent.h, 0, 1 - block.hN);
  }

  render();
}

function endDrag() {
  state.drag = null;
  window.removeEventListener("mousemove", onPointerMove);
  window.removeEventListener("mouseup", endDrag);
}

function addBlock(type) {
  const selected = selectedBlock();
  const parentId = isContainer(selected) ? selected.id : selected?.parentId || "screen";
  const base = COMPONENTS[type]?.label?.replace(/\s+/g, "") || type;
  const id = uniqueId(base);
  const block = makeBlock(type, id, { parentId });
  state.doc.blocks.push(block);
  state.selectedId = id;
  render();
}

function updateSelectedFromForm() {
  const block = selectedBlock();
  if (!block) return;

  const oldId = block.id;
  const nextId = el.propId.value.trim();
  if (nextId && nextId !== oldId && !state.doc.blocks.some((candidate) => candidate.id === nextId)) {
    block.id = nextId;
    for (const child of state.doc.blocks) {
      if (child.parentId === oldId) child.parentId = nextId;
    }
    state.selectedId = nextId;
  }

  block.xN = clamp(asNumber(el.propX.value, block.xN * 100) / 100, 0, 1);
  block.yN = clamp(asNumber(el.propY.value, block.yN * 100) / 100, 0, 1);
  block.wN = clamp(asNumber(el.propW.value, block.wN * 100) / 100, 0.001, 1 - block.xN);
  block.hN = clamp(asNumber(el.propH.value, block.hN * 100) / 100, 0.001, 1 - block.yN);
  block.z = asNumber(el.propZ.value, block.z);
  block.parentId = el.propState.value.trim() || "screen";
  block.caption = el.propCaption.value;
  block.text = el.propText.value;
  block.arg = el.propArg.value;
  block.itemsText = el.propItems.value;
  block.settingsText = el.propSettings.value;
  block.code = el.propCode.value;
  block.enabled = el.propEnabled.checked;
  block.drawBack = el.propDrawBack.checked;

  render();
}

function deleteSelected() {
  const block = selectedBlock();
  if (!block) return;

  const idsToDelete = new Set([block.id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const candidate of state.doc.blocks) {
      if (idsToDelete.has(candidate.parentId) && !idsToDelete.has(candidate.id)) {
        idsToDelete.add(candidate.id);
        changed = true;
      }
    }
  }

  state.doc.blocks = state.doc.blocks.filter((candidate) => !idsToDelete.has(candidate.id));
  state.selectedId = state.doc.blocks[0]?.id || "";
  render();
}

function duplicateSelected() {
  const block = selectedBlock();
  if (!block) return;
  const copy = clone(block);
  copy.id = uniqueId(`${block.id}Copy`);
  copy.xN = clamp(copy.xN + 0.025, 0, 1 - copy.wN);
  copy.yN = clamp(copy.yN + 0.025, 0, 1 - copy.hN);
  copy.z = asNumber(copy.z, 1) + 0.1;
  state.doc.blocks.push(copy);
  state.selectedId = copy.id;
  render();
}

function parseLines(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parsePipe(line) {
  return line.split("|").map((part) => part.trim());
}

function generatePreloadSnippet() {
  return [
    "// Add this to a preload/setup path used by the map before the GUI is shown.",
    "void OnGui(float afTimeStep)",
    "{",
    "\tStationGui_PreloadDefault();",
    "}"
  ].join("\n");
}

function generateHps(doc) {
  const lines = [
    '#include "custom_depth/helper_custom_depth_imgui/helper_imgui_station.hps"',
    '#include "custom_depth/helper_custom_depth_imgui/helper_imgui_station_apps_common.hps"',
    '#include "custom_depth/helper_custom_depth_imgui/helper_imgui_station_app_numpad.hps"',
    "",
    generateFunctionHeader(doc),
    "{",
    `\tImGui_SetTransCategory("${escapeString(doc.translationCategory)}");`,
    ""
  ];

  for (const block of getChildren("screen").sort((a, b) => (a.z ?? 0) - (b.z ?? 0))) {
    emitBlock(lines, block, "\t", false);
  }

  lines.push("}");
  return lines.join("\n");
}

function generateFunctionHeader(doc) {
  if (doc.target === "map-on-gui") return `void ${doc.functionName}(float afTimeStep)`;
  if (doc.target === "helper-function") return `void ${doc.functionName}(float afTimeStep)`;
  return `void ${doc.functionName}(const tString&in asEntityName, float afTimeStep)`;
}

function emitBlock(lines, block, indent, parentIsGroup) {
  const component = COMPONENTS[block.type] || {};
  const settingsVar = emitDataVar(lines, block, indent);

  switch (block.type) {
    case "station-window":
      lines.push(`${indent}StationGui_DoWindowStart("${escapeString(block.caption)}", ${settingsVar}, ${posExpr(block, parentIsGroup)}, ${sizeExpr(block, parentIsGroup)}, true);`);
      emitChildren(lines, block, `${indent}\t`);
      lines.push(`${indent}StationGui_DoWindowEnd();`);
      break;

    case "group":
      lines.push(`${indent}ImGui_GroupBegin(${posExpr(block, parentIsGroup)}, ${sizeExpr(block, parentIsGroup)});`);
      emitChildren(lines, block, `${indent}\t`);
      lines.push(`${indent}ImGui_GroupEnd();`);
      break;

    case "station-button":
      lines.push(`${indent}if (ImGui_DoButtonExt("${escapeString(block.id)}", "${escapeString(block.caption)}", ${settingsVar}, ${posExpr(block, parentIsGroup)}, ${sizeExpr(block, parentIsGroup)}))`);
      lines.push(`${indent}{`);
      lines.push(`${indent}\t// TODO: ${block.id} pressed`);
      lines.push(`${indent}}`);
      break;

    case "station-toggle-button":
      lines.push(`${indent}bool b${safeId(block.id)} = ImGui_DoToggleButtonExt("${escapeString(block.id)}", "${escapeString(block.caption)}", ImGui_GetStateBool("${escapeString(block.id)}_Checked", false), ${settingsVar}, ${posExpr(block, parentIsGroup)}, ${sizeExpr(block, parentIsGroup)});`);
      lines.push(`${indent}ImGui_SetStateBool("${escapeString(block.id)}_Checked", b${safeId(block.id)});`);
      break;

    case "label":
      lines.push(`${indent}ImGui_DoLabel("${escapeString(block.caption)}", ${posExpr(block, parentIsGroup)}, ${sizeExpr(block, parentIsGroup)}, 1.0f);`);
      break;

    case "text-frame":
      lines.push(`${indent}ImGui_DoTextFrameExt("${escapeString(block.text || block.caption)}", 0, 0, 0, ${settingsVar}, ${posExpr(block, parentIsGroup)}, ${sizeExpr(block, parentIsGroup)});`);
      break;

    case "image":
      lines.push(`${indent}ImGui_DoImage(cImGuiGfx("${escapeString(block.arg || block.caption)}"), ${posExpr(block, parentIsGroup)}, ${sizeExpr(block, parentIsGroup)});`);
      break;

    case "gauge":
      lines.push(`${indent}ImGui_DoGauge(${settingsVar}, ${block.arg || "0.5f"}, ${posExpr(block, parentIsGroup)}, ${sizeExpr(block, parentIsGroup)});`);
      break;

    case "fill":
      lines.push(`${indent}ImGui_DoImage(cImGuiGfx(""), ${posExpr(block, parentIsGroup)}, ${sizeExpr(block, parentIsGroup)});`);
      break;

    case "station-numpad":
      lines.push(`${indent}if (StationGui_Numpad("${escapeString(block.caption)}", ${block.arg || "4"}, 0.2f, ${posExpr(block, parentIsGroup)}, ${sizeExpr(block, parentIsGroup)}))`);
      lines.push(`${indent}{`);
      lines.push(`${indent}\ttString sInput = StationGui_GetNumpadInput();`);
      lines.push(`${indent}\t// TODO: validate input`);
      lines.push(`${indent}}`);
      break;

    case "station-text-reader-single":
      lines.push(`${indent}StationGui_TextReaderSingle("${escapeString(block.caption)}", "${escapeString(block.text || block.caption)}", ${settingsVar}, ${posExpr(block, parentIsGroup)}, ${sizeExpr(block, parentIsGroup)});`);
      break;

    case "advanced-imgui":
      lines.push(`${indent}// Advanced custom code block: ${block.id}`);
      for (const line of String(block.code || "").split(/\r?\n/)) {
        lines.push(`${indent}${line}`);
      }
      break;

    default:
      lines.push(`${indent}// Unsupported block type: ${block.type}`);
      break;
  }

  if (component.canHaveChildren === true && block.type !== "station-window" && block.type !== "group") {
    emitChildren(lines, block, indent);
  }
}

function emitChildren(lines, block, indent) {
  const children = getChildren(block.id).sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
  for (const child of children) {
    emitBlock(lines, child, indent, true);
  }
}

function emitDataVar(lines, block, indent) {
  const component = COMPONENTS[block.type];
  if (!component?.dataClass) return "";

  const varName = `${safeId(block.id, "item").charAt(0).toLowerCase()}${safeId(block.id, "item").slice(1)}Data`;
  lines.push(`${indent}${component.dataClass} ${varName} = ${component.factory};`);

  for (const line of parseLines(block.settingsText || "")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//")) continue;

    if (trimmed.includes("=")) {
      const index = trimmed.indexOf("=");
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim();
      lines.push(`${indent}${varName}.${key} = ${value};`);
    } else if (trimmed.includes("(")) {
      lines.push(`${indent}${varName}.${trimmed};`);
    }
  }

  return varName;
}

function posExpr(block, parentIsGroup) {
  const fn = parentIsGroup ? "ImGui_NrmPosGroup" : "ImGui_NrmPos";
  return `${fn}(cVector3f(${nrm(block.xN)}, ${nrm(block.yN)}, ${nrm(block.z)}))`;
}

function sizeExpr(block, parentIsGroup) {
  const fn = parentIsGroup ? "ImGui_NrmSizeGroup" : "ImGui_NrmSize";
  return `${fn}(cVector2f(${nrm(block.wN)}, ${nrm(block.hN)}))`;
}

async function copyCurrentCode() {
  const text = el.codePreview.textContent || "";
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
  } else {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    document.body.removeChild(area);
  }

  const oldText = el.copyCodeBtn.textContent;
  el.copyCodeBtn.textContent = "Copied";
  setTimeout(() => {
    el.copyCodeBtn.textContent = oldText;
  }, 900);
}

function wireEvents() {
  el.targetSelect.addEventListener("change", () => {
    state.doc.target = el.targetSelect.value;
    if (state.doc.target === "map-on-gui") state.doc.functionName = "OnGui";
    if (state.doc.target === "terminal-on-gui" && state.doc.functionName === "OnGui") state.doc.functionName = "DrawGeneratedCustomScreen";
    render();
  });

  el.functionNameInput.addEventListener("input", () => {
    state.doc.functionName = el.functionNameInput.value.trim();
    render();
  });

  el.translationCategoryInput.addEventListener("input", () => {
    state.doc.translationCategory = el.translationCategoryInput.value.trim();
    render();
  });

  el.resolutionPresetSelect.addEventListener("change", () => {
    const preset = RESOLUTION_PRESETS.find((candidate) => candidate.id === el.resolutionPresetSelect.value);
    state.doc.resolutionPreset = preset?.id || "custom";
    if (preset && preset.id !== "custom") {
      state.doc.previewResolution.x = preset.x;
      state.doc.previewResolution.y = preset.y;
    }
    render();
  });

  el.widthInput.addEventListener("input", () => {
    state.doc.previewResolution.x = Math.max(1, asNumber(el.widthInput.value, 1280));
    state.doc.resolutionPreset = detectPreset();
    render();
  });

  el.heightInput.addEventListener("input", () => {
    state.doc.previewResolution.y = Math.max(1, asNumber(el.heightInput.value, 800));
    state.doc.resolutionPreset = detectPreset();
    render();
  });

  el.gridInput.addEventListener("input", () => {
    state.doc.gridSize = Math.max(1, asNumber(el.gridInput.value, 10));
    render();
  });

  el.snapInput.addEventListener("change", () => {
    state.doc.snapToGrid = el.snapInput.checked;
    render();
  });

  el.useBrowserSizeBtn.addEventListener("click", () => {
    state.doc.previewResolution.x = Math.max(1, window.innerWidth);
    state.doc.previewResolution.y = Math.max(1, window.innerHeight);
    state.doc.resolutionPreset = "custom";
    render();
  });

  document.querySelectorAll("[data-add-block]").forEach((button) => {
    button.addEventListener("click", () => addBlock(button.dataset.addBlock));
  });

  el.canvas.addEventListener("mousedown", (event) => {
    if (event.target === el.canvas) {
      state.selectedId = "";
      render();
    }
  });

  const propInputs = [
    el.propId,
    el.propX,
    el.propY,
    el.propW,
    el.propH,
    el.propZ,
    el.propState,
    el.propCaption,
    el.propText,
    el.propArg,
    el.propItems,
    el.propSettings,
    el.propCode,
    el.propEnabled,
    el.propDrawBack
  ];

  for (const input of propInputs) input.addEventListener("input", updateSelectedFromForm);
  for (const input of propInputs) input.addEventListener("change", updateSelectedFromForm);

  document.getElementById("deleteWidgetBtn").addEventListener("click", deleteSelected);
  document.getElementById("duplicateWidgetBtn").addEventListener("click", duplicateSelected);

  document.getElementById("newDocBtn").addEventListener("click", () => {
    state.doc = cloneDoc();
    state.selectedId = state.doc.selectedBlockId || "MainWindow";
    render();
  });

  el.copyCodeBtn.addEventListener("click", async () => {
    await copyCurrentCode();
  });

  el.tabHps.addEventListener("click", () => {
    state.previewTab = "hps";
    render();
  });

  el.tabPreload.addEventListener("click", () => {
    state.previewTab = "preload";
    render();
  });
}

wireEvents();
render();