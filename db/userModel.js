const mongoose = require("mongoose");
const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Please provide an Email!"],
    unique: [true, "Email Exist"],
  },

  password: {
    type: String,
    required: [true, "Please provide a password!"],
    unique: false,
  },
  status: {
    type: String,
    required: [true, "Please provide a status!"],
    unique: false,
  },
  name: String,
  lastName: String,
  subject: String,
  topic: String,
  levelOfEducation: String,
  localization: String,
  priceRange: Number,
  image: {
    type: String,
    default: "noname.png",
  },
});
// create a user table or collection if there is no table with that name already.
module.exports = mongoose.model.Users || mongoose.model("Users", UserSchema);
