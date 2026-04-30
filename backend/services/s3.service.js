const fs = require('fs/promises');
const path = require('path');

const storageRoot = process.env.LOCAL_S3_ROOT || path.join(__dirname, '..', 'assessments');
const siemRoot = process.env.LOCAL_SIEM_ROOT || path.join(__dirname, '..', 'siem-logs');

function assessmentRoot(assessmentId) {
  return path.join(storageRoot, assessmentId);
}

async function ensureDirectory(directoryPath) {
  await fs.mkdir(directoryPath, { recursive: true });
}

function safeFilename(filename) {
  return filename
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '_')
    .slice(0, 180);
}

async function saveAssessmentDocuments(assessmentId, files) {
  const docsDirectory = path.join(assessmentRoot(assessmentId), 'docs');
  await ensureDirectory(docsDirectory);

  const savedDocuments = [];

  for (const [index, file] of files.entries()) {
    const storedName = `${String(index + 1).padStart(2, '0')}-${safeFilename(file.originalname)}`;
    const objectKey = `assessments/${assessmentId}/docs/${storedName}`;
    const absolutePath = path.join(docsDirectory, storedName);

    await fs.writeFile(absolutePath, file.buffer);

    savedDocuments.push({
      originalName: file.originalname,
      storedName,
      objectKey,
      mimeType: file.mimetype,
      size: file.size,
      uploadedAt: new Date().toISOString()
    });
  }

  return savedDocuments;
}

async function writeAssessmentJson(assessmentId, relativePath, payload) {
  const filePath = path.join(assessmentRoot(assessmentId), relativePath);
  await ensureDirectory(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2));
}

async function writeAssessmentFile(assessmentId, relativePath, payload) {
  const filePath = path.join(assessmentRoot(assessmentId), relativePath);
  await ensureDirectory(path.dirname(filePath));
  await fs.writeFile(filePath, payload);
  return filePath;
}

async function getAssessmentMetadata(assessmentId) {
  return readJsonIfExists(path.join(assessmentRoot(assessmentId), 'metadata.json'));
}

async function updateAssessmentMetadata(assessmentId, patch) {
  const metadataPath = path.join(assessmentRoot(assessmentId), 'metadata.json');
  const currentMetadata = await readJsonIfExists(metadataPath);

  if (!currentMetadata) {
    const err = new Error(`Assessment metadata not found for ${assessmentId}`);
    err.statusCode = 404;
    throw err;
  }

  const nextMetadata = {
    ...currentMetadata,
    ...patch,
    updatedAt: new Date().toISOString()
  };

  await writeAssessmentJson(assessmentId, 'metadata.json', nextMetadata);
  return nextMetadata;
}

async function readJsonIfExists(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return null;
    }

    throw err;
  }
}

async function appendSiemLogEntries(entries) {
  const date = new Date().toISOString().slice(0, 10);
  const filePath = path.join(siemRoot, `${date}.json`);
  const currentEntries = (await readJsonIfExists(filePath)) || [];
  const normalizedEntries = Array.isArray(entries) ? entries : [entries];

  await ensureDirectory(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify([...currentEntries, ...normalizedEntries], null, 2));

  return filePath;
}

async function readSiemLog(date) {
  return readJsonIfExists(path.join(siemRoot, `${date}.json`));
}

async function readApiResponses(assessmentId) {
  const responsesPath = path.join(assessmentRoot(assessmentId), 'api-responses');

  try {
    const entries = await fs.readdir(responsesPath, { withFileTypes: true });
    const responses = {};

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.json')) {
        const apiName = path.basename(entry.name, '.json');
        responses[apiName] = await readJsonIfExists(path.join(responsesPath, entry.name));
      }
    }

    return responses;
  } catch (err) {
    if (err.code === 'ENOENT') {
      return {};
    }

    throw err;
  }
}

async function getAssessmentDocuments(assessmentId) {
  const metadata = await getAssessmentMetadata(assessmentId);

  if (!metadata) {
    const err = new Error(`Assessment metadata not found for ${assessmentId}`);
    err.statusCode = 404;
    throw err;
  }

  return metadata.documents.map((document) => ({
    ...document,
    localPath: path.join(assessmentRoot(assessmentId), 'docs', document.storedName)
  }));
}

async function readFullAssessment(assessmentId) {
  const root = assessmentRoot(assessmentId);

  const [metadata, extracted, results, webhookDelivery, apiResponses] = await Promise.all([
    readJsonIfExists(path.join(root, 'metadata.json')),
    readJsonIfExists(path.join(root, 'extracted.json')),
    readJsonIfExists(path.join(root, 'results.json')),
    readJsonIfExists(path.join(root, 'webhook-delivery.json')),
    readApiResponses(assessmentId)
  ]);

  return {
    metadata,
    extracted,
    results,
    webhookDelivery,
    apiResponses
  };
}

module.exports = {
  storageRoot,
  siemRoot,
  assessmentRoot,
  saveAssessmentDocuments,
  writeAssessmentJson,
  writeAssessmentFile,
  appendSiemLogEntries,
  readSiemLog,
  getAssessmentMetadata,
  getAssessmentDocuments,
  updateAssessmentMetadata,
  readFullAssessment
};
