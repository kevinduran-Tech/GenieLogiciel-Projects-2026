// Cycle de vie d'une commande : états, transitions autorisées et rôles habilités.
const STATUS = Object.freeze({
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PREPARING: 'PREPARING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
});

const TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED', 'REFUNDED'],
  PREPARING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

// Qui a le droit de faire passer une commande vers un état donné.
const ROLES_FOR_TARGET = {
  CONFIRMED: ['CLIENT', 'ADMIN'],
  PREPARING: ['ADMIN'],
  SHIPPED: ['ADMIN', 'LIVREUR'],
  DELIVERED: ['ADMIN', 'LIVREUR'],
  CANCELLED: ['CLIENT', 'ADMIN'],
  REFUNDED: ['ADMIN'],
};

const canTransition = (from, to) => (TRANSITIONS[from] || []).includes(to);

module.exports = { STATUS, TRANSITIONS, ROLES_FOR_TARGET, canTransition };
