const express = require('express');
const http = require('http');
const cors = require('cors');
const assessmentRoutes = require('./routes/assessment.routes');
const { initializeSockets } = require('./sockets');

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 4000;
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: frontendOrigin }));
app.use(express.json({ limit: '2mb' }));
initializeSockets(server, { corsOrigin: frontendOrigin });

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'msme-underwriting-api' });
});

app.use('/api/assessment', assessmentRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

app.use((err, _req, res, _next) => {
  console.error('[api:error]', err);
  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal server error'
  });
});

server.listen(port, () => {
  console.log(`[api] App EC2 simulation listening on port ${port}`);
});
