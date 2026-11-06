/* Dibujo de la lista oficial (imagen y PDF). Lo usan panel.html y lista.html. */
(function () {
  const AZ = "#243562", DOR = "#8a6a1f", CLA = "#b9c7e6", GOLD = "#f2c230";
  const INFO_TXT = "Mas informes por whatsapp al 3411209957";
  const LEMA = "APUESTA POR TU PASIÓN, GANA POR TU EQUIPO";

  const norm = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
  const slug = n => norm(n).replace(/ /g, "");
  const iniciales = n => n.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ ]/g, "").split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const num = t => { const v = parseFloat(String(t || "").replace(/[^0-9.]/g, "")); return isNaN(v) ? null : v; };
  const din = v => "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const reparto = (total, k) => { const c = Math.floor(total * 100 / k) / 100; return { c, exacto: Math.round(c * k * 100) === Math.round(total * 100) }; };
  const txtPick = (par, p) => p === "L" ? par[0] : p === "V" ? par[1] : p === "E" ? "Empate" : "—";

  const cache = {};
  const cargarImg = src => cache[src] || (cache[src] = new Promise(res => {
    const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src;
  }));

  // Calcula aciertos, ganadores y los textos de premio. D = mismo formato que lista.json
  function resumen(D, orden) {
    const n = D.partidos.length, res = D.resultados || {};
    const hechos = Object.keys(res).filter(k => res[k]).length;
    const filas = D.quinielas.map((q, i) => {
      let a = 0;
      for (let k = 1; k <= n; k++) if (res[k] && q.p[k - 1] === res[k]) a++;
      return { n: q.n, p: q.p, a, i };
    });
    if (orden === "aciertos") filas.sort((x, y) => y.a - x.a || x.i - y.i);
    const max = filas.reduce((m, f) => Math.max(m, f.a), 0);
    const terminado = n > 0 && hechos === n;
    const ganadores = terminado ? filas.filter(f => f.a === max) : [];
    const lineas = [];
    if (terminado) {
      lineas.push({ tipo: "gan", t: `${ganadores.length > 1 ? "GANADORES (empate)" : "GANADOR"}: ${ganadores.map(g => g.n).join(", ")} — ${max} de ${n} aciertos` });
      const qg = num(D.qg);
      if (qg) {
        if (ganadores.length > 1) {
          const r = reparto(qg, ganadores.length);
          lineas.push({ tipo: "premio", t: `Premio QG ${din(qg)} entre ${ganadores.length} = ${r.exacto ? "" : "≈ "}${din(r.c)} para cada uno` });
        } else lineas.push({ tipo: "premio", t: `Premio QG: ${din(qg)}` });
      }
      if (D.acum) {
        const montos = String(D.acum).match(/\$\s*[\d,]+(?:\.\d{1,2})?/g);
        const acumTxt = montos ? montos[montos.length - 1].replace(/\s/g, "") : D.acum;
        const acum = num(acumTxt);
        if (max === n && acum) {
          const r = reparto(acum, ganadores.length);
          lineas.push({ tipo: "premio", t: `¡10 de 10! Acumulado ${acumTxt}` + (ganadores.length > 1 ? ` = ${r.exacto ? "" : "≈ "}${din(r.c)} para cada uno` : "") });
        } else lineas.push({ tipo: "info", t: `Nadie acertó los ${n}: el acumulado 10/10 de ${acumTxt} se queda para la siguiente jornada` });
      }
    }
    return { n, res, hechos, filas, max, terminado, ganadores, lineas };
  }

  function envolver(ctx, texto, ancho) {
    const out = []; let cur = "";
    for (const w of texto.split(" ")) {
      const t = cur ? cur + " " + w : w;
      if (ctx.measureText(t).width > ancho && cur) { out.push(cur); cur = w; } else cur = t;
    }
    if (cur) out.push(cur);
    return out;
  }
  function ajustar(ctx, txt, ancho, px, peso) {
    let s = px;
    do { ctx.font = `${peso} ${s}px Arial, sans-serif`; s--; } while (ctx.measureText(txt).width > ancho && s > 8);
  }
  function circulo(ctx, x, y, r, txt) {
    ctx.fillStyle = AZ; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = `bold ${Math.round(r * 0.9)}px Arial`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(txt, x, y + 1);
  }

  // Dibuja la lista. op = { orden: "llegada"|"aciertos", canvas }
  async function dibujar(D, op) {
    op = op || {};
    const R = resumen(D, op.orden), n = R.n, filas = R.filas, hechos = R.hechos;
    const W = 1200, NOMW = 240, TOTW = 70, COLW = (W - NOMW - TOTW) / n;
    const HT = 150, HC = 90, HR = 36, HF = 110;
    const cv = op.canvas || document.createElement("canvas");
    cv.width = W; cv.height = 10;
    let ctx = cv.getContext("2d");
    const fuente = tipo => tipo === "gan" ? "bold 30px Arial, sans-serif" : "bold 25px Arial, sans-serif";
    const bloques = R.lineas.map(l => { ctx.font = fuente(l.tipo); return { ...l, ls: envolver(ctx, l.t, W - 40) }; });
    const LH = l => l.tipo === "gan" ? 38 : 32;
    const HW = bloques.reduce((s, b) => s + b.ls.length * LH(b) + 16, 0);
    const H = HT + HW + HC + filas.length * HR + HF;
    const S = 2; // doble resolución para que no se pixele
    cv.width = W * S; cv.height = H * S;
    cv.style.width = "100%"; cv.style.height = "auto";
    ctx = cv.getContext("2d");
    ctx.scale(S, S);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);

    // Encabezado
    ctx.fillStyle = AZ; ctx.fillRect(0, 0, W, HT);
    const logo = await cargarImg("logo.png");
    if (logo) { const h = HT - 24, w = logo.width * h / logo.height; ctx.drawImage(logo, 16, 12, w, h); }
    ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "bold 58px Arial"; ctx.fillText(`QT N°${D.num}`, 560, 52);
    ctx.font = "bold 36px Arial"; ctx.fillText("LISTA DE PARTICIPANTES", 560, 108);
    const bx = W - 330;
    ctx.fillStyle = "#1e63b5"; ctx.fillRect(bx, 0, 330, HT);
    ctx.fillStyle = "#fff";
    if (D.qg) { ajustar(ctx, "QG:" + D.qg, 300, 46, "bold"); ctx.fillText("QG:" + D.qg, bx + 165, D.acum ? 55 : 75); }
    if (D.acum) { ajustar(ctx, "Acumulado " + D.acum, 300, 24, "bold"); ctx.fillText("Acumulado " + D.acum, bx + 165, D.qg ? 112 : 75); }

    // Bloque de ganadores y premios (solo cuando ya están todos los resultados)
    let yb = HT;
    bloques.forEach(b => {
      const h = b.ls.length * LH(b) + 16;
      ctx.fillStyle = b.tipo === "gan" ? GOLD : b.tipo === "premio" ? "#fff3c4" : "#e6efff";
      ctx.fillRect(0, yb, W, h);
      ctx.fillStyle = "#111"; ctx.font = fuente(b.tipo); ctx.textAlign = "center"; ctx.textBaseline = "middle";
      b.ls.forEach((t, k) => ctx.fillText(t, W / 2, yb + 8 + k * LH(b) + LH(b) / 2));
      yb += h;
    });

    // Cabecera de columnas con escudos
    const yC = HT + HW, y0 = yC + HC;
    ctx.fillStyle = DOR; ctx.fillRect(0, yC, W, HC);
    ctx.fillStyle = "#fff"; ctx.font = "bold 20px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("PARTICIPANTES", NOMW / 2, yC + HC / 2);
    for (let k = 0; k < n; k++) {
      const x0 = NOMW + k * COLW, cx = x0 + COLW / 2, cy = yC + HC / 2 - 6;
      for (let j = 0; j < 2; j++) {
        const eq = D.partidos[k][j], img = await cargarImg(`logos/${slug(eq)}.png`);
        const px = cx + (j ? 20 : -20);
        if (img) { const s = 36, r = Math.min(s / img.width, s / img.height); ctx.drawImage(img, px - img.width * r / 2, cy - img.height * r / 2, img.width * r, img.height * r); }
        else circulo(ctx, px, cy, 17, iniciales(eq));
      }
      ctx.fillStyle = "#fff"; ctx.font = "bold 13px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(`${k + 1}`, cx, yC + HC - 14);
    }
    ctx.fillStyle = "#fff"; ctx.font = "bold 16px Arial"; ctx.fillText("TOTAL", W - TOTW / 2, yC + HC / 2);

    // Filas (los ganadores van marcados en dorado)
    filas.forEach((q, r) => {
      const y = y0 + r * HR, gana = R.terminado && q.a === R.max;
      ctx.fillStyle = r % 2 ? CLA : "#fff"; ctx.fillRect(0, y, W, HR);
      if (gana) { ctx.fillStyle = GOLD; ctx.fillRect(0, y, NOMW, HR); ctx.fillRect(W - TOTW, y, TOTW, HR); }
      ctx.fillStyle = "#111"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ajustar(ctx, q.n, NOMW - 14, 17, "bold"); ctx.fillText(q.n, NOMW / 2, y + HR / 2 + 1);
      for (let k = 0; k < n; k++) {
        const x0 = NOMW + k * COLW, p = q.p[k], res = R.res[k + 1];
        if (res && p === res) { ctx.fillStyle = "#a8e0b4"; ctx.fillRect(x0, y, COLW, HR); }
        const t = txtPick(D.partidos[k], p).toUpperCase();
        ctx.fillStyle = "#111"; ajustar(ctx, t, COLW - 8, 15, "bold"); ctx.fillText(t, x0 + COLW / 2, y + HR / 2 + 1);
      }
      if (hechos) { ctx.fillStyle = "#111"; ctx.font = "bold 20px Arial"; ctx.fillText(String(q.a), W - TOTW / 2, y + HR / 2 + 1); }
    });
    // Líneas
    ctx.strokeStyle = "#111"; ctx.lineWidth = 1;
    const bot = y0 + filas.length * HR;
    for (let r = 0; r <= filas.length; r++) { ctx.beginPath(); ctx.moveTo(0, y0 + r * HR + .5); ctx.lineTo(W, y0 + r * HR + .5); ctx.stroke(); }
    [0, NOMW, ...Array.from({ length: n }, (_, k) => NOMW + (k + 1) * COLW), W - 1].forEach(x => { ctx.beginPath(); ctx.moveTo(x + .5, yC); ctx.lineTo(x + .5, bot); ctx.stroke(); });

    // Pie
    ctx.fillStyle = AZ; ctx.fillRect(0, bot, W, 60);
    ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "bold 28px Arial";
    ctx.fillText(INFO_TXT, W / 2, bot + 30);
    ctx.fillStyle = DOR; ctx.fillRect(0, bot + 60, W, HF - 60);
    ctx.fillStyle = "#fff"; ctx.font = "bold 24px Arial"; ctx.fillText(LEMA, W / 2, bot + 85);
    cv.style.display = "block";
    return { canvas: cv, geom: { W, HT, HW, HC, HR, HF, rows: filas.length, y0 } };
  }

  // PDF en hojas tamaño carta/A4: la cabecera de columnas se repite en cada hoja
  async function crearPDF(info) {
    const cv = info.canvas, g = info.geom;
    const PW = 595.28, PHp = 841.89, PH = Math.round(g.W * PHp / PW);
    const top1 = g.HT + g.HW + g.HC;
    const pages = []; let i = 0, first = true;
    while (i < g.rows) {
      const cap = Math.max(1, Math.floor((PH - (first ? top1 : g.HC)) / g.HR));
      const take = Math.min(cap, g.rows - i);
      pages.push([i, i + take]); i += take; first = false;
    }
    if (!pages.length) pages.push([0, 0]);
    const last = pages[pages.length - 1];
    const free = PH - ((pages.length === 1 ? top1 : g.HC) + (last[1] - last[0]) * g.HR);
    if (free < g.HF) {                       // el pie no cabe: pasa a una hoja nueva con sus últimas filas
      const k = Math.ceil((g.HF - free) / g.HR);
      if (last[1] - last[0] > k) { last[1] -= k; pages.push([last[1], last[1] + k]); }
      else pages.push([last[1], last[1]]);
    }
    const jpgs = [];
    for (let p = 0; p < pages.length; p++) {
      const [a, b] = pages[p];
      const t = document.createElement("canvas"); t.width = g.W; t.height = PH;
      const c = t.getContext("2d"); c.fillStyle = "#fff"; c.fillRect(0, 0, g.W, PH);
      let y;
      if (p === 0) { c.drawImage(cv, 0, 0, g.W, top1, 0, 0, g.W, top1); y = top1; }
      else { c.drawImage(cv, 0, g.HT + g.HW, g.W, g.HC, 0, 0, g.W, g.HC); y = g.HC; }
      const h = (b - a) * g.HR;
      if (h > 0) { c.drawImage(cv, 0, g.y0 + a * g.HR, g.W, h, 0, y, g.W, h); c.fillStyle = "#111"; c.fillRect(0, y + h - 1, g.W, 1); y += h; }
      if (p === pages.length - 1) c.drawImage(cv, 0, g.y0 + g.rows * g.HR, g.W, g.HF, 0, y, g.W, g.HF);
      const blob = await new Promise(r => t.toBlob(r, "image/jpeg", 0.9));
      jpgs.push(new Uint8Array(await blob.arrayBuffer()));
    }
    const enc = new TextEncoder(), partes = [], offs = []; let off = 0;
    const add = u => { partes.push(u); off += u.length; };
    const addS = s => add(enc.encode(s));
    const obj = (id, fn) => { offs[id] = off; addS(`${id} 0 obj\n`); fn(); addS("endobj\n"); };
    const nObj = 2 + pages.length * 3;
    addS("%PDF-1.4\n");
    obj(1, () => addS("<< /Type /Catalog /Pages 2 0 R >>\n"));
    obj(2, () => addS(`<< /Type /Pages /Kids [${pages.map((_, k) => `${3 + k * 3} 0 R`).join(" ")}] /Count ${pages.length} >>\n`));
    pages.forEach((_, k) => {
      const pid = 3 + k * 3, cid = pid + 1, iid = pid + 2, cont = `q ${PW} 0 0 ${PHp} 0 0 cm /Im0 Do Q`;
      obj(pid, () => addS(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PHp}] /Resources << /XObject << /Im0 ${iid} 0 R >> >> /Contents ${cid} 0 R >>\n`));
      obj(cid, () => addS(`<< /Length ${cont.length} >>\nstream\n${cont}\nendstream\n`));
      obj(iid, () => {
        addS(`<< /Type /XObject /Subtype /Image /Width ${g.W} /Height ${PH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpgs[k].length} >>\nstream\n`);
        add(jpgs[k]); addS("\nendstream\n");
      });
    });
    const xref = off;
    addS(`xref\n0 ${nObj + 1}\n0000000000 65535 f \n`);
    for (let id = 1; id <= nObj; id++) addS(String(offs[id]).padStart(10, "0") + " 00000 n \n");
    addS(`trailer\n<< /Size ${nObj + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
    return new Blob(partes, { type: "application/pdf" });
  }

  const aBase64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = rej; r.readAsDataURL(blob); });
  function descargar(blob, nombre) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  // Entrega el archivo: app nueva → hoja de compartir; app vieja → no puede; navegador → descarga
  async function entregar(blob, nombre, mime) {
    if (window.Puente && typeof Puente.compartirArchivo === "function") { Puente.compartirArchivo(await aBase64(blob), nombre, mime); return "app"; }
    if (window.Puente) return "appvieja";
    descargar(blob, nombre);
    return "descargado";
  }

  window.ListaImg = { resumen, dibujar, crearPDF, descargar, entregar };
})();
