const { AppError } = require('./errors');

const bad = (msg) => new AppError(400, 'VALIDATION_ERROR', msg);

function positiveInt(value, field) {
  if (!Number.isInteger(value) || value < 1) throw bad(`${field} doit être un entier supérieur ou égal à 1`);
  return value;
}

function nonEmptyString(value, field, minLength = 1) {
  if (typeof value !== 'string' || value.trim().length < minLength) {
    throw bad(`${field} est obligatoire (${minLength} caractère(s) minimum)`);
  }
  return value.trim();
}

function oneOf(value, allowed, field) {
  if (!allowed.includes(value)) throw bad(`${field} doit valoir l'une des valeurs : ${allowed.join(', ')}`);
  return value;
}

function productId(value) {
  if (typeof value === 'number' && Number.isInteger(value)) return String(value);
  return nonEmptyString(value, 'productId');
}

function parseId(raw) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

module.exports = { positiveInt, nonEmptyString, oneOf, productId, parseId };
