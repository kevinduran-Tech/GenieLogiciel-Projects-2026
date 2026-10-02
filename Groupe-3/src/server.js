const config = require('./config');
const { openDatabase } = require('./db/database');
const { demoCatalog } = require('./integrations/catalogClient');
const { createApp } = require('./app');

const db = openDatabase(config.dbFile);
const app = createApp({ db, catalog: demoCatalog(), jwtSecret: config.jwtSecret });

app.listen(config.port, () => {
  console.log(`Module Groupe 3 démarré sur http://localhost:${config.port}`);
});
