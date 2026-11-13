import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const $ = id => document.getElementById(id);
const chat = $("chat"), input = $("input"), send = $("send");
const elementColors = {
  H:0xe9f1f4,C:0x8e9ba8,N:0x719de8,O:0xe77c83,S:0xe7c76e,P:0xe6a05c,
  F:0x8ed9a8,Cl:0x77c99c,Br:0xa66e56,I:0x9875bf,Fe:0xd58a63,
  Cr:0x87a6b8,Ni:0xa5b7c4,Cu:0xd88b62,Na:0x9c9de2,K:0xb28bd0,Ca:0xb8c4d2
};
let history = JSON.parse(localStorage.getItem("chemforge-history") || "[]");
let workspace = null, busy = false, showLabels = true, autoRotate = false;
let scene, camera, renderer, controls, group;

function toast(message) {
  const el = $("toast"); el.textContent = message; el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2500);
}
function addMessage(role, text) {
  $("welcome")?.remove();
  const row = document.createElement("div"); row.className = `message ${role}`;
  const avatar = document.createElement("div"); avatar.className = `avatar ${role === "assistant" ? "ai" : "user"}`;
  avatar.textContent = role === "assistant" ? "⌬" : "You";
  const bubble = document.createElement("div"); bubble.className = "bubble";
  const meta = document.createElement("div"); meta.className = "message-meta";
  meta.textContent = role === "assistant" ? "CHEMFORGE AGENT" : "YOU";
  const body = document.createElement("div"); body.textContent = text;
  bubble.append(meta, body); row.append(avatar, bubble); chat.append(row);
  chat.scrollTop = chat.scrollHeight;
}
function saveHistory() { localStorage.setItem("chemforge-history", JSON.stringify(history.slice(-30))); }
function setBusy(value) {
  busy = value; send.disabled = value; input.disabled = value;
  $("status").textContent = value ? "Thinking · working" : "Workspace ready";
  send.textContent = value ? "…" : "↑";
}
function init3D() {
  const canvas = $("mol-canvas");
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(42, canvas.clientWidth / canvas.clientHeight, .1, 1000);
    camera.position.set(0, 0, 11);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.autoRotateSpeed = .65;
    scene.add(new THREE.AmbientLight(0xffffff, 1.25));
    const key = new THREE.DirectionalLight(0xc5f4ef, 2.2); key.position.set(5,6,8); scene.add(key);
    const fill = new THREE.PointLight(0x7bbce8, 1.3); fill.position.set(-6,-2,5); scene.add(fill);
    group = new THREE.Group(); scene.add(group);
    const grid = new THREE.GridHelper(16,32,0x28414d,0x1b2d38);
    grid.position.y = -3.2; grid.material.transparent = true; grid.material.opacity = .22; scene.add(grid);
    const tick = () => { requestAnimationFrame(tick); controls.autoRotate = autoRotate; controls.update(); renderer.render(scene,camera); };
    tick();
    new ResizeObserver(() => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (w && h) { camera.aspect = w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h,false); }
    }).observe(canvas);
  } catch (err) { console.warn("3D preview unavailable", err); $("count").textContent = "3D unavailable"; }
}
function clearGroup() {
  if (!group) return;
  while (group.children.length) {
    const obj = group.children.pop();
    obj.traverse?.(node => {
      node.geometry?.dispose?.();
      if (node.material) (Array.isArray(node.material) ? node.material : [node.material]).forEach(m => m.dispose());
    });
  }
}
function makeLabel(text, position) {
  const canvas = document.createElement("canvas"); canvas.width = 128; canvas.height = 64;
  const ctx = canvas.getContext("2d"); ctx.fillStyle = "#eaf7f5"; ctx.font = "bold 30px Arial";
  ctx.textAlign = "center"; ctx.fillText(text,64,40);
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false}));
  sprite.position.copy(position).add(new THREE.Vector3(0,.42,0)); sprite.scale.set(.75,.38,1);
  return sprite;
}
function drawStructure(data) {
  if (!renderer || !group) return;
  clearGroup();
  const atoms = Array.isArray(data.atoms) ? data.atoms : [];
  if (!atoms.length) { $("empty").style.display = "flex"; return; }
  $("empty").style.display = "none";
  const points = atoms.map(a => new THREE.Vector3(Number(a.x)||0,Number(a.y)||0,Number(a.z)||0));
  atoms.forEach((atom,i) => {
    const el = String(atom.element || "C");
    const color = elementColors[el] || 0x91a6b4;
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(.25,28,20),
      new THREE.MeshStandardMaterial({color,roughness:.3,metalness:.12,emissive:color,emissiveIntensity:.08}));
    sphere.position.copy(points[i]); group.add(sphere);
    if (showLabels) group.add(makeLabel(atom.label || el, points[i]));
  });
  (data.bonds || []).forEach(bond => {
    const a = points[bond.from], b = points[bond.to]; if (!a || !b) return;
    const direction = new THREE.Vector3().subVectors(b,a);
    const length = direction.length(); if (!length) return;
    const order = Math.max(1,Math.min(3,Number(bond.order)||1));
    for (let n=0;n<order;n++) {
      const offset = new THREE.Vector3(0,0,(n-(order-1)/2)*.09);
      const start = a.clone().add(offset), end = b.clone().add(offset);
      const geo = new THREE.CylinderGeometry(.045,.045,length,12);
      const mesh = new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0x9bb8c4,metalness:.3,roughness:.4}));
      mesh.position.copy(start).add(end).multiplyScalar(.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3().subVectors(end,start).normalize());
      group.add(mesh);
    }
  });
  const bounds = new THREE.Box3().setFromObject(group);
  const center = bounds.getCenter(new THREE.Vector3()); group.position.sub(center);
  const size = bounds.getSize(new THREE.Vector3()).length();
  camera.position.set(0,0,Math.max(7,size*1.25)); controls.target.set(0,0,0); controls.update();
}
function renderWorkspace(w) {
  workspace = w;
  $("subtitle").textContent = w.subtitle || "Agent-generated scientific preview";
  $("kind").textContent = `${(w.kind || "analysis").toUpperCase()} PREVIEW`;
  $("title").textContent = w.title || "Chemistry workspace";
  $("formula").textContent = w.formula || "";
  $("count").textContent = `${w.atoms?.length || 0} atoms · ${w.bonds?.length || 0} bonds`;
  $("info-kind").textContent = (w.kind || "Analysis").replace(/^./, c => c.toUpperCase());
  $("info-atoms").textContent = String(w.atoms?.length ?? "—");
  $("info-bonds").textContent = `Bond connections: ${w.bonds?.length || 0}`;
  $("smiles").textContent = w.smiles ? `SMILES · ${w.smiles.slice(0,34)}` : "Structure representation";
  const counts = {};
  (w.atoms || []).forEach(a => counts[a.element] = (counts[a.element] || 0) + 1);
  const legend = $("legend"); legend.replaceChildren();
  Object.entries(counts).forEach(([el,n]) => {
    const chip = document.createElement("span"); chip.className = "atom-chip";
    const dot = document.createElement("i"); dot.className = "atom-dot";
    dot.style.background = `#${(elementColors[el] || 0x91a6b4).toString(16).padStart(6,"0")}`;
    chip.append(dot, document.createTextNode(`${el} × ${n}`)); legend.append(chip);
  });
  if (!Object.keys(counts).length) legend.textContent = "No atom coordinates supplied.";
  const notes = $("notes"); notes.replaceChildren();
  [...(w.notes || []), w.validation || "Illustrative preview; independent scientific validation is required."]
    .forEach(note => { const li = document.createElement("li"); li.textContent = note; notes.append(li); });
  drawStructure(w); toast("Workspace updated by ChemForge");
}
function typingRow() {
  const row = document.createElement("div"); row.className = "message assistant";
  row.innerHTML = '<div class="avatar ai">⌬</div><div class="bubble"><div class="message-meta">CHEMFORGE AGENT</div><div class="typing">Thinking…</div></div>';
  chat.append(row); chat.scrollTop = chat.scrollHeight; return row;
}
async function sendMessage(text) {
  text = text.trim(); if (!text || busy) return;
  addMessage("user", text); input.value = ""; input.style.height = "auto";
  const pending = typingRow(); setBusy(true);
  try {
    const response = await fetch("/api/chat", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({message:text,history,workspaceContext:workspace})
    });
    const data = await response.json(); pending.remove();
    if (!data.ok) throw new Error(data.error || "Request failed");
    addMessage("assistant", data.answer || "Ready for your next question.");
    history.push({role:"user",text},{role:"model",text:data.answer || ""}); saveHistory();
    if (data.workspace) renderWorkspace(data.workspace);
  } catch (err) {
    pending.remove(); addMessage("assistant", err.message || "Could not reach ChemForge. Please retry.");
  } finally { setBusy(false); input.focus(); }
}
$("form").addEventListener("submit", e => { e.preventDefault(); sendMessage(input.value); });
input.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("form").requestSubmit(); } });
input.addEventListener("input", () => { input.style.height = "auto"; input.style.height = `${Math.min(input.scrollHeight,130)}px`; });
document.querySelectorAll("[data-prompt]").forEach(btn => btn.addEventListener("click", () => sendMessage(btn.dataset.prompt)));
$("new-chat").addEventListener("click", () => { history=[]; saveHistory(); chat.innerHTML=""; workspace=null; location.reload(); });
$("clear-chat").addEventListener("click", () => { if(confirm("Clear this conversation on this device?")) { history=[]; saveHistory(); location.reload(); } });
$("reset").addEventListener("click", () => { if(controls) { camera.position.set(0,0,11); controls.target.set(0,0,0); controls.update(); } });
$("rotate").addEventListener("click", () => { autoRotate=!autoRotate; $("rotate").textContent=autoRotate?"Ⅱ Pause rotation":"⟳ Rotate"; });
$("labels").addEventListener("click", () => { showLabels=!showLabels; $("labels").textContent=`Atom labels: ${showLabels?"on":"off"}`; if(workspace) drawStructure(workspace); });
$("export").addEventListener("click", () => {
  if(!workspace) return toast("Create a structure first.");
  const blob = new Blob([JSON.stringify(workspace,null,2)],{type:"application/json"});
  const url = URL.createObjectURL(blob); const a=document.createElement("a");
  a.href=url; a.download="chemforge-workspace.json"; a.click(); URL.revokeObjectURL(url);
});
history.forEach(m => addMessage(m.role === "model" ? "assistant" : "user",m.text));
init3D();
