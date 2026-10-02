const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LigneCommande = sequelize.define(
  'LigneCommande',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    commande_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    produit_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    quantite: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1 },
    },
    // Le prix est figé au moment de la commande : si le prix catalogue
    // change ensuite, la facture doit rester fidèle au montant payé.
    prix_unitaire: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
  },
  {
    tableName: 'lignes_commande',
    timestamps: true,
  }
);

module.exports = LigneCommande;
