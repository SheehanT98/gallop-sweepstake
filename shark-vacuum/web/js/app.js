const REFRESH_MS = 4000;
const MAP_REFRESH_MS = 90000;
const POSITION_MS = 2500;
const STORAGE_KEY = "shark-home-ui";

const $ = (s) => document.querySelector(s);

let status = null;
let mapFloor = null;
let mapBundle = null;
let positionTimer = null;

function loadUiState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveUiState(patch) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...loadUiState(), ...patch }),
  );
}

function parseErrorDetail(text) {
  try {
    const j = JSON.parse(text);
    if (typeof j.detail === "string") return j.detail;
    if (j.detail?.message) return j.detail.message;
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
    const detail = parseErrorDetail(await res.text());
    if (String(detail).toLowerCase().includes("not connected")) {
      window.location.href = "/setup";
    }
    throw new Error(detail);
  }
  if (!res.ok) throw new Error(parseErrorDetail(await res.text()) || res.statusText);
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
}

function setTab(name) {
  saveUiState({ tab: name });
  document.querySelectorAll(".tab").forEach((btn) => {
    const on = btn.dataset.tab === name;
    btn.classList.toggle("active", on);
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.hidden = panel.dataset.panel !== name;
    panel.classList.toggle("active", panel.dataset.panel === name);
  });
  if (name === "schedule") loadSchedules();
  if (name === "history") loadHistory();
}

function updateRobotDot(pos) {
  const dot = $("#robot-dot");
  if (!pos?.available || pos.x == null || pos.y == null) {
    dot.hidden = true;
    return;
  }
  dot.hidden = false;
  dot.style.left = `${pos.x * 100}%`;
  dot.style.top = `${pos.y * 100}%`;
}

async function pollPosition() {
  try {
    const pos = await api("/api/map/position");
    updateRobotDot(pos);
  } catch {
    /* ignore */
  }
}

function updateMainButton() {
  const label = $("#btn-main-label");
  const btn = $("#btn-main");
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
    const n = selectedRooms().length;
    label.textContent =
      tab === "rooms" && n ? `VACUUM ${n} ROOM${n > 1 ? "S" : ""}` : "VACUUM";
    btn.dataset.action = "clean";
  }
  $("#action-hint").textContent = status.action_hint || "";
}

function renderStatus(data) {
  status = data;
  setConnDot(data.connected !== false);
  $("#device-label").textContent = data.device_name || "Shark";
  $("#status-headline").textContent = data.headline || "—";
  $("#status-sub").textContent = [data.oem_model, data.error_text && `Error: ${data.error_text}`]
    .filter(Boolean)
    .join(" · ");
  $("#battery-value").textContent =
    data.battery_percent != null ? `${data.battery_percent}%` : "—";

  const icon = $("#status-icon");
  if (data.charging) icon.textContent = "⚡";
  else if (["cleaning", "mopping", "vacuum_and_mop"].includes(data.state)) icon.textContent = "🌀";
  else if (data.docked) icon.textContent = "🏠";
  else icon.textContent = "🤖";

  updateMainButton();
  renderRoomList(data.rooms || []);
  fillScheduleRoomSelect(data.rooms || []);
  restoreRoomChecks();
  syncPowerMode(data.power_mode);

  if (data.robot_position) updateRobotDot(data.robot_position);

  const floor = data.default_floor || loadUiState().floor || 1;
  $("#floor-select").value = String(floor);
  if (mapFloor !== floor) {
    mapFloor = floor;
    loadMap(floor);
  }

  if (data.last_success_at) {
    $("#footer-meta").textContent = `Updated ${new Date(data.last_success_at).toLocaleTimeString()} · v${data.app_version || "?"}`;
  }

  const active = ["cleaning", "mopping", "vacuum_and_mop", "exploring"].includes(data.state);
  if (active && !positionTimer) {
    positionTimer = setInterval(pollPosition, POSITION_MS);
  } else if (!active && positionTimer) {
    clearInterval(positionTimer);
    positionTimer = null;
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

function fillScheduleRoomSelect(rooms) {
  const sel = $("#sched-rooms");
  if (!sel) return;
  sel.replaceChildren();
  rooms.forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    sel.appendChild(opt);
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
    rooms: [...document.querySelectorAll("#room-list input:checked")].map((el) => el.value),
  });
}

function selectedRooms() {
  return [...document.querySelectorAll("#room-list input:checked")].map((el) => el.value);
}

function layoutRoomTags(overlayRooms) {
  const overlay = $("#room-overlay");
  overlay.replaceChildren();
  const rooms = overlayRooms?.length
    ? overlayRooms
    : (status?.rooms || []).map((n) => ({ name: n }));
  const list = rooms.filter((r) => r.x != null && r.y != null).length
    ? rooms.filter((r) => r.x != null && r.y != null)
    : rooms;
  const cols = Math.ceil(Math.sqrt(list.length || 1));
  list.forEach((room, i) => {
    const tag = document.createElement("span");
    tag.className = "room-tag";
    tag.textContent = room.name;
    let x, y;
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
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
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
    ctx.beginPath();
    pts.forEach((p, i) => {
      const x = (Array.isArray(p) ? p[0] : p.x) * canvas.width;
      const y = (Array.isArray(p) ? p[1] : p.y) * canvas.height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    const t = (z.type || "").toLowerCase();
    if (t.includes("no")) {
      ctx.fillStyle = "rgba(220,50,50,0.25)";
      ctx.strokeStyle = "rgba(200,40,40,0.8)";
    } else {
      ctx.fillStyle = "rgba(255,160,0,0.2)";
      ctx.strokeStyle = "rgba(230,140,0,0.8)";
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
      fallback.innerHTML = `<p>Map not decoded. Cleaning still works.</p>`;
      return;
    }
    img.onload = () => {
      fallback.hidden = true;
      img.hidden = false;
      drawZones(mapBundle.zones_overlay);
      pollPosition();
    };
    img.onerror = () => {
      fallback.hidden = false;
      img.hidden = true;
      fallback.textContent = "Could not load map.";
    };
    img.src = `/api/map/image?floor=${floor}&_=${Date.now()}`;
  } catch (e) {
    fallback.hidden = false;
    img.hidden = true;
    fallback.textContent = e.message;
  }
}

async function refreshStatus() {
  try {
    renderStatus(await api("/api/status"));
  } catch (e) {
    setConnDot(false);
    $("#status-headline").textContent = "Connection error";
    $("#status-sub").textContent = e.message;
  }
}

async function onMainAction() {
  const action = $("#btn-main").dataset.action || "clean";
  try {
    if (action === "pause") await api("/api/pause", { method: "POST" });
    else if (action === "stop") await api("/api/stop", { method: "POST" });
    else {
      const tab = document.querySelector(".tab.active")?.dataset.tab;
      const rooms = tab === "rooms" ? selectedRooms() : null;
      if (tab === "rooms" && !rooms.length) {
        toast("Select rooms", true);
        return;
      }
      await api("/api/clean", {
        method: "POST",
        body: JSON.stringify({ rooms: rooms || null }),
      });
      toast(rooms ? `Cleaning: ${rooms.join(", ")}` : "Whole-home clean");
    }
    await refreshStatus();
  } catch (e) {
    toast(e.message, true);
  }
}

async function loadSchedules() {
  const ul = $("#schedule-list");
  ul.replaceChildren();
  try {
    const { schedules, timezone } = await api("/api/schedules");
    if (!schedules.length) {
      ul.innerHTML = `<li class="muted">No schedules. (${timezone})</li>`;
      return;
    }
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    schedules.forEach((s) => {
      const li = document.createElement("li");
      li.className = "schedule-item";
      const dayStr = (s.days || [])
        .map((d) => days[d])
        .join(", ");
      const rooms = s.rooms?.length ? s.rooms.join(", ") : "Whole home";
      li.innerHTML = `
        <div>
          <strong>${s.name}</strong>
          <span class="muted">${s.time} · ${dayStr}</span>
          <span class="muted">${rooms}</span>
        </div>`;
      const del = document.createElement("button");
      del.type = "button";
      del.className = "link-btn";
      del.textContent = "Delete";
      del.addEventListener("click", async () => {
        await api(`/api/schedules/${s.id}`, { method: "DELETE" });
        toast("Deleted");
        loadSchedules();
      });
      li.append(del);
      ul.appendChild(li);
    });
  } catch (e) {
    toast(e.message, true);
  }
}

async function loadHistory() {
  const hist = $("#history-list");
  const notify = $("#notify-list");
  hist.replaceChildren();
  notify.replaceChildren();
  try {
    const { runs } = await api("/api/history");
    if (!runs.length) {
      hist.innerHTML = `<li class="muted">No history yet. Tap Sync.</li>`;
    } else {
      runs.forEach((r) => {
        const li = document.createElement("li");
        li.className = "history-item";
        const parts = Object.entries(r)
          .filter(([k]) => !["fingerprint", "recorded_at"].includes(k))
          .slice(0, 5)
          .map(([k, v]) => `${k}: ${v}`)
          .join(" · ");
        li.textContent = parts || JSON.stringify(r);
        hist.appendChild(li);
      });
    }
    const { events, configured } = await api("/api/notifications");
    if (!configured) {
      notify.innerHTML = `<li class="muted">Add Telegram or webhook in .env</li>`;
    } else {
      events.forEach((ev) => {
        const li = document.createElement("li");
        li.className = "history-item";
        li.textContent = `${new Date(ev.at).toLocaleString()} — ${ev.title}: ${ev.body}`;
        notify.appendChild(li);
      });
    }
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
  $("#btn-close-devices")?.addEventListener("click", () => $("#device-dialog").close());
  $("#btn-dock").addEventListener("click", async () => {
    try {
      await api("/api/dock", { method: "POST" });
      toast("Docking");
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
  $("#btn-clean-rooms").addEventListener("click", onMainAction);
  $("#btn-spot").addEventListener("click", async () => {
    try {
      await api("/api/spot", { method: "POST" });
      toast("Spot clean");
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
      } catch (e) {
        toast(e.message, true);
      }
    });
  });
  $("#floor-select").addEventListener("change", async (e) => {
    const floor = parseInt(e.target.value, 10);
    saveUiState({ floor });
    await api("/api/floor", { method: "POST", body: JSON.stringify({ floor }) });
    mapFloor = floor;
    await loadMap(floor);
    await refreshStatus();
  });
  $("#schedule-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const days = [...document.querySelectorAll(".day-picks input:checked")].map(
      (el) => parseInt(el.value, 10),
    );
    const timeRaw = $("#sched-time").value;
    const rooms = [...$("#sched-rooms").selectedOptions].map((o) => o.value);
    try {
      await api("/api/schedules", {
        method: "POST",
        body: JSON.stringify({
          name: $("#sched-name").value,
          time: timeRaw,
          days,
          rooms: rooms.length ? rooms : null,
          enabled: true,
        }),
      });
      toast("Schedule saved");
      e.target.reset();
      $("#sched-time").value = timeRaw;
      loadSchedules();
    } catch (err) {
      toast(err.message, true);
    }
  });
  $("#btn-sync-history").addEventListener("click", async () => {
    try {
      const r = await api("/api/history/sync", { method: "POST" });
      toast(`Synced: ${r.added} new runs`);
      loadHistory();
    } catch (e) {
      toast(e.message, true);
    }
  });
  window.addEventListener("resize", () => {
    if (mapBundle?.zones_overlay) drawZones(mapBundle.zones_overlay);
  });
}

async function openDevicePicker() {
  const dialog = $("#device-dialog");
  const list = $("#device-list");
  list.replaceChildren();
  try {
    const { devices } = await api("/api/devices");
    if (devices.length <= 1) {
      toast("Only one robot on account");
      return;
    }
    devices.forEach((d) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "device-option";
      btn.textContent = `${d.name} (${d.oem_model})`;
      btn.addEventListener("click", async () => {
        await api("/api/devices/select", {
          method: "POST",
          body: JSON.stringify({ dsn: d.dsn }),
        });
        dialog.close();
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

async function showLanBanner() {
  try {
    const m = await api("/api/mobile-url");
    if (m.lan_mode && m.url) {
      const b = $("#lan-banner");
      b.hidden = false;
      b.innerHTML = `Phone: <a href="${m.url}">${m.url}</a>`;
    }
  } catch {
    /* ignore */
  }
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
  await showLanBanner();
  await refreshStatus();
  setInterval(refreshStatus, REFRESH_MS);
  setInterval(() => {
    if (mapFloor) loadMap(mapFloor);
  }, MAP_REFRESH_MS);
}

init();
