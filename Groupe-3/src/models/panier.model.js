const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Statuts possibles d'un panier : ACTIF (en cours de constitution),
// VALIDE (transformé en commande), ABANDONNE
const Panier = sequelize.define(
  'Panier',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    client_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    date_creation: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    statut: {
      type: DataTypes.ENUM('ACTIF', 'VALIDE', 'ABANDONNE'),
      defaultValue: 'ACTIF',
    },
  },
  {
    tableName: 'paniers',
    timestamps: true,
  }
);

module.exports = Panier;
