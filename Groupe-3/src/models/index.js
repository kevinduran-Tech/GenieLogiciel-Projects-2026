const sequelize = require('../config/database');
const Panier = require('./panier.model');
const LignePanier = require('./lignePanier.model');
const Commande = require('./commande.model');
const LigneCommande = require('./ligneCommande.model');
const Facture = require('./facture.model');
const Livraison = require('./livraison.model');

// Panier (1) --- (N) LignePanier
Panier.hasMany(LignePanier, { foreignKey: 'panier_id', as: 'lignes' });
LignePanier.belongsTo(Panier, { foreignKey: 'panier_id' });

// Commande (1) --- (N) LigneCommande
Commande.hasMany(LigneCommande, { foreignKey: 'commande_id', as: 'lignes' });
LigneCommande.belongsTo(Commande, { foreignKey: 'commande_id' });

// Commande (1) --- (1) Facture
Commande.hasOne(Facture, { foreignKey: 'commande_id', as: 'facture' });
Facture.belongsTo(Commande, { foreignKey: 'commande_id' });

// Commande (1) --- (1) Livraison
Commande.hasOne(Livraison, { foreignKey: 'commande_id', as: 'livraison' });
Livraison.belongsTo(Commande, { foreignKey: 'commande_id' });

module.exports = {
  sequelize,
  Panier,
  LignePanier,
  Commande,
  LigneCommande,
  Facture,
  Livraison,
};
