const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Cycle de vie (voir slide "Gestion des états") :
// EN_ATTENTE -> CONFIRMEE -> EN_PREPARATION -> EXPEDIEE -> LIVREE
// ANNULEE possible depuis n'importe quel statut avant EXPEDIEE
const Commande = sequelize.define(
  'Commande',
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
    date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    statut: {
      type: DataTypes.ENUM(
        'EN_ATTENTE',
        'CONFIRMEE',
        'EN_PREPARATION',
        'EXPEDIEE',
        'LIVREE',
        'ANNULEE'
      ),
      defaultValue: 'EN_ATTENTE',
    },
    montant_total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    adresse: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: 'commandes',
    timestamps: true,
  }
);

module.exports = Commande;
