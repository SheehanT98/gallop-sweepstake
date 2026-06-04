const REFRESH_MS = 4000;
const MAP_REFRESH_MS = 90000;
const STORAGE_KEY = "shark-home-ui";

const $ = (sel) => document.querySelector(sel);

let status = null;
let mapFloor = null;
let mapBundle = null;
let refreshTimer = null;

function loadUiState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveUiState(patch) {
  const cur = loadUiState();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...cur, ...patch }));
}

function parseErrorDetail(text) {
  try {
    const j = JSON.parse(text);
    if (typeof j.detail === "string") return j.detail;
    if (j.detail?.message) return j.detail.message;
    if (typeof j.detail === "object") return JSON.stringify(j.detail);
    return text;
  } catch {
    return text;
  }
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (res.status === 503) {
    const text = await res.text();
    const detail = parseErrorDetail(text);
    if (detail.includes("setup") || detail.includes("Not connected")) {
      window.location.href = "/setup";
    }
    throw new Error(detail);
  }
  if (!res.ok) {
    throw new Error(parseErrorDetail(await res.text()) || res.statusText);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res;
}

function toast(msg, isError = false) {
  const el = $("#toast");
  el.textContent = msg;
  el.hidden = false;
  el.classList.toggle("error", isError);
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    el.hidden = true;
  }, 3200);
}

function setConnDot(connected) {
  const dot = $("#conn-dot");
  dot.classList.toggle("online", connected);
  dot.classList.toggle("offline", !connected);
  dot.title = connected ? "Connected to Shark cloud" : "Disconnected";
}

function setTab(name) {
  saveUiState({ tab: name });
  document.querySelectorAll(".tab").forEach((btn) => {
    const on = btn.dataset.tab === name;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-selected", on ? "true" : "false");
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    const on = panel.dataset.panel === name;
    panel.hidden = !on;
    panel.classList.toggle("active", on);
  });
}

function restoreRoomChecks() {
  const saved = loadUiState().rooms || [];
  document.querySelectorAll("#room-list input").forEach((el) => {
    el.checked = saved.includes(el.value);
  });
}

function persistRoomChecks() {
  saveUiState({
    rooms: [...document.querySelectorAll("#room-list input:checked")].map(
      (el) => el.value,
    ),
  });
}

function updateMainButton() {
  const btn = $("#btn-main");
  const label = $("#btn-main-label");
  if (!status) return;

  const state = status.state;
  btn.classList.remove("paused", "danger");

  if (["cleaning", "mopping", "vacuum_and_mop"].includes(state)) {
    label.textContent = "PAUSE";
    btn.dataset.action = "pause";
    btn.classList.add("paused");
  } else if (state === "returning") {
    label.textContent = "STOP RETURN";
    btn.dataset.action = "stop";
    btn.classList.add("danger");
  } else if (state === "paused") {
    label.textContent = "RESUME";
    btn.dataset.action = "clean";
  } else {
    const tab = document.querySelector(".tab.active")?.dataset.tab;
    const rooms = selectedRooms();
    if (tab === "rooms" && rooms.length) {
      label.textContent = `VACUUM ${rooms.length} ROOM${rooms.length > 1 ? "S" : ""}`;
    } else {
      label.textContent = "VACUUM";
    }
    btn.dataset.action = "clean";
  }

  $("#action-hint").textContent = status.action_hint || "";
}

function renderStatus(data) {
  status = data;
  setConnDot(data.connected !== false);
  $("#device-label").textContent = data.device_name || "Shark";
  $("#status-headline").textContent = data.headline || "—";
  $("#status-sub").textContent = [
    data.oem_model,
    data.error_text ? `Error: ${data.error_text}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const batt = data.battery_percent;
  $("#battery-value").textContent =
    batt != null && batt !== "" ? `${batt}%` : "—";

  const icon = $("#status-icon");
  if (data.charging) icon.textContent = "⚡";
  else if (["cleaning", "mopping", "vacuum_and_mop"].includes(data.state))
    icon.textContent = "🌀";
  else if (data.docked) icon.textContent = "🏠";
  else icon.textContent = "🤖";

  updateMainButton();
  renderRoomList(data.rooms || []);
  restoreRoomChecks();
  syncPowerMode(data.power_mode);

  const floor = data.default_floor || loadUiState().floor || 1;
  const select = $("#floor-select");
  if (select && String(select.value) !== String(floor)) {
    select.value = String(floor);
  }
  if (mapFloor !== floor) {
    mapFloor = floor;
    loadMap(floor);
  }

  if (data.last_success_at) {
    const t = new Date(data.last_success_at);
    $("#footer-meta").textContent = `Updated ${t.toLocaleTimeString()} · v${data.app_version || "?"}`;
  }
}

function syncPowerMode(mode) {
  if (!mode) return;
  document.querySelectorAll("#power-modes button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });
}

function renderRoomList(rooms) {
  const ul = $("#room-list");
  ul.replaceChildren();
  rooms.forEach((name, idx) => {
    const li = document.createElement("li");
    const id = `room-${idx}`;
    const label = document.createElement("label");
    label.htmlFor = id;
    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = id;
    input.value = name;
    input.addEventListener("change", persistRoomChecks);
    const span = document.createElement("span");
    span.textContent = name;
    label.append(input, span);
    li.append(label);
    ul.appendChild(li);
  });
}

function layoutRoomTags(overlayRooms) {
  const overlay = $("#room-overlay");
  overlay.replaceChildren();
  const rooms = overlayRooms?.length ? overlayRooms : (status?.rooms || []).map((n) => ({ name: n }));

  const withPos = rooms.filter((r) => r.x != null && r.y != null);
  const list = withPos.length ? withPos : rooms;

  const cols = Math.ceil(Math.sqrt(list.length || 1));
  list.forEach((room, i) => {
    const tag = document.createElement("span");
    tag.className = "room-tag";
    tag.textContent = room.name;
    let x;
    let y;
    if (room.x != null && room.y != null) {
      x = room.x * 100;
      y = room.y * 100;
    } else {
      const col = i % cols;
      const row = Math.floor(i / cols);
      x = ((col + 0.5) / cols) * 100;
      y = ((row + 0.5) / Math.ceil(list.length / cols)) * 100;
    }
    tag.style.left = `${x}%`;
    tag.style.top = `${y}%`;
    overlay.appendChild(tag);
  });
}

function drawZones(zones) {
  const canvas = $("#zone-canvas");
  const frame = $("#map-frame");
  if (!canvas || !zones?.length) {
    canvas.width = 0;
    canvas.height = 0;
    return;
  }
  const rect = frame.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  zones.forEach((z) => {
    const pts = z.points;
    if (!Array.isArray(pts) || pts.length < 3) return;
    const t = (z.type || "").toLowerCase();
    ctx.beginPath();
    pts.forEach((p, i) => {
      const x = (Array.isArray(p) ? p[0] : p.x) * canvas.width;
      const y = (Array.isArray(p) ? p[1] : p.y) * canvas.height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    if (t.includes("no") || t.includes("forbid")) {
      ctx.fillStyle = "rgba(220, 50, 50, 0.25)";
      ctx.strokeStyle = "rgba(200, 40, 40, 0.8)";
    } else {
      ctx.fillStyle = "rgba(255, 160, 0, 0.2)";
      ctx.strokeStyle = "rgba(230, 140, 0, 0.8)";
    }
    ctx.fill();
    ctx.stroke();
  });
}

async function loadMap(floor) {
  const img = $("#map-image");
  const fallback = $("#map-fallback");

  try {
    mapBundle = await api(`/api/map/info?floor=${floor}`);
    layoutRoomTags(mapBundle.rooms_overlay);
    drawZones(mapBundle.zones_overlay);

    if (!mapBundle.has_image) {
      fallback.hidden = false;
      img.hidden = true;
      const hint = mapBundle.error || mapBundle.mime || "unknown format";
      fallback.innerHTML = `<p>Map image not decoded yet (${hint}).<br/>Room cleaning still works.</p>`;
      return;
    }

    const bust = Date.now();
    img.onload = () => {
      fallback.hidden = true;
      img.hidden = false;
      drawZones(mapBundle.zones_overlay);
    };
    img.onerror = () => {
      fallback.hidden = false;
      img.hidden = true;
      fallback.textContent = "Could not load map image.";
    };
    img.src = `/api/map/image?floor=${floor}&_=${bust}`;
  } catch (e) {
    fallback.hidden = false;
    img.hidden = true;
    fallback.textContent = e.message;
    layoutRoomTags(null);
  }
}

async function refreshStatus() {
  try {
    const data = await api("/api/status");
    renderStatus(data);
  } catch (e) {
    setConnDot(false);
    $("#status-headline").textContent = "Connection error";
    $("#status-sub").textContent = e.message;
    if (String(e.message).toLowerCase().includes("not connected")) {
      setTimeout(() => {
        window.location.href = "/setup";
      }, 1500);
    }
  }
}

function selectedRooms() {
  return [...document.querySelectorAll("#room-list input:checked")].map(
    (el) => el.value,
  );
}

async function onMainAction() {
  const action = $("#btn-main").dataset.action || "clean";
  try {
    if (action === "pause") {
      await api("/api/pause", { method: "POST" });
      toast("Paused");
    } else if (action === "stop") {
      await api("/api/stop", { method: "POST" });
      toast("Stopped");
    } else {
      const tab = document.querySelector(".tab.active")?.dataset.tab;
      if (tab === "rooms") {
        const rooms = selectedRooms();
        if (!rooms.length) {
          toast("Select at least one room", true);
          return;
        }
        await api("/api/clean", {
          method: "POST",
          body: JSON.stringify({ rooms }),
        });
        toast(`Cleaning: ${rooms.join(", ")}`);
      } else {
        await api("/api/clean", { method: "POST", body: JSON.stringify({}) });
        toast("Whole-home clean started");
      }
    }
    await refreshStatus();
  } catch (e) {
    toast(e.message, true);
  }
}

async function openDevicePicker() {
  const dialog = $("#device-dialog");
  const list = $("#device-list");
  list.replaceChildren();
  try {
    const { devices } = await api("/api/devices");
    if (devices.length <= 1) {
      toast(devices.length ? "Only one robot on account" : "No robots");
      return;
    }
    devices.forEach((d) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "device-option" + (d.selected ? " selected" : "");
      btn.textContent = `${d.name} (${d.oem_model})`;
      btn.addEventListener("click", async () => {
        await api("/api/devices/select", {
          method: "POST",
          body: JSON.stringify({ dsn: d.dsn }),
        });
        dialog.close();
        toast(`Selected ${d.name}`);
        mapFloor = null;
        await refreshStatus();
      });
      li.append(btn);
      list.append(li);
    });
    dialog.showModal();
  } catch (e) {
    toast(e.message, true);
  }
}

function bindEvents() {
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => setTab(btn.dataset.tab));
  });

  $("#btn-main").addEventListener("click", onMainAction);
  $("#btn-device-picker").addEventListener("click", openDevicePicker);
  $("#btn-close-devices").addEventListener("click", () => $("#device-dialog").close());

  $("#btn-dock").addEventListener("click", async () => {
    try {
      await api("/api/dock", { method: "POST" });
      toast("Returning to dock");
      await refreshStatus();
    } catch (e) {
      toast(e.message, true);
    }
  });
  $("#btn-find").addEventListener("click", async () => {
    try {
      await api("/api/find", { method: "POST" });
      toast("Listen for beep");
    } catch (e) {
      toast(e.message, true);
    }
  });
  $("#btn-clean-rooms").addEventListener("click", async () => {
    const rooms = selectedRooms();
    if (!rooms.length) {
      toast("Select rooms first", true);
      return;
    }
    try {
      await api("/api/clean", {
        method: "POST",
        body: JSON.stringify({ rooms }),
      });
      toast(`Cleaning: ${rooms.join(", ")}`);
      await refreshStatus();
    } catch (e) {
      toast(e.message, true);
    }
  });
  $("#btn-spot").addEventListener("click", async () => {
    try {
      await api("/api/spot", { method: "POST" });
      toast("Spot clean started");
      await refreshStatus();
    } catch (e) {
      toast(e.message, true);
    }
  });

  document.querySelectorAll("#power-modes button").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await api("/api/power-mode", {
          method: "POST",
          body: JSON.stringify({ mode: btn.dataset.mode }),
        });
        syncPowerMode(btn.dataset.mode);
        toast(`Power: ${btn.dataset.mode}`);
      } catch (e) {
        toast(e.message, true);
      }
    });
  });

  $("#floor-select").addEventListener("change", async (e) => {
    const floor = parseInt(e.target.value, 10);
    saveUiState({ floor });
    try {
      await api("/api/floor", {
        method: "POST",
        body: JSON.stringify({ floor }),
      });
      mapFloor = floor;
      await loadMap(floor);
      toast(`Floor ${floor}`);
      await refreshStatus();
    } catch (err) {
      toast(err.message, true);
    }
  });

  window.addEventListener("resize", () => {
    if (mapBundle?.zones_overlay) drawZones(mapBundle.zones_overlay);
  });
}

async function init() {
  const health = await fetch("/api/health").then((r) => r.json());
  if (!health.connected) {
    window.location.href = "/setup";
    return;
  }

  bindEvents();
  const saved = loadUiState();
  if (saved.tab) setTab(saved.tab);
  if (saved.floor) {
    $("#floor-select").value = String(saved.floor);
    mapFloor = saved.floor;
  }

  await refreshStatus();
  refreshTimer = setInterval(refreshStatus, REFRESH_MS);
  setInterval(() => {
    if (mapFloor) loadMap(mapFloor);
  }, MAP_REFRESH_MS);
}

init();
