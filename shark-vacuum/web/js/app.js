const REFRESH_MS = 4000;
const MAP_REFRESH_MS = 60000;

const $ = (sel) => document.querySelector(sel);

let status = null;
let mapFloor = null;

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    let detail = text;
    try {
      const j = JSON.parse(text);
      detail = j.detail || text;
    } catch {
      /* ignore */
    }
    throw new Error(detail || res.statusText);
  }
  if (res.status === 204) return null;
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

function setTab(name) {
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

function updateMainButton() {
  const btn = $("#btn-main");
  const label = $("#btn-main-label");
  if (!status) return;

  const state = status.state;
  btn.classList.remove("paused", "danger");

  if (state === "cleaning" || state === "mopping" || state === "vacuum_and_mop") {
    label.textContent = "PAUSE";
    btn.dataset.action = "pause";
    btn.classList.add("paused");
  } else if (state === "returning") {
    label.textContent = "STOP";
    btn.dataset.action = "stop";
    btn.classList.add("danger");
  } else if (state === "paused") {
    label.textContent = "RESUME";
    btn.dataset.action = "clean";
  } else {
    label.textContent = "VACUUM";
    btn.dataset.action = "clean";
  }
}

function renderStatus(data) {
  status = data;
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
  else if (data.state === "cleaning") icon.textContent = "🌀";
  else if (data.docked) icon.textContent = "🏠";
  else icon.textContent = "🤖";

  updateMainButton();
  renderRoomList(data.rooms || []);
  syncPowerMode(data.power_mode);

  const floor = data.default_floor || 1;
  const select = $("#floor-select");
  if (select && String(select.value) !== String(floor)) {
    select.value = String(floor);
  }
  if (mapFloor !== floor) {
    mapFloor = floor;
    loadMap(floor);
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
    const span = document.createElement("span");
    span.textContent = name;
    label.append(input, span);
    li.append(label);
    ul.appendChild(li);
  });
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

/** Simple grid placement for room labels when we have no coordinates */
function layoutRoomTags(rooms) {
  const overlay = $("#room-overlay");
  overlay.innerHTML = "";
  const n = rooms.length;
  if (!n) return;

  const cols = Math.ceil(Math.sqrt(n));
  rooms.forEach((name, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const tag = document.createElement("span");
    tag.className = "room-tag";
    tag.textContent = name;
    tag.style.left = `${((col + 0.5) / cols) * 100}%`;
    tag.style.top = `${((row + 0.5) / Math.ceil(n / cols)) * 100}%`;
    overlay.appendChild(tag);
  });
}

async function loadMap(floor) {
  const img = $("#map-image");
  const fallback = $("#map-fallback");

  try {
    const info = await api(`/api/map/info?floor=${floor}`);
    if (!info.has_image) {
      fallback.hidden = false;
      img.hidden = true;
      fallback.innerHTML = `<p>Map preview not available (${info.mime || "unknown format"}).<br/>Room cleaning still works.</p>`;
      layoutRoomTags(status?.rooms || []);
      return;
    }

    const bust = Date.now();
    img.onload = () => {
      fallback.hidden = true;
      img.hidden = false;
      layoutRoomTags(status?.rooms || []);
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
    layoutRoomTags(status?.rooms || []);
  }
}

async function refreshStatus() {
  try {
    const data = await api("/api/status");
    renderStatus(data);
  } catch (e) {
    $("#status-headline").textContent = "Connection error";
    $("#status-sub").textContent = e.message;
    toast(e.message, true);
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

function bindEvents() {
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => setTab(btn.dataset.tab));
  });

  $("#btn-main").addEventListener("click", onMainAction);
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

  $("#floor-select")?.addEventListener("change", async (e) => {
    const floor = parseInt(e.target.value, 10);
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
}

async function init() {
  bindEvents();
  $("#floor-picker").hidden = false;
  await refreshStatus();
  setInterval(refreshStatus, REFRESH_MS);
  setInterval(() => {
    if (mapFloor) loadMap(mapFloor);
  }, MAP_REFRESH_MS);
}

init();
