const files = [document.querySelector("#set1File"), document.querySelector("#set2File")];
const nameLabels = [document.querySelector("#set1Name"), document.querySelector("#set2Name")];
const textareas = [document.querySelector("#set1Text"), document.querySelector("#set2Text")];
const recognizeButton = document.querySelector("#recognizeButton");
const pasteButton = document.querySelector("#pasteButton");
const useTextButton = document.querySelector("#useTextButton");
const printButton = document.querySelector("#printButton");
const statusNode = document.querySelector("#status");
const reviewPanel = document.querySelector("#reviewPanel");
const editorsNode = document.querySelector("#editors");
const warningsNode = document.querySelector("#warnings");
const printArea = document.querySelector("#printArea");
const titleList = document.querySelector("#songTitles");

let sets = [];
const selectedFiles = [null, null];

repertoire.forEach((song) => {
  const option = document.createElement("option");
  option.value = song.title;
  option.label = `${song.artist} · ${song.key}`;
  titleList.append(option);
});

files.forEach((input, index) => input.addEventListener("change", () => {
  selectedFiles[index] = input.files[0] || null;
  nameLabels[index].textContent = selectedFiles[index]?.name || "Ningún archivo";
}));

function nextAvailableSet() {
  const emptyImage = selectedFiles.findIndex((file) => !file);
  if (emptyImage !== -1) return emptyImage;
  const emptyText = textareas.findIndex((textarea) => !textarea.value.trim());
  return emptyText === -1 ? 0 : emptyText;
}

function storeClipboardImage(blob, preferredIndex) {
  const index = Number.isInteger(preferredIndex) ? preferredIndex : nextAvailableSet();
  const extension = blob.type.split("/")[1]?.replace("jpeg", "jpg") || "png";
  selectedFiles[index] = new File([blob], `captura-set-${index + 1}.${extension}`, { type: blob.type });
  nameLabels[index].textContent = `Captura pegada · Set ${index + 1}`;
  statusNode.textContent = `Imagen pegada en Set ${index + 1}. Ya puedes leer las capturas.`;
}

function storeClipboardText(text, preferredIndex) {
  if (!text.trim()) return;
  const index = Number.isInteger(preferredIndex) ? preferredIndex : nextAvailableSet();
  textareas[index].value = text.trim();
  statusNode.textContent = `Texto pegado en Set ${index + 1}.`;
  buildSets(textareas.map((textarea) => textarea.value));
}

function handlePasteEvent(event, preferredIndex) {
  const imageItem = [...event.clipboardData.items].find((item) => item.type.startsWith("image/"));
  if (imageItem) {
    event.preventDefault();
    storeClipboardImage(imageItem.getAsFile(), preferredIndex);
    return;
  }
  if (!event.target.matches("textarea, input")) {
    const text = event.clipboardData.getData("text/plain");
    if (text.trim()) {
      event.preventDefault();
      storeClipboardText(text, preferredIndex);
    }
  }
}

document.querySelectorAll(".drop-zone").forEach((zone) => {
  zone.addEventListener("paste", (event) => handlePasteEvent(event, Number(zone.dataset.setIndex)));
});

document.addEventListener("paste", (event) => {
  if (!event.defaultPrevented && !event.target.closest(".drop-zone")) handlePasteEvent(event);
});

pasteButton.addEventListener("click", async () => {
  if (!navigator.clipboard?.read) {
    statusNode.textContent = "Pulsa Ctrl+V para pegar; este navegador no permite leer el portapapeles mediante el botón.";
    return;
  }
  try {
    const clipboardItems = await navigator.clipboard.read();
    const imageType = clipboardItems.flatMap((item) => item.types).find((type) => type.startsWith("image/"));
    if (imageType) {
      const owner = clipboardItems.find((item) => item.types.includes(imageType));
      storeClipboardImage(await owner.getType(imageType));
      return;
    }
    const textType = clipboardItems.flatMap((item) => item.types).find((type) => type === "text/plain");
    if (textType) {
      const owner = clipboardItems.find((item) => item.types.includes(textType));
      storeClipboardText(await (await owner.getType(textType)).text());
      return;
    }
    statusNode.textContent = "El portapapeles no contiene una imagen ni texto.";
  } catch (error) {
    console.error(error);
    statusNode.textContent = "No se pudo acceder al portapapeles. Prueba con Ctrl+V.";
  }
});

function normalize(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/â€™|â€˜|´|`/g, "'")
    .replace(/&/g, " and ")
    .replace(/\b(feat|ft)\.?\b.*$/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|a|an|of|to|in|on|my|like)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function editDistance(a, b) {
  const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = previous[j];
      previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return previous[b.length];
}

function similarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const distanceScore = 1 - editDistance(a, b) / Math.max(a.length, b.length);
  const aTokens = new Set(a.split(" "));
  const bTokens = new Set(b.split(" "));
  const common = [...aTokens].filter((token) => bTokens.has(token)).length;
  const tokenScore = (2 * common) / (aTokens.size + bTokens.size);
  const containment = a.includes(b) || b.includes(a) ? .92 : 0;
  return Math.max(containment, distanceScore * .62 + tokenScore * .38);
}

function cleanLine(line) {
  return line
    .replace(/^\s*[|Il]?\s*\d{1,2}\s*(?:[.)\-:–—]+\s*|\s+)/, "")
    .replace(/\s*\.(?:mp3|wav|m4a|aac|flac|ogg)\s*$/i, "")
    .replace(/\s*\(\s*(?:[A-G](?:#|b)?m?|por confirmar)\s*\)\s*$/i, "")
    .replace(/\s+(?:[A-G](?:#|b)?m?|por confirmar)\s*$/i, "")
    .replace(/^[^a-zÀ-ÿ0-9]+/i, "")
    .replace(/[|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectedKey(line) {
  const withoutExtension = line.replace(/\s*\.(?:mp3|wav|m4a|aac|flac|ogg)\s*$/i, "");
  return withoutExtension.match(/\(\s*([A-G](?:#|b)?m?)\s*\)\s*$/i)?.[1] || null;
}

function extractLines(rawText) {
  const sourceLines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const numberedLines = sourceLines.filter((line) => /^\s*[|Il]?\s*\d{1,2}\s*(?:[.)\-:–—]+|\s+)/.test(line));
  const likelySongLines = numberedLines.length >= 2 ? numberedLines : sourceLines;
  return likelySongLines
    .map((line) => ({ title: cleanLine(line), key: detectedKey(line) }))
    .filter((line) => /[a-zÀ-ÿ].*[a-zÀ-ÿ]/i.test(line.title) && !/^set\s*\d?$/i.test(line.title));
}

function matchSong(rawTitle, fallbackKey = null) {
  const target = normalize(rawTitle);
  const ranked = repertoire
    .map((song) => ({ song, score: similarity(target, normalize(song.title)) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const hasUsableMatch = best && best.score >= .44;
  return {
    rawTitle,
    songId: hasUsableMatch ? best.song.id : null,
    title: hasUsableMatch ? best.song.title : rawTitle,
    key: hasUsableMatch ? best.song.key : (fallbackKey || "—"),
    confidence: hasUsableMatch ? best.score : 0
  };
}

function buildSets(texts) {
  sets = texts
    .map((text, index) => ({
      name: `Set ${index + 1}`,
      songs: extractLines(text).map((line) => matchSong(line.title, line.key))
    }))
    .filter((set) => set.songs.length);
  renderEditors();
}

function renderEditors() {
  const wasHidden = reviewPanel.hidden;
  editorsNode.replaceChildren();
  const uncertain = sets.flatMap((set) => set.songs).filter((item) => item.confidence < .62).length;
  warningsNode.textContent = uncertain
    ? `${uncertain} coincidencia${uncertain === 1 ? " necesita" : "s necesitan"} revisión (marcada${uncertain === 1 ? "" : "s"} en naranja).`
    : "Todas las canciones tienen una coincidencia clara.";

  sets.forEach((set, setIndex) => {
    const editor = document.createElement("article");
    editor.className = "set-editor";
    editor.innerHTML = `<header class="set-editor__header"><h3>${set.name}</h3><span>${set.songs.length} temas</span></header><div class="set-editor__songs"></div><button class="add-song" type="button">+ Añadir canción</button>`;
    const rows = editor.querySelector(".set-editor__songs");
    set.songs.forEach((item, songIndex) => rows.append(createSongRow(item, setIndex, songIndex)));
    editor.querySelector(".add-song").addEventListener("click", () => {
      set.songs.push({ rawTitle: "", songId: null, title: "", key: "—", confidence: 1 });
      renderEditors();
    });
    editorsNode.append(editor);
  });

  reviewPanel.hidden = sets.length === 0;
  if (!sets.length) statusNode.textContent = "No se han detectado canciones.";
  else if (wasHidden) reviewPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function createSongRow(item, setIndex, songIndex) {
  const row = document.createElement("div");
  row.className = `song-row${item.confidence < .62 ? " is-uncertain" : ""}`;
  row.innerHTML = `<span class="song-row__number">${songIndex + 1}</span><input list="songTitles" aria-label="Canción ${songIndex + 1}" value=""><span class="song-row__key"></span><span class="move-buttons"><button class="move-button" data-direction="up" type="button" aria-label="Subir canción">↑</button><button class="move-button" data-direction="down" type="button" aria-label="Bajar canción">↓</button></span><button class="icon-button delete-song" type="button" aria-label="Eliminar">×</button>`;
  const input = row.querySelector("input");
  const key = row.querySelector(".song-row__key");
  input.value = item.title;
  key.textContent = item.key;
  input.addEventListener("change", () => {
    const exact = repertoire.find((song) => normalize(song.title) === normalize(input.value));
    if (exact) {
      Object.assign(item, { songId: exact.id, title: exact.title, key: exact.key, confidence: 1 });
      input.value = exact.title;
      key.textContent = exact.key;
      row.classList.remove("is-uncertain");
    } else {
      const matched = matchSong(input.value);
      Object.assign(item, matched);
      input.value = matched.title;
      key.textContent = matched.key;
      row.classList.toggle("is-uncertain", matched.confidence < .62);
    }
  });
  const upButton = row.querySelector('[data-direction="up"]');
  const downButton = row.querySelector('[data-direction="down"]');
  upButton.disabled = songIndex === 0;
  downButton.disabled = songIndex === sets[setIndex].songs.length - 1;
  upButton.addEventListener("click", () => moveSong(setIndex, songIndex, songIndex - 1));
  downButton.addEventListener("click", () => moveSong(setIndex, songIndex, songIndex + 1));
  row.querySelector(".delete-song").addEventListener("click", () => {
    sets[setIndex].songs.splice(songIndex, 1);
    if (!sets[setIndex].songs.length) sets.splice(setIndex, 1);
    renderEditors();
  });
  return row;
}

function moveSong(setIndex, fromIndex, toIndex) {
  const songs = sets[setIndex].songs;
  if (toIndex < 0 || toIndex >= songs.length) return;
  const [song] = songs.splice(fromIndex, 1);
  songs.splice(toIndex, 0, song);
  renderEditors();
}

async function prepareImageForOcr(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.max(2, Math.min(4, 1200 / bitmap.width));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let offset = 0; offset < pixels.data.length; offset += 4) {
    const gray = pixels.data[offset] * .299 + pixels.data[offset + 1] * .587 + pixels.data[offset + 2] * .114;
    const contrasted = Math.max(0, Math.min(255, (gray - 128) * 1.65 + 128));
    pixels.data[offset] = contrasted;
    pixels.data[offset + 1] = contrasted;
    pixels.data[offset + 2] = contrasted;
  }
  context.putImageData(pixels, 0, 0);
  return canvas;
}

recognizeButton.addEventListener("click", async () => {
  const selected = [...selectedFiles];
  if (!selected.some(Boolean)) {
    statusNode.textContent = "Selecciona al menos una captura.";
    return;
  }
  if (!window.Tesseract) {
    statusNode.textContent = "No se pudo cargar el lector OCR. Usa la opción de pegar texto.";
    return;
  }
  recognizeButton.disabled = true;
  const texts = [];
  let worker = null;
  try {
    worker = await Tesseract.createWorker("eng", 1, {
      logger(message) {
        const activeSet = Number(statusNode.dataset.activeSet || 1);
        if (message.status === "recognizing text") statusNode.textContent = `Leyendo Set ${activeSet}… ${Math.round(message.progress * 100)} %`;
      }
    });
    await worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM?.SPARSE_TEXT || "11",
      preserve_interword_spaces: "1",
      user_defined_dpi: "300"
    });
    for (let i = 0; i < selected.length; i += 1) {
      if (!selected[i]) { texts.push(""); continue; }
      statusNode.dataset.activeSet = String(i + 1);
      statusNode.textContent = `Leyendo Set ${i + 1}… 0 %`;
      const preparedImage = await prepareImageForOcr(selected[i]);
      const result = await worker.recognize(preparedImage);
      texts.push(result.data.text);
      textareas[i].value = result.data.text;
    }
    statusNode.textContent = "Lectura terminada. Revisa las coincidencias.";
    buildSets(texts);
  } catch (error) {
    console.error(error);
    statusNode.textContent = "El OCR no ha podido leer la imagen. Prueba a pegar el texto manualmente.";
  } finally {
    if (worker) await worker.terminate().catch((error) => console.error(error));
    delete statusNode.dataset.activeSet;
    recognizeButton.disabled = false;
  }
});

useTextButton.addEventListener("click", () => buildSets(textareas.map((textarea) => textarea.value)));

function renderPrintCards() {
  printArea.replaceChildren();
  sets.forEach((set, setIndex) => {
    let sheet = printArea.lastElementChild;
    if (setIndex % 2 === 0) {
      sheet = document.createElement("div");
      sheet.className = "print-sheet";
      printArea.append(sheet);
    }
    const card = document.createElement("article");
    card.className = "print-card";
    card.dataset.count = String(set.songs.length);
    const border = document.createElement("div");
    border.className = "print-card__border";
    const heading = document.createElement("h2");
    heading.className = "print-card__number";
    heading.textContent = String(setIndex + 1);
    const list = document.createElement("ol");
    list.className = "print-list";
    set.songs.forEach((item, index) => {
      const line = document.createElement("li");
      const number = document.createElement("span");
      const title = document.createElement("span");
      const dots = document.createElement("span");
      const key = document.createElement("span");
      number.className = "number";
      number.textContent = `${String(index + 1).padStart(2, " ")}.`;
      title.className = "title";
      title.textContent = item.title.slice(0, 19);
      dots.className = "dots";
      key.className = "key";
      key.textContent = item.key;
      line.append(number, title, dots, key);
      list.append(line);
    });
    border.append(heading, list);
    card.append(border);
    sheet.append(card);
  });
}

printButton.addEventListener("click", () => {
  renderPrintCards();
  window.print();
});
