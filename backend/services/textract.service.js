async function extractTextFromScannedPdf(document) {
  console.log('[textract:mock:start]', {
    document: document.originalName,
    objectKey: document.objectKey
  });

  return {
    provider: 'aws-textract-mock',
    documentName: document.originalName,
    objectKey: document.objectKey,
    pages: 4,
    confidence: 0.94,
    text: [
      'Audited financial statements for MSME borrower.',
      'Revenue 18500000, profit 2450000, liabilities 6300000.',
      'GST filings and bank statements indicate regular turnover.'
    ].join(' ')
  };
}

async function extractScannedDocuments(documents, detections) {
  const scannedDocuments = documents.filter((document) => {
    const detection = detections.find((item) => item.storedName === document.storedName);
    return detection && detection.scanned;
  });

  const outputs = [];

  for (const document of scannedDocuments) {
    outputs.push(await extractTextFromScannedPdf(document));
  }

  return outputs;
}

module.exports = {
  extractScannedDocuments
};
