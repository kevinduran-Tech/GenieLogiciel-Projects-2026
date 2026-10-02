const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Facture = sequelize.define(
  'Facture',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    commande_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true, // une facture unique par commande
    },
    numero: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    date_emission: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    montant: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    statut: {
      type: DataTypes.ENUM('EMISE', 'REMBOURSEE'),
      defaultValue: 'EMISE',
    },
    date_remboursement: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'factures',
    timestamps: true,
  }
);

module.exports = Facture;
