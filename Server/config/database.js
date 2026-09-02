const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  "jibzconnect",
  "postgres",
  "Jibran1122@",
  {
    host: "localhost",
    port: 5432,
    dialect: "postgres",
    logging: false,
  }
);

module.exports = sequelize;