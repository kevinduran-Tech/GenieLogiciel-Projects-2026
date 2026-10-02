/**
 * Interface d'accès au catalogue et aux stocks (module du Groupe 2).
 *
 * Le module Groupe 3 ne dépend que de ces 4 méthodes asynchrones. Pour brancher le vrai
 * module du Groupe 2, il suffit d'écrire un client qui respecte ce même contrat
 * (voir docs/Guide_integration_API.md) et de le passer à createApp().
 *
 *   getProduct(productId)        -> { id, name, price, stock } | null
 *   reserveStock(lines)          -> réserve TOUTES les lignes ou aucune (erreur INSUFFICIENT_STOCK)
 *   releaseStock(lines)          -> remet les quantités en stock
 *   lines = [{ productId, quantity }]
 *
 * La classe ci-dessous est une version en mémoire, utilisée pour le développement et les tests.
 */
const { AppError } = require('../errors');

class InMemoryCatalog {
  constructor(products = []) {
    this.products = new Map(products.map((p) => [String(p.id), { ...p, id: String(p.id) }]));
  }

  async getProduct(productId) {
    const p = this.products.get(String(productId));
    return p ? { ...p } : null;
  }

  async reserveStock(lines) {
    for (const l of lines) {
      const p = this.products.get(String(l.productId));
      if (!p) throw new AppError(409, 'PRODUCT_UNAVAILABLE', `Produit ${l.productId} introuvable`);
      if (p.stock < l.quantity) {
        throw new AppError(409, 'INSUFFICIENT_STOCK', `Stock insuffisant pour « ${p.name} » (disponible : ${p.stock})`);
      }
    }
    for (const l of lines) this.products.get(String(l.productId)).stock -= l.quantity;
  }

  async releaseStock(lines) {
    for (const l of lines) {
      const p = this.products.get(String(l.productId));
      if (p) p.stock += l.quantity;
    }
  }

  stockOf(productId) {
    return this.products.get(String(productId)).stock;
  }
}

function demoCatalog() {
  return new InMemoryCatalog([
    { id: 'p1', name: 'Riz parfumé 5 kg', price: 4500, stock: 50 },
    { id: 'p2', name: 'Huile végétale 1 L', price: 1500, stock: 80 },
    { id: 'p3', name: 'Sucre en poudre 1 kg', price: 800, stock: 100 },
    { id: 'p4', name: 'Savon de ménage', price: 350, stock: 200 },
  ]);
}

module.exports = { InMemoryCatalog, demoCatalog };
