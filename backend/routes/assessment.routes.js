const express = require('express');
const multer = require('multer');
const {
  createAssessment,
  getAssessment,
  recalculateAssessment,
  reviewAssessment
} = require('../controllers/assessment.controller');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 20,
    fileSize: 25 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error(`Only PDF uploads are supported. Received ${file.originalname}`));
    }

    cb(null, true);
  }
});

router.post('/', upload.array('files'), createAssessment);
router.get('/:id', getAssessment);
router.post('/:id/recalculate', recalculateAssessment);
router.post('/:id/review', reviewAssessment);

module.exports = router;
