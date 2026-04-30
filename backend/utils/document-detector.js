const fs = require('fs/promises');

async function detectDocumentType(document) {
  const handle = await fs.open(document.localPath, 'r');

  try {
    const buffer = Buffer.alloc(4096);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const sample = buffer.subarray(0, bytesRead).toString('latin1');
    const lowerName = document.originalName.toLowerCase();

    const filenameLooksScanned =
      lowerName.includes('scan') ||
      lowerName.includes('scanned') ||
      lowerName.includes('image');
    const hasPdfTextOperators = /\/Font|BT|ET|TJ|Tj/.test(sample);
    const isScanned = filenameLooksScanned || !hasPdfTextOperators;

    return {
      originalName: document.originalName,
      storedName: document.storedName,
      objectKey: document.objectKey,
      type: isScanned ? 'scanned' : 'digital',
      scanned: isScanned,
      confidence: filenameLooksScanned ? 0.9 : hasPdfTextOperators ? 0.78 : 0.7,
      reason: isScanned
        ? 'No reliable embedded text signal detected'
        : 'Embedded PDF text operators detected'
    };
  } finally {
    await handle.close();
  }
}

async function detectDocuments(documents) {
  const detections = [];

  for (const document of documents) {
    detections.push(await detectDocumentType(document));
  }

  return detections;
}

module.exports = {
  detectDocuments
};
