import { parentPort, workerData } from 'node:worker_threads';

const limit = 30000;
const errors = {
  format: 'El contenido no coincide con el formato del archivo o no se puede leer.',
  empty: 'No se encontró texto. Si es un PDF escaneado, exporta una versión con texto; no se aplica OCR.',
  large: 'El documento supera 30000 caracteres. Divídelo o resume su contenido.',
};
function bounded(text) {
  if (text.length > limit * 2 || [...text].length > limit) throw new Error('large');
  return text;
}
async function extract() {
  const bytes = Buffer.from(workerData.bytes), extension = workerData.extension;
  let text;
  if (['txt', 'md'].includes(extension)) {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (/[\x00-\x08\x0e-\x1f]/.test(text)) throw new Error('format');
  } else if (extension === 'pdf') {
    if (bytes.subarray(0, 5).toString() !== '%PDF-') throw new Error('format');
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const task = getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, useSystemFonts: false, verbosity: 0 });
    try {
      const pdf = await task.promise;
      text = '';
      for (let page = 1; page <= pdf.numPages; page++) {
        const sheet = await pdf.getPage(page);
        const content = await sheet.getTextContent();
        text = bounded(text + content.items.map((item) => (item.str || '') + (item.hasEOL ? '\n' : ' ')).join('') + '\n');
        sheet.cleanup();
      }
    } finally { await task.destroy(); }
  } else {
    const expected = extension === 'doc' ? 'd0cf11e0a1b11ae1' : '504b0304';
    if (bytes.subarray(0, expected.length / 2).toString('hex') !== expected) throw new Error('format');
    const { default: WordExtractor } = await import('word-extractor');
    const document = await new WordExtractor().extract(bytes);
    text = [document.getBody(), document.getHeaders(), document.getFooters(), document.getFootnotes(), document.getEndnotes(), document.getTextboxes()].filter(Boolean).join('\n');
  }
  text = bounded(text.replace(/\r\n?/g, '\n').trim());
  if (!text) throw new Error('empty');
  return text;
}
try { parentPort.postMessage({ text: await extract() }); }
catch (error) { parentPort.postMessage({ error: errors[error.message] || errors.format }); }
