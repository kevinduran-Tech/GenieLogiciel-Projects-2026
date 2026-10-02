require('dotenv').config();
const express = require('express');
const { sequelize } = require('./models');
const panierRoutes = require('./routes/panier.routes');
const commandeRoutes = require('./routes/commande.routes');
const gestionErreurs = require('./middlewares/erreurs.middleware');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', module: 'panier-commandes-livraison' });
});

app.use('/api/panier', panierRoutes);
app.use('/api/commandes', commandeRoutes);

app.use(gestionErreurs);

const PORT = process.env.PORT || 3000;

async function start() {
  await sequelize.authenticate();
  await sequelize.sync();
  app.listen(PORT, () => {
    console.log(`Serveur Groupe 3 démarré sur le port ${PORT}`);
  });
}

if (require.main === module) {
  start();
}

module.exports = app;
