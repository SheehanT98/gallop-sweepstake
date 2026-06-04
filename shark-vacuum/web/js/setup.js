const $ = (s) => document.querySelector(s);

async function loadError() {
  try {
    const res = await fetch("/api/health");
    const data = await res.json();
    const el = $("#setup-error");
    if (!data.connected && data.error) {
      el.textContent = data.error;
      el.hidden = false;
    } else if (data.connected) {
      window.location.href = "/";
    }
  } catch (e) {
    $("#setup-error").textContent = e.message;
    $("#setup-error").hidden = false;
  }
}

$("#btn-retry").addEventListener("click", async () => {
  const btn = $("#btn-retry");
  btn.disabled = true;
  btn.textContent = "Connecting…";
  try {
    const res = await fetch("/api/reconnect", { method: "POST" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.detail || res.statusText);
    }
    window.location.href = "/";
  } catch (e) {
    $("#setup-error").textContent = String(e.message || e);
    $("#setup-error").hidden = false;
    btn.disabled = false;
    btn.textContent = "Retry connection";
  }
});

loadError();
