import app from './app';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.listen(PORT, () => {
  console.log(`🚀 Serviço de vínculo rodando na porta ${PORT}`);
  console.log(`📍 Health: http://localhost:${PORT}/health`);
});
