const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Livraison = sequelize.define(
  'Livraison',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    commande_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true, // une livraison unique par commande
    },
    transporteur: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    statut: {
      type: DataTypes.ENUM(
        'EN_ATTENTE',
        'EN_PREPARATION',
        'EXPEDIEE',
        'LIVREE'
      ),
      defaultValue: 'EN_ATTENTE',
    },
    date_expedition: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    date_livraison: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'livraisons',
    timestamps: true,
  }
);

module.exports = Livraison;
