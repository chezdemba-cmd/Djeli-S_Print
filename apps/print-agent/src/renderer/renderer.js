const bridge = window.printAgent;
const status = document.querySelector("#status");
const form = document.querySelector("#pair-form");
const code = document.querySelector("#pair-code");
const serverUrl = document.querySelector("#server-url");
const message = document.querySelector("#message");
document.querySelector("#platform").textContent = `${bridge.platform} · Electron ${bridge.version}`;

bridge.state().then((state) => {
  status.textContent = state.paired ? `Connecté à « ${state.workstationName} »` : "Ce poste n’est pas encore lié";
  form.hidden = state.paired;
  document.querySelector("#server").textContent = state.serverUrl;
  serverUrl.value = state.serverUrl;
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "Appairage en cours…";
  try {
    const state = await bridge.pair({ code: code.value.trim(), serverUrl: serverUrl.value.trim() });
    status.textContent = `Connecté à « ${state.workstationName} »`;
    form.hidden = true;
    message.textContent = "Agent actif. Les imprimantes vont apparaître dans le tableau de bord.";
  } catch (error) { message.textContent = error instanceof Error ? error.message : "Appairage impossible."; }
});
bridge.onError((text) => { message.textContent = text; });
