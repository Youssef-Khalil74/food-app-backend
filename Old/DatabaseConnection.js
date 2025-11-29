// import the knex library that will allow us to
// construct SQL statements
const knex = require('knex');
// you need to change password from 123 to your installed password
// so you don't encounter authenication error with database 
// localhost means your local machine (your working laptop)

const config = {
  client: 'pg',
  connection: {
    host : 'localhost',
    port : 3000,
    user : 'postgres',
    password : 'Dr_Oosef124',
    database : 'Customer'
  }
};

const db = knex(config);
// expose the created connection so we can
// use it in other files to make sql statements
module.exports = db;