const DISTRICTS = [
  { id: "ash-wade", name: "Ash Wade", x0: 0, x1: 5, y0: 20, y1: 25, cx: 2.5, cy: 22.5, air: "ash", wet: true, look: "Пепел садится на мокрый бетон. Градирни едва держатся в пыли.", lamps: [[28, 48, "#ffb25a"], [70, 42, "#9fd7ff"]] },
  { id: "kite-ridge", name: "Kite Ridge", x0: 5, x1: 10, y0: 20, y1: 25, cx: 7.5, cy: 22.5, air: "haze", wet: true, look: "С хребта город только слоями дымки. Антенны поют на ветру.", lamps: [[40, 55, "#9fd"], [72, 36, "#fc8"]] },
  { id: "helion-spire", name: "Helion Spire", x0: 10, x1: 15, y0: 20, y1: 25, cx: 12.5, cy: 22.5, air: "haze", wet: true, look: "Игла Helion режет бледное небо. Верх уже в дымке.", lamps: [[50, 30, "#9cf"], [30, 60, "#f9c"]] },
  { id: "north-dock", name: "North Dock", x0: 15, x1: 20, y0: 20, y1: 25, cx: 17.5, cy: 22.5, air: "steam", wet: true, look: "Красный фонарь крана лежит на мокром пирсе и на крыле.", lamps: [[62, 40, "#f33"], [24, 58, "#6cf"]] },
  { id: "wire-farm", name: "Wire Farm", x0: 0, x1: 5, y0: 15, y1: 20, cx: 2.5, cy: 17.5, air: "haze", wet: true, look: "Поле мачт и кабеля. Дальше сорока метров только силуэты.", lamps: [[34, 46, "#fc6"], [68, 50, "#6cf"]] },
  { id: "glass-cut", name: "Glass Cut", x0: 5, x1: 10, y0: 15, y1: 20, cx: 7.5, cy: 17.5, air: "haze", wet: true, look: "Улица разрезана стеклом. Небо — узкая циан-полоса.", lamps: [[22, 44, "#3ee0ff"], [74, 38, "#f3a"]] },
  { id: "helion-core", name: "Helion Core", x0: 10, x1: 15, y0: 15, y1: 20, cx: 12.5, cy: 17.5, air: "haze", wet: true, look: "Кольцо Core. Мокрый асфальт держит фасады башен.", lamps: [[48, 34, "#8ef"], [70, 52, "#fc8"]] },
  { id: "packet-line", name: "Packet Line", x0: 15, x1: 20, y0: 15, y1: 20, cx: 17.5, cy: 17.5, air: "dust", wet: true, look: "Янтарные лампы депо бьют в лужи даже днём.", lamps: [[30, 48, "#fc8"], [66, 42, "#f63"]] },
  { id: "broth-basin", name: "Broth Basin", x0: 0, x1: 5, y0: 10, y1: 15, cx: 2.5, cy: 12.5, air: "steam", wet: true, look: "Пар из котлов. Плитка зеркалит вывеску Broth 24.", lamps: [[40, 36, "#3ee"], [58, 50, "#fc6"]] },
  { id: "spine-west", name: "Spine West", x0: 5, x1: 10, y0: 10, y1: 15, cx: 7.5, cy: 12.5, air: "haze", wet: true, look: "Стопы седана тянут красную ленту по мокрому Spine.", lamps: [[32, 40, "#3cf"], [68, 46, "#f3c"], [50, 62, "#f44"]] },
  { id: "spine-east", name: "Spine East", x0: 10, x1: 15, y0: 10, y1: 15, cx: 12.5, cy: 12.5, air: "steam", wet: true, look: "Эстакада давит улицу. Циан в бетоне, красный сигнал в пару.", lamps: [[55, 28, "#f44"], [28, 52, "#6ee"]] },
  { id: "nine-teeth", name: "Nine Teeth", x0: 15, x1: 20, y0: 10, y1: 15, cx: 17.5, cy: 12.5, air: "haze", wet: true, look: "Девять зубцов мегаблока. Окна живут по-разному.", lamps: [[36, 34, "#f9c"], [62, 48, "#6cf"]] },
  { id: "rust-canal", name: "Rust Canal", x0: 0, x1: 5, y0: 5, y1: 10, cx: 2.5, cy: 7.5, air: "steam", wet: true, look: "Ржавая вода, оранжевый металл, длинный блик по бетону.", lamps: [[24, 46, "#f63"], [70, 40, "#6aa"]] },
  { id: "old-grid", name: "Old Grid", x0: 5, x1: 10, y0: 5, y1: 10, cx: 7.5, cy: 7.5, air: "dust", wet: true, look: "Старая сетка: штукатурка, кабели, узкий мокрый колодец.", lamps: [[30, 42, "#f6c"], [64, 36, "#6cf"]] },
  { id: "market-stack", name: "Market Stack", x0: 10, x1: 15, y0: 5, y1: 10, cx: 12.5, cy: 7.5, air: "steam", wet: true, look: "Три яруса товара. Пар гриля и мокрые ступени.", lamps: [[48, 30, "#fc8"], [22, 55, "#6ee"]] },
  { id: "clinic-row", name: "Clinic Row", x0: 15, x1: 20, y0: 5, y1: 10, cx: 17.5, cy: 7.5, air: "haze", wet: true, look: "Холодный свет козырьков Kite на мокрой улице.", lamps: [[40, 40, "#dff"], [70, 48, "#9f6"]] },
  { id: "south-ash", name: "South Ash", x0: 0, x1: 5, y0: 0, y1: 5, cx: 2.5, cy: 2.5, air: "ash", wet: true, look: "Пыль и колея. В колее лужа и красный блик стопов.", lamps: [[50, 50, "#fa8"]] },
  { id: "freight-spur", name: "Freight Spur", x0: 5, x1: 10, y0: 0, y1: 5, cx: 7.5, cy: 2.5, air: "dust", wet: true, look: "Рельсы, цистерны, красный сигнал в паре.", lamps: [[34, 44, "#f44"], [66, 38, "#fc8"]] },
  { id: "gate-town", name: "Gate Town", x0: 10, x1: 15, y0: 0, y1: 5, cx: 12.5, cy: 2.5, air: "dust", wet: true, look: "КПП режет авеню. За шлагбаумом город уже мягкий.", lamps: [[48, 42, "#fd4"], [20, 50, "#6cf"]] },
  { id: "salt-works", name: "Salt Works", x0: 15, x1: 20, y0: 0, y1: 5, cx: 17.5, cy: 2.5, air: "salt", wet: true, look: "Белая корка соли, цистерны, слепящая дымка.", lamps: [[40, 46, "#fff"], [68, 40, "#fa6"]] },
];

const INTERIORS = [
  { id: "last-shift", district: "glass-cut", label: "Last Shift", names: ["last shift", "ласт шифт", "бар", "bar", "lastshift"], enter: "Бирюза от труб. Стойка держит лампы." },
  { id: "kite-clinic", district: "clinic-row", label: "Kite Clinic", names: ["kite clinic", "клиника", "клинику", "clinic"], enter: "Свет из панелей, не из фильтра. Пол мокрый." },
  { id: "broth-24", district: "broth-basin", label: "Broth 24", names: ["broth 24", "broth", "бульон", "столовая", "столовую"], enter: "Пар над котлом. Плитка зеркалит лампу." },
  { id: "helion-lobby", district: "helion-core", label: "лобби Helion", names: ["лобби", "lobby", "helion lobby", "лобби helion"], enter: "Камень держит лампы. С улицы мокрые следы." },
  { id: "packet-garage", district: "packet-line", label: "гараж Packet", names: ["гараж", "garage", "packet garage"], enter: "Янтарь натриевых ламп на мокром бетоне." },
  { id: "apartment", district: "nine-teeth", label: "квартира", names: ["квартира", "квартиру", "apartment"], enter: "Стекло на девятый зуб. На полу мокрое пятно." },
  { id: "gate", district: "gate-town", label: "КПП", names: ["кпп", "чекпоинт", "checkpoint", "ворота"], enter: "Бронестекло, лампа над журналом, очередь снаружи." },
  { id: "overlook", district: "kite-ridge", label: "смотровая", names: ["смотровая", "смотровую", "overlook"], enter: "Щель на город. Пыль в солнечном столбе." },
];

const CONTRACTS = [
  { id: "ash-run", district: "ash-wade", title: "Пепельный кейс", text: "Кейс у градирен.", pay: 500 },
  { id: "dock-seal", district: "north-dock", title: "Печать дока", text: "Контейнер. На пирсе охрана.", pay: 700, combat: true },
  { id: "wire-tap", district: "wire-farm", title: "Чужой отвод", text: "Срезать врезку на мачте.", pay: 650 },
  { id: "last-call", district: "glass-cut", title: "Последняя смена", text: "Конверт в Last Shift.", pay: 800, interior: "last-shift" },
  { id: "core-drop", district: "helion-core", title: "Стыковка", text: "Сдать чип в лобби.", pay: 900, interior: "helion-lobby" },
  { id: "basin", district: "broth-basin", title: "Ночная миска", text: "Прикрыть Broth 24.", pay: 750, combat: true, interior: "broth-24" },
  { id: "tooth", district: "nine-teeth", title: "Девятый зуб", text: "Ключ в квартире.", pay: 600, interior: "apartment" },
  { id: "salt", district: "salt-works", title: "Белая проба", text: "Проба с соляного поля.", pay: 550 },
];

const HOSTILES = {
  "north-dock": { name: "Охрана пирса", hp: 80 },
  "broth-basin": { name: "Должник", hp: 64 },
  "old-grid": { name: "Стрелок сетки", hp: 52 },
  "rust-canal": { name: "С баржи", hp: 70 },
};

const COLS = [2.5, 7.5, 12.5, 17.5];
const ROWS = [2.5, 7.5, 12.5, 17.5, 22.5];

const EXACT = {
  "карта": "map",
  "где я": "where",
  "пешком": "foot",
  "сесть": "board",
  "выйти": "exit",
  "день": "day",
  "ночь": "night",
  "золотой час": "golden",
  "золотой": "golden",
  "контракт": "contract",
  "огонь": "fire",
  "инвентарь": "inv",
  "осмотреться": "look",
  "камера сзади": "chase",
  "сзади": "chase",
  "от глаз": "eye",
  "виста": "vista",
  "vista": "vista",
  "седан": "sedan",
  "клин": "wedge",
  "фургон": "haul",
  "стим": "stim",
  "атлас": "atlas",
};

const KEYS = [
  ["карта", "карта"],
  ["где я", "где я"],
  ["N1 север", "ехать по N1 на север"],
  ["N1 юг", "ехать по N1 на юг"],
  ["N2 восток", "ехать по N2 на восток"],
  ["N2 запад", "ехать по N2 на запад"],
  ["пешком", "пешком"],
  ["сесть", "сесть"],
  ["выйти", "выйти"],
  ["день", "день"],
  ["ночь", "ночь"],
  ["золотой час", "золотой час"],
  ["контракт", "контракт"],
  ["огонь", "огонь"],
  ["инвентарь", "инвентарь"],
  ["осмотреться", "осмотреться"],
  ["сзади", "камера сзади"],
  ["от глаз", "от глаз"],
  ["виста", "виста"],
  ["седан", "седан"],
  ["клин", "клин"],
  ["фургон", "фургон"],
  ["стим", "стим"],
  ["атлас", "атлас"],
];

const state = {
  x: 7.5,
  y: 12.5,
  district: "spine-west",
  tod: "day",
  mode: "drive",
  camera: "chase",
  vehicle: "sedan",
  interior: null,
  hp: 100,
  ammo: 18,
  stims: 2,
  chips: 0,
  creds: 420,
  contract: null,
  done: {},
  call: null,
  enemy: null,
  dead: {},
  heading: 0,
  subtitle: "Красная лента стопов лежит в луже.",
  plateNote: "",
  shownTod: "day",
  token: 0,
  index: {},
  have: new Set(),
};

const imgA = document.getElementById("plateA");
const imgB = document.getElementById("plateB");
const canvas = document.getElementById("air");
const ctx = canvas.getContext("2d");
let shown = imgA;
let shownSrc = imgA.getAttribute("src");
let fadeGen = 0;
let motes = [];

function norm(s) {
  return String(s || "").trim().toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ");
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function district() {
  return DISTRICTS.find((d) => d.id === state.district) || DISTRICTS[9];
}

function nameOf(id) {
  return (DISTRICTS.find((d) => d.id === id) || {}).name || id;
}

function interiorById(id) {
  return INTERIORS.find((i) => i.id === id);
}

function districtAt(x, y) {
  return DISTRICTS.find((d) => x >= d.x0 && x < d.x1 && y >= d.y0 && y < d.y1) || DISTRICTS[0];
}

function nearest(list, v) {
  return list.reduce((best, n) => (Math.abs(n - v) < Math.abs(best - v) ? n : best));
}

function say(text) {
  state.subtitle = text;
}

function vehName(id) {
  return { sedan: "седан", wedge: "клин", haul: "фургон" }[id] || id;
}

function matchDistrict(q) {
  q = norm(q);
  const exact = DISTRICTS.filter((d) => norm(d.name) === q || d.id === q);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return { ambiguous: exact };
  const partial = DISTRICTS.filter((d) => norm(d.name).includes(q) && q.length > 2);
  if (partial.length === 1) return partial[0];
  if (partial.length > 1) return { ambiguous: partial };
  return null;
}

function matchInterior(q) {
  q = norm(q);
  const exact = INTERIORS.filter((i) => i.names.includes(q));
  if (exact.length === 1) return exact[0];
  const partial = INTERIORS.filter((i) => i.names.some((n) => n.includes(q) || q.includes(n)));
  if (partial.length === 1) return partial[0];
  if (partial.length > 1) return { ambiguous: partial };
  return null;
}

function firstHave(keys) {
  return keys.find((k) => state.have.has(k)) || null;
}

function resolvePlate() {
  const id = state.district;
  if (state.interior) {
    const key = `${id}|interior|${state.interior}`;
    if (state.have.has(key)) return { src: state.index[key], note: "", shownTod: "interior" };
    const street = firstHave([`${id}|${state.tod}|eye`, `${id}|day|eye`, `${id}|${state.tod}|chase`, `${id}|day|chase`]);
    return { src: street ? state.index[street] : null, note: "интерьер не снят", shownTod: street ? street.split("|")[1] : state.tod };
  }
  const tod = state.tod;
  const cam = state.camera;
  const veh = state.vehicle;
  const exact = firstHave([`${id}|${tod}|${cam}|${veh}`, `${id}|${tod}|${cam}`]);
  if (exact) {
    const carNote = state.mode === "drive" && !state.interior && veh !== "sedan" && exact.split("|").length < 4
      ? "в кадре седан"
      : "";
    return { src: state.index[exact], note: carNote, shownTod: tod };
  }
  const fb = firstHave([
    `${id}|${tod}|chase|${veh}`,
    `${id}|${tod}|chase`,
    `${id}|${tod}|eye`,
    `${id}|${tod}|vista`,
    `${id}|day|${cam}|${veh}`,
    `${id}|day|${cam}`,
    `${id}|day|chase`,
    `${id}|day|eye`,
    `${id}|day|vista`,
  ]);
  if (!fb) return { src: null, note: "кадр района не снят", shownTod: "day" };
  const parts = fb.split("|");
  let note = "";
  if (parts[1] !== tod) {
    note = tod === "night" ? "ночной кадр не снят" : tod === "golden" ? "кадр золотого часа не снят" : "";
  } else if (parts[2] !== cam) {
    note = cam === "eye" ? "кадр от глаз не снят" : cam === "vista" ? "виста не снята" : "камера сзади не снята";
  }
  return { src: state.index[fb], note, shownTod: parts[1] };
}

function crossfade(src) {
  const gen = ++fadeGen;
  return new Promise((resolve) => {
    if (!src || src === shownSrc) {
      resolve();
      return;
    }
    const next = shown === imgA ? imgB : imgA;
    let done = false;
    const finish = () => {
      if (done || gen !== fadeGen) return;
      done = true;
      next.style.opacity = "1";
      shown.style.opacity = "0";
      shown = next;
      shownSrc = src;
      const d = district();
      const tod = { day: "день", night: "ночь", golden: "золотой час" }[state.tod];
      next.alt = state.interior
        ? `${interiorById(state.interior).label}, ${d.name}`
        : `${d.name}, ${tod}`;
      resolve();
    };
    next.onload = finish;
    next.onerror = () => resolve();
    next.src = src;
    if (next.complete && next.naturalWidth) finish();
  });
}

function refreshEnemy() {
  const id = state.district;
  const hostile = HOSTILES[id];
  const onFoot = state.mode === "foot" || !!state.interior;
  if (!hostile || !onFoot || state.dead[id]) {
    state.enemy = null;
    return;
  }
  const contract = state.contract;
  const contractFight = !!(contract && contract.combat && contract.district === id && !state.done[contract.id]);
  const ambient = (id === "old-grid" || id === "rust-canal") && !state.interior;
  if (state.interior && contractFight && contract.interior && state.interior !== contract.interior) {
    state.enemy = null;
    return;
  }
  if (state.interior && !contractFight) {
    state.enemy = null;
    return;
  }
  if (!contractFight && !ambient) {
    state.enemy = null;
    return;
  }
  if (!state.enemy || state.enemy.district !== id) {
    state.enemy = { name: hostile.name, hp: hostile.hp, max: hostile.hp, district: id };
  }
}

async function present() {
  refreshEnemy();
  const plate = resolvePlate();
  state.plateNote = plate.note || "";
  state.shownTod = plate.shownTod || state.tod;
  if (plate.src) await crossfade(plate.src);
  seedMotes();
  render();
}

function lineX(y, x0, x1) {
  const a = COLS.indexOf(x0);
  const b = COLS.indexOf(x1);
  if (a < 0 || b < 0 || a === b) return [];
  const step = a < b ? 1 : -1;
  const out = [];
  for (let i = a + step; i !== b + step; i += step) {
    out.push({ x: COLS[i], y, heading: step > 0 ? 90 : 270 });
  }
  return out;
}

function lineY(x, y0, y1) {
  const a = ROWS.indexOf(y0);
  const b = ROWS.indexOf(y1);
  if (a < 0 || b < 0 || a === b) return [];
  const step = a < b ? 1 : -1;
  const out = [];
  for (let i = a + step; i !== b + step; i += step) {
    out.push({ x, y: ROWS[i], heading: step > 0 ? 0 : 180 });
  }
  return out;
}

function pathTo(dest) {
  let x = nearest(COLS, state.x);
  let y = nearest(ROWS, state.y);
  const points = [...lineX(y, x, dest.cx)];
  x = dest.cx;
  points.push(...lineY(x, y, dest.cy));
  return points;
}

function roadPath(road, dir) {
  const points = [];
  let x = nearest(COLS, state.x);
  let y = nearest(ROWS, state.y);
  if (road === "n1" && x !== 7.5) {
    points.push(...lineX(y, x, 7.5));
    x = 7.5;
  }
  if (road === "n2" && y !== 12.5) {
    points.push(...lineY(x, y, 12.5));
    y = 12.5;
  }
  if (road === "n1") {
    const i = ROWS.indexOf(nearest(ROWS, y));
    const n = i + dir;
    if (n < 0 || n >= ROWS.length) return points.length ? points : null;
    points.push({ x: 7.5, y: ROWS[n], heading: dir > 0 ? 0 : 180 });
  } else {
    const i = COLS.indexOf(nearest(COLS, x));
    const n = i + dir;
    if (n < 0 || n >= COLS.length) return points.length ? points : null;
    points.push({ x: COLS[n], y: 12.5, heading: dir > 0 ? 90 : 270 });
  }
  return points;
}

async function travel(points, my) {
  state.interior = null;
  state.call = null;
  state.enemy = null;
  for (const p of points) {
    if (my !== state.token) return;
    state.x = p.x;
    state.y = p.y;
    state.heading = p.heading;
    state.district = districtAt(p.x, p.y).id;
    state.mode = "drive";
    state.camera = "chase";
    await present();
    if (my !== state.token) return;
    await sleep(1150);
  }
}

function parse(s) {
  if (!s) return { op: "noop" };
  if (EXACT[s]) return { op: EXACT[s] };
  if (/^(ехать\s+)?по\s+n1\b/.test(s) || /^n1\b/.test(s)) {
    if (/юг/.test(s)) return { op: "road", road: "n1", dir: -1 };
    if (/север/.test(s)) return { op: "road", road: "n1", dir: 1 };
    return { op: "say", text: "N1: север или юг?" };
  }
  if (/^(ехать\s+)?по\s+n2\b/.test(s) || /^n2\b/.test(s)) {
    if (/запад/.test(s)) return { op: "road", road: "n2", dir: -1 };
    if (/восток/.test(s)) return { op: "road", road: "n2", dir: 1 };
    return { op: "say", text: "N2: восток или запад?" };
  }
  let m = s.match(/^ехать(?:\s+в)?\s+(.+)/);
  if (m) return { op: "goto", q: m[1] };
  m = s.match(/^в\s+(.+)/);
  if (m) return { op: "goto", q: m[1] };
  m = s.match(/^зайти(?:\s+в)?\s+(.+)/);
  if (m) return { op: "enter", q: m[1] };
  if (state.call) {
    const hit = state.call.replies.find((r) => norm(r.label) === s);
    if (hit) return { op: "reply", id: hit.id };
  }
  const d = matchDistrict(s);
  if (d && d.ambiguous) return { op: "say", text: "Уточни: " + d.ambiguous.map((x) => x.name).join(" или ") };
  if (d) return { op: "goto", q: s };
  return { op: "say", text: "Не понял. Пример: ехать в Helion Core" };
}

function onCommand(raw) {
  const my = ++state.token;
  run(parse(norm(raw)), my);
}

async function run(act, my) {
  switch (act.op) {
    case "noop":
      return;
    case "say":
      say(act.text);
      render();
      return;
    case "map":
      showMap();
      return;
    case "where":
      say(`${district().name}. ${district().look}`);
      render();
      return;
    case "foot":
      return doFoot();
    case "board":
      return doBoard();
    case "exit":
      return doExit();
    case "day":
      return setTod("day");
    case "night":
      return setTod("night");
    case "golden":
      return setTod("golden");
    case "contract":
      offerContract();
      return;
    case "fire":
      doFire();
      return;
    case "inv":
      say(`Пистолет ${state.ammo} · стим ${state.stims} · чип ${state.chips} · креды ${state.creds}`);
      render();
      return;
    case "look":
      doLook();
      return;
    case "chase":
      return setCam("chase");
    case "eye":
      return setCam("eye");
    case "vista":
      return setCam("vista");
    case "sedan":
      return setVehicle("sedan");
    case "wedge":
      return setVehicle("wedge");
    case "haul":
      return setVehicle("haul");
    case "stim":
      useStim();
      return;
    case "atlas":
      return playAtlas(my);
    case "road":
      return driveRoad(act.road, act.dir, my);
    case "goto":
      return driveToName(act.q, my);
    case "enter":
      return enterName(act.q);
    case "reply":
      choose(act.id);
      return;
    default:
      return;
  }
}

function showMap() {
  const frame = document.getElementById("frame");
  frame.classList.add("pulse-map");
  setTimeout(() => frame.classList.remove("pulse-map"), 1500);
  say("Сетка 20×25. N1 север–юг, x 7.5. N2 запад–восток, y 12.5.");
  render();
}

async function setTod(tod) {
  state.tod = tod;
  await present();
  if (state.interior) say("Снаружи другой свет. Внутри лампы те же.");
  else if (!state.plateNote) {
    say({ day: "День. Бледное небо, мокрый низ.", night: "Ночь. Вывески лежат в лужах.", golden: "Низкое солнце, тёплый кант." }[tod]);
  }
  render();
}

async function setCam(cam) {
  state.camera = cam;
  await present();
  render();
}

async function setVehicle(id) {
  state.vehicle = id;
  if (state.mode === "drive" && !state.interior) await present();
  say(`Ключи: ${vehName(id)}.`);
  render();
}

async function doFoot() {
  if (state.interior) {
    say("Ты уже внутри.");
    render();
    return;
  }
  state.mode = "foot";
  state.camera = "eye";
  await present();
  say(district().look);
  render();
}

async function doBoard() {
  if (state.interior) {
    say("Сначала выйди из здания.");
    render();
    return;
  }
  state.mode = "drive";
  state.camera = "chase";
  state.enemy = null;
  await present();
  say(`За рулём. ${vehName(state.vehicle)}.`);
  render();
}

async function doExit() {
  if (state.interior) {
    state.interior = null;
    state.call = null;
    state.mode = "foot";
    state.camera = "eye";
    await present();
    say("Снова на улице.");
    render();
    return;
  }
  if (state.mode === "drive") {
    state.mode = "foot";
    state.camera = "eye";
    await present();
    say("Дверь. Ты на асфальте.");
    render();
    return;
  }
  say("И так пешком.");
  render();
}

async function driveToName(q, my) {
  const dest = matchDistrict(q);
  if (!dest) {
    say("Нет такого района.");
    render();
    return;
  }
  if (dest.ambiguous) {
    say("Уточни: " + dest.ambiguous.map((d) => d.name).join(" или "));
    render();
    return;
  }
  if (state.interior) {
    say("Сначала выйди.");
    render();
    return;
  }
  const points = pathTo(dest);
  if (!points.length) {
    say(`Уже ${dest.name}.`);
    render();
    return;
  }
  state.mode = "drive";
  state.camera = "chase";
  await travel(points, my);
  if (my === state.token) {
    say(`${dest.name}. ${dest.look}`);
    render();
  }
}

async function driveRoad(road, dir, my) {
  if (state.interior) {
    say("Сначала выйди.");
    render();
    return;
  }
  const points = roadPath(road, dir);
  if (!points) {
    say(road === "n1" ? "Дальше N1 нет." : "Дальше N2 нет.");
    render();
    return;
  }
  state.mode = "drive";
  state.camera = "chase";
  await travel(points, my);
  if (my === state.token) {
    say(`${road.toUpperCase()} · ${district().name}.`);
    render();
  }
}

function enterName(q) {
  const hit = matchInterior(q);
  if (!hit) {
    say("Нет такого входа.");
    render();
    return;
  }
  if (hit.ambiguous) {
    say("Уточни вход: " + hit.ambiguous.map((i) => i.label).join(" или "));
    render();
    return;
  }
  if (hit.district !== state.district) {
    say(`${hit.label} — это ${nameOf(hit.district)}.`);
    render();
    return;
  }
  state.interior = hit.id;
  state.mode = "foot";
  state.camera = "eye";
  present().then(() => {
    say(hit.enter);
    maybeBarTalk();
    render();
  });
}

function maybeBarTalk() {
  const c = state.contract;
  if (state.interior === "last-shift" && c && c.id === "last-call" && !state.done[c.id]) {
    state.call = {
      kind: "bar",
      speaker: "Нина Вей",
      org: "LAST SHIFT",
      line: "Конверт под стойкой. Квилл платит тебе, не мне.",
      replies: [
        { id: "take-env", label: "Забираю" },
        { id: "ask", label: "Кто слил?" },
        { id: "leave", label: "Позже" },
      ],
    };
    state.subtitle = state.call.line;
  }
}

function offerContract() {
  if (state.contract) {
    say(`Уже открыт: ${state.contract.title}. ${nameOf(state.contract.district)}.`);
    render();
    return;
  }
  const proto = CONTRACTS.find((c) => !state.done[c.id]);
  if (!proto) {
    say("Все восемь закрыты.");
    render();
    return;
  }
  const c = { ...proto };
  state.call = {
    kind: "offer",
    speaker: "Ivo Quill",
    org: "NINELINE",
    line: `${c.title}. ${c.text} ${nameOf(c.district)}. ${c.pay} кред.`,
    replies: [
      { id: "take", label: "Беру" },
      { id: "price", label: "Дорого" },
      { id: "later", label: "Не сейчас" },
    ],
    contract: c,
  };
  state.subtitle = state.call.line;
  render();
}

function choose(id) {
  const call = state.call;
  state.call = null;
  if (!call) return;
  if (call.kind === "offer") {
    if (id === "later") {
      say("Квилл отключился.");
      render();
      return;
    }
    const c = call.contract;
    if (id === "price") c.pay = Math.round(c.pay * 1.25);
    state.contract = c;
    if (c.id === "core-drop") state.chips += 1;
    say(`В работе: ${c.title}. ${c.pay} кред. Езжай в ${nameOf(c.district)}.`);
    render();
    return;
  }
  if (call.kind === "bar") {
    if (id === "leave") {
      say("Нина отворачивается.");
      render();
      return;
    }
    completeContract();
    if (id === "ask") say("Нина не называет имя. Конверт у тебя. Контракт закрыт.");
    render();
  }
}

function completeContract() {
  const c = state.contract;
  if (!c || state.done[c.id]) return;
  state.done[c.id] = true;
  state.creds += c.pay;
  state.chips += c.id === "core-drop" ? 0 : 1;
  if (c.id === "core-drop") state.chips = Math.max(0, state.chips - 1);
  state.contract = null;
  say(`Закрыто: ${c.title}. +${c.pay} кред.`);
}

function doLook() {
  document.getElementById("world").classList.add("is-look");
  setTimeout(() => document.getElementById("world").classList.remove("is-look"), 2300);
  const d = district();
  const line = state.interior ? interiorById(state.interior).enter : d.look;
  const c = state.contract;
  if (c && c.district === d.id && !state.done[c.id]) {
    if (c.combat && !state.dead[d.id]) {
      say(line + " Сначала огонь.");
      render();
      return;
    }
    if (c.interior && state.interior !== c.interior) {
      say(line + " Зайди внутрь.");
      render();
      return;
    }
    completeContract();
    render();
    return;
  }
  say(line);
  render();
}

function muzzle() {
  const node = document.getElementById("muzzle");
  node.classList.remove("on");
  void node.offsetWidth;
  node.classList.add("on");
  const frame = document.getElementById("frame");
  frame.classList.add("kick");
  setTimeout(() => frame.classList.remove("kick"), 140);
}

function doFire() {
  if (!state.interior && state.mode !== "foot") {
    say("Из салона не стреляю. Выйди.");
    render();
    return;
  }
  if (state.hp <= 0) {
    say("Сначала стим.");
    render();
    return;
  }
  if (state.ammo <= 0) {
    say("Пусто.");
    render();
    return;
  }
  state.ammo -= 1;
  muzzle();
  refreshEnemy();
  if (!state.enemy) {
    say("Сектор чист.");
    render();
    return;
  }
  state.enemy.hp -= 24;
  if (state.enemy.hp <= 0) {
    const name = state.enemy.name;
    state.dead[state.enemy.district] = true;
    state.enemy = null;
    say(`${name} сбит.`);
  } else {
    say(`Попадание. ${state.enemy.name} ${Math.max(0, Math.ceil(state.enemy.hp))}.`);
  }
  render();
}

function useStim() {
  if (state.stims <= 0) {
    say("Стимов нет.");
    render();
    return;
  }
  state.stims -= 1;
  state.hp = Math.min(100, state.hp + 40);
  say(`Стим. ${Math.ceil(state.hp)} HP.`);
  render();
}

async function playAtlas(my) {
  state.tod = "day";
  state.interior = null;
  state.mode = "drive";
  state.camera = "chase";
  state.call = null;
  const order = [...DISTRICTS].sort((a, b) => b.cy - a.cy || a.cx - b.cx);
  for (const d of order) {
    if (my !== state.token) return;
    state.x = d.cx;
    state.y = d.cy;
    state.heading = 0;
    state.district = d.id;
    await present();
    say(`${d.name}. ${d.look}`);
    render();
    await sleep(900);
  }
}

function questLines() {
  const c = state.contract;
  if (!c) return ["NINELINE", "Эфир чист"];
  return ["NINELINE", c.title, nameOf(c.district), c.text];
}

function promptLines() {
  if (state.call) return ["Ответ на пульте"];
  if (state.enemy) return ["Огонь", state.enemy.name];
  if (state.interior) return ["Выйти", "Осмотреться"];
  if (state.mode === "drive") return ["Выйти", "N1 север"];
  const door = INTERIORS.find((i) => i.district === state.district);
  if (door) return [`Зайти: ${door.label}`, "Сесть"];
  return ["Сесть", "Контракт"];
}

function renderStatus() {
  const d = district();
  const tod = { day: "день", night: "ночь", golden: "золотой час" }[state.tod];
  const cam = { chase: "камера сзади", eye: "от глаз", vista: "виста" }[state.camera];
  const place = state.interior ? interiorById(state.interior).label : d.name;
  const how = state.interior ? "внутри" : state.mode === "drive" ? vehName(state.vehicle) : "пешком";
  let text = `${place} · ${state.x.toFixed(1)} / ${state.y.toFixed(1)} · ${tod} · ${how} · ${cam}`;
  if (state.plateNote) text += ` · ${state.plateNote}`;
  document.getElementById("status").textContent = text;
}

function renderMap() {
  const parts = ['<rect width="80" height="100" fill="rgba(4,12,16,0.2)"/>'];
  for (const d of DISTRICTS) {
    const x = (d.x0 / 20) * 80;
    const y = (1 - d.y1 / 25) * 100;
    const w = 20;
    const h = 20;
    const on = d.id === state.district;
    const quest = state.contract && state.contract.district === d.id;
    const stroke = on ? "#d8fbff" : quest ? "#ffd36a" : "rgba(150,200,210,0.35)";
    const fill = on ? "rgba(90,220,230,0.28)" : "rgba(80,140,150,0.06)";
    parts.push(`<rect x="${x + 0.7}" y="${y + 0.7}" width="${w - 1.4}" height="${h - 1.4}" fill="${fill}" stroke="${stroke}" stroke-width="${on ? 0.9 : 0.35}"/>`);
  }
  const n1 = (7.5 / 20) * 80;
  const n2 = (1 - 12.5 / 25) * 100;
  parts.push(`<line x1="${n1}" y1="1" x2="${n1}" y2="99" stroke="rgba(190,255,255,0.55)" stroke-width="0.7"/>`);
  parts.push(`<line x1="1" y1="${n2}" x2="79" y2="${n2}" stroke="rgba(255,210,120,0.45)" stroke-width="0.7"/>`);
  const px = (state.x / 20) * 80;
  const py = (1 - state.y / 25) * 100;
  const a = (state.heading * Math.PI) / 180;
  const tip = [px + Math.sin(a) * 3.4, py - Math.cos(a) * 3.4];
  const left = [px + Math.sin(a + 2.5) * 1.9, py - Math.cos(a + 2.5) * 1.9];
  const right = [px + Math.sin(a - 2.5) * 1.9, py - Math.cos(a - 2.5) * 1.9];
  parts.push(`<polygon points="${tip} ${left} ${right}" fill="#ffe08a"/>`);
  document.getElementById("mmap").innerHTML = parts.join("");
}

function renderLamps() {
  const box = document.getElementById("lamps");
  box.innerHTML = "";
  if (state.shownTod !== "night" || state.interior) return;
  for (const [x, y, color] of district().lamps || []) {
    const node = document.createElement("i");
    node.style.left = x + "%";
    node.style.top = y + "%";
    node.style.background = color;
    box.appendChild(node);
  }
}

function renderCall() {
  const node = document.getElementById("call");
  if (!state.call) {
    node.hidden = true;
    node.innerHTML = "";
    return;
  }
  const c = state.call;
  node.hidden = false;
  node.innerHTML = `<b>${esc(c.speaker)}</b><em>${esc(c.org)}</em><div>${esc(c.line)}</div>`;
}

function renderReplies() {
  const box = document.getElementById("replies");
  box.innerHTML = "";
  if (!state.call) return;
  for (const reply of state.call.replies) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = reply.label;
    button.addEventListener("click", () => choose(reply.id));
    box.appendChild(button);
  }
}

function render() {
  const hp = Math.max(0, Math.ceil(state.hp));
  document.getElementById("hpnum").textContent = String(hp);
  document.getElementById("hpfill").style.width = hp + "%";
  document.getElementById("hp").classList.toggle("low", hp > 0 && hp <= 30);
  const lines = questLines();
  const quest = document.getElementById("quest");
  quest.innerHTML = `<b>${esc(lines[0])}</b>` + lines.slice(1).map((t) => `<div>${esc(t)}</div>`).join("");
  if (state.enemy) {
    const pct = Math.max(0, (state.enemy.hp / state.enemy.max) * 100);
    quest.insertAdjacentHTML("beforeend", `<div class="ehp"><span style="width:${pct}%"></span></div><div>${esc(state.enemy.name)} ${Math.max(0, Math.ceil(state.enemy.hp))}</div>`);
  }
  document.getElementById("sub").textContent = state.subtitle;
  document.getElementById("prompt").innerHTML = promptLines().map((t) => `<div>${esc(t)}</div>`).join("");
  const slots = [
    ["оружие", state.ammo, "gun"],
    ["стим", state.stims, "stim"],
    ["чип", state.chips, "chip"],
    ["кред", state.creds, "cred"],
  ];
  document.getElementById("slots").innerHTML = slots
    .map(([name, count, id]) => `<button type="button" data-act="${id}"><em>${count}</em><span>${name}</span></button>`)
    .join("");
  const world = document.getElementById("world");
  const chaseDrive = !state.interior && state.mode === "drive" && state.camera === "chase";
  world.classList.toggle("is-drive", chaseDrive);
  world.classList.toggle("is-vista", !state.interior && state.camera === "vista");
  world.classList.toggle("is-foot", !state.interior && !chaseDrive && state.camera !== "vista");
  world.classList.toggle("is-interior", !!state.interior);
  world.classList.toggle("is-night", state.shownTod === "night");
  world.classList.toggle("is-wet", !state.interior && district().wet);
  renderCall();
  renderReplies();
  renderMap();
  renderLamps();
  renderStatus();
}

function spawnMote(anyY) {
  return {
    x: Math.random(),
    y: anyY ? Math.random() : 1.05,
    r: Math.random() * 1.7 + 0.25,
    v: 0.00012 + Math.random() * 0.00045,
    drift: (Math.random() - 0.5) * 0.00025,
    a: 0.05 + Math.random() * 0.22,
  };
}

function seedMotes() {
  const kind = state.interior ? "steam" : district().air;
  const n = kind === "ash" || kind === "salt" || kind === "steam" ? 64 : 36;
  motes = Array.from({ length: n }, () => spawnMote(true));
  motes.kind = kind;
}

function resizeAir() {
  const rect = document.getElementById("world").getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.max(2, Math.floor(rect.width * dpr));
  canvas.height = Math.max(2, Math.floor(rect.height * dpr));
}

function loopAir() {
  const w = canvas.width;
  const h = canvas.height;
  const kind = motes.kind || "haze";
  ctx.clearRect(0, 0, w, h);
  for (const m of motes) {
    if (kind === "steam") {
      m.y -= m.v * 1.7;
      m.x += Math.sin(m.y * 9 + m.r) * 0.0004;
    } else {
      m.y -= m.v * 0.35;
      m.x += m.drift;
    }
    if (m.y < -0.05 || m.x < -0.08 || m.x > 1.08) Object.assign(m, spawnMote(false));
    const color = kind === "ash" ? "190,186,176" : kind === "salt" ? "255,255,255" : kind === "steam" ? "226,236,236" : "214,226,230";
    ctx.fillStyle = `rgba(${color},${m.a})`;
    ctx.beginPath();
    ctx.arc(m.x * w, m.y * h, m.r * (w / 420), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  for (let i = 0; i < 24; i += 1) ctx.fillRect(Math.random() * w, Math.random() * h, 1.1, 1.1);
  requestAnimationFrame(loopAir);
}

function enemyTick() {
  if (!state.enemy || state.hp <= 0 || document.hidden) return;
  state.hp = Math.max(0, state.hp - 7);
  const hurt = document.getElementById("hurt");
  hurt.classList.add("on");
  setTimeout(() => hurt.classList.remove("on"), 180);
  if (state.hp <= 0) say("На нуле. Стим.");
  render();
}

function bind() {
  document.getElementById("cmdform").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.getElementById("cmd");
    const value = input.value;
    input.value = "";
    onCommand(value);
  });
  const keys = document.getElementById("keys");
  for (const [label, command] of KEYS) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", () => onCommand(command));
    keys.appendChild(button);
  }
  const districtPick = document.getElementById("districtPick");
  const ordered = [...DISTRICTS].sort((a, b) => b.cy - a.cy || a.cx - b.cx);
  for (const d of ordered) {
    const option = document.createElement("option");
    option.value = d.name;
    option.textContent = d.name;
    if (d.id === "spine-west") option.selected = true;
    districtPick.appendChild(option);
  }
  document.getElementById("goBtn").addEventListener("click", () => {
    onCommand("ехать в " + districtPick.value);
  });
  const interiorPick = document.getElementById("interiorPick");
  for (const interior of INTERIORS) {
    const option = document.createElement("option");
    option.value = interior.names[0];
    option.textContent = `${interior.label} · ${nameOf(interior.district)}`;
    interiorPick.appendChild(option);
  }
  document.getElementById("enterBtn").addEventListener("click", () => {
    onCommand("зайти в " + interiorPick.value);
  });
  document.getElementById("slots").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.act === "gun") onCommand("огонь");
    if (button.dataset.act === "stim") onCommand("стим");
    if (button.dataset.act === "chip") {
      say(`Чипы: ${state.chips}`);
      render();
    }
    if (button.dataset.act === "cred") {
      say(`Креды: ${state.creds}`);
      render();
    }
  });
  window.addEventListener("resize", resizeAir);
}

async function boot() {
  bind();
  render();
  try {
    const response = await fetch("plates/index.json");
    state.index = await response.json();
  } catch (err) {
    state.index = { "spine-west|day|chase": "plates/spine-west__day__chase.jpg" };
  }
  state.have = new Set(Object.keys(state.index));
  resizeAir();
  seedMotes();
  requestAnimationFrame(loopAir);
  setInterval(enemyTick, 2500);
  await present();
  say("Красная лента стопов лежит в луже.");
  render();
}

window.NINELINE = { state, command: onCommand, districts: DISTRICTS };
boot();
