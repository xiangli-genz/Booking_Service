const mongoose = require('mongoose');

module.exports.connect = async() => {
  try {
    await mongoose.connect(process.env.DATABASE);
    console.log("Connected to database successfully");
  } catch (error) {
    console.log("Database connection error:");
    console.log(error);
  }
}