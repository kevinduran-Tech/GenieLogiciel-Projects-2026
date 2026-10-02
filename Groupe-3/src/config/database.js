require('dotenv').config();
const { Sequelize } = require('sequelize');

// En environnement de test, on utilise SQLite en mémoire pour ne pas
// dépendre d'un serveur PostgreSQL externe (voir tests/).
const isTest = process.env.NODE_ENV === 'test';

const sequelize = isTest
  ? new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false })
  : new Sequelize(
      process.env.DB_NAME || 'groupe3_panier',
      process.env.DB_USER || 'postgres',
      process.env.DB_PASSWORD || 'postgres',
      {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: false,
      }
    );

module.exports = sequelize;
