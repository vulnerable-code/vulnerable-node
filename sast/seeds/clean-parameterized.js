// CLEAN SEED — scanners should report NOTHING here.
// Same shape as sqli-concat.js but parameterized.
const { Pool } = require("pg");
const pool = new Pool({ connectionString: "postgres://u:p@localhost/db" });

function queryUser(username) {
  return pool.query("SELECT * FROM users WHERE name = $1", [username]);
}

function queryOrder(id) {
  return pool.query("SELECT * FROM orders WHERE id = $1", [Number(id)]);
}

function searchProducts(q) {
  const pattern = `%${q}%`;
  return pool.query("SELECT * FROM products WHERE name ILIKE $1", [pattern]);
}

module.exports = { queryUser, queryOrder, searchProducts };