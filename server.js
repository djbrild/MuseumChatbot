const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors()); // Autorise toutes les origines
app.use(express.json());

app.post('/api/generate', async (req, res) => {
  try {
    const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    const data = await ollamaResponse.json();
    res.json(data);
  } catch (error) {
    console.error('Erreur middleware:', error);
    res.status(500).json({ error: 'Erreur lors de la requête à Ollama' });
  }
});

app.listen(3000, () => {
  console.log('Middleware en écoute sur http://localhost:8000');
});
