const knex = require('knex');

const config = {
  client: 'pg',
  connection: {
    host: 'localhost',
    port: 5432,
    user: 'postgres',        // your DB username
    password: 'Dr_Oosef124', // your DB password
    database: 'food_app'
  }
};

const db = knex(config);
module.exports = db;
