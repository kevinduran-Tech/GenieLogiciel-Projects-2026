module.exports = {
  port: Number(process.env.PORT) || 3003,
  // Doit être le même secret que celui utilisé par le Groupe 1 pour signer ses jetons JWT.
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-a-remplacer',
  dbFile: process.env.DB_FILE || 'data/groupe3.db',
};
