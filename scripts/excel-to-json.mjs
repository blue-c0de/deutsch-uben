// Convierte data/Vocabulario_Aleman_Unificado.xlsx en los JSON que lee la web.
// Uso: npm run datos
import { mkdirSync, writeFileSync } from 'node:fs';
import { readSheet } from 'read-excel-file/node';

const ENTRADA = 'data/Vocabulario_Aleman_Unificado.xlsx';
const SALIDA = 'public/data';

/** Lee una hoja y devuelve una lista de objetos usando la fila 1 como nombres de columna. */
async function filas(hoja) {
  let rows;
  try {
    rows = await readSheet(ENTRADA, hoja);
  } catch (e) {
    throw new Error(`No se pudo leer la hoja «${hoja}» de ${ENTRADA}: ${e.message}`);
  }
  if (!rows.length) return [];
  const cabecera = rows[0].map((c) => String(c ?? '').trim());
  return rows
    .slice(1)
    .filter((fila) => fila.some((v) => v !== null && v !== undefined && String(v).trim() !== ''))
    .map((fila) => Object.fromEntries(cabecera.map((nombre, i) => [nombre, fila[i] ?? null])));
}

const texto = (v) => (v === null || v === undefined || String(v).trim() === '' ? null : String(v).trim());
const numero = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v));

// ---- Vocabulario ----
const vocabulario = (await filas('Vocabulario')).map((f) => ({
  id: numero(f.id),
  aleman: texto(f.aleman),
  formas: texto(f.formas),
  ingles: texto(f.ingles) ?? '',
  espanol: texto(f.espanol) ?? '',
  tipo: texto(f.tipo) ?? 'otro',
  categoria: texto(f.categoria),
  fuente: texto(f.fuente) ?? 'Sin fuente',
  modulo: numero(f.modulo),
  pagina: numero(f.pagina),
  seccion: texto(f.seccion),
  nota: texto(f.nota),
  revisar: String(f.revisar ?? '').toLowerCase().startsWith('s'),
}));

const sinId = vocabulario.filter((c) => c.id === null || !c.aleman);
if (sinId.length) throw new Error(`${sinId.length} filas sin id o sin «aleman» en la hoja Vocabulario`);
const ids = new Set();
for (const c of vocabulario) {
  if (ids.has(c.id)) throw new Error(`id repetido: ${c.id}`);
  ids.add(c.id);
}

// ---- Gramática ----
const aktivPassiv = (await filas('Aktiv-Passiv')).map((f) => ({
  id: numero(f.id),
  modo: texto(f.modo),
  tiempo: texto(f.tiempo),
  tipo_verbo: texto(f.tipo_verbo),
  voz: texto(f.voz),
  estructura: texto(f.estructura),
  ejemplo_aleman: texto(f.ejemplo_aleman),
  ejemplo_espanol: texto(f.ejemplo_espanol),
}));

const deklination = (await filas('Deklination')).map((f) => ({
  id: numero(f.id),
  nominativ: texto(f.nominativ),
  akkusativ: texto(f.akkusativ),
  genitiv: texto(f.genitiv),
  dativ: texto(f.dativ),
  nota: texto(f.nota),
}));

mkdirSync(SALIDA, { recursive: true });
writeFileSync(`${SALIDA}/vocabulario.json`, JSON.stringify(vocabulario));
writeFileSync(`${SALIDA}/aktiv-passiv.json`, JSON.stringify(aktivPassiv));
writeFileSync(`${SALIDA}/deklination.json`, JSON.stringify(deklination));

console.log(`Vocabulario: ${vocabulario.length} tarjetas`);
console.log(`Aktiv-Passiv: ${aktivPassiv.length} filas`);
console.log(`Deklination: ${deklination.length} filas`);
