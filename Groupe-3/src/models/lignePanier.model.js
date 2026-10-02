const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LignePanier = sequelize.define(
  'LignePanier',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    panier_id: {
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
  },
  {
    tableName: 'lignes_panier',
    timestamps: true,
  }
);

module.exports = LignePanier;
