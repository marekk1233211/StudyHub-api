var express = require("express");
var router = express.Router();
const cors = require("cors");

const multer = require("multer"); // to handle the image file
const path = require("path"); // to handle the image file
const fs = require("fs"); // to handle the image file

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../db/userModel");

//middlewares
const checkStatusStudent = require("../middlewares/authMiddleware2");
const checkStatusTutor = require("../middlewares/authMiddleware3");

// middleware to handle CORS request
router.use((req, res, next) => {
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://studyhub-rmr6.onrender.com"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", true);
  next();
});
// middleware to handle frontend on 3001 port
const corsOptions = {
  origin: "https://studyhub-rmr6.onrender.com",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204,
};
router.use(cors(corsOptions));
// Middleware to logging headers
router.use((req, res, next) => {
  const authorizationHeader = req.headers["authorization"];
  if (authorizationHeader) {
    const token = authorizationHeader.split(" ")[1]; // we delete 'bearer'
    jwt.verify(token, "SECRET_KEY", (err, decoded) => {
      if (err) {
        console.log("Token verification error:", err);
      } else {
        console.log("Decoded token:", decoded);
      }
    });
  } else {
    console.log("No Authorization header found");
  }
  next();
});

//  multer configuration to file image proces
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads"); // directory where pictures will be saved
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + extension);
  },
});
const upload = multer({ storage });

/* GET home page. */
router.get("/", (req, res, next) => {
  res.render("index", { title: "Express" });
});

// register endpoint
router.post("/register", (request, response) => {
  // hash the password
  bcrypt
    .hash(request.body.password, 10)
    .then((hashedPassword) => {
      // create a new user instance and collect the data
      const user = new User({
        email: request.body.email,
        password: hashedPassword,
        status: request.body.status,
        image: request.body.image || "noname.png", // Use provided image or default
      });

      // save the new user
      user
        .save()
        // return success if the new user is added to the database successfully
        .then((result) => {
          response.status(201).send({
            message: "User Created Successfully",
            result,
          });
        })
        // catch error if the new user wasn't added successfully to the database
        .catch((error) => {
          response.status(500).send({
            message: "Error creating user",
            error,
          });
        });
    })
    // catch error if the password hash isn't successful
    .catch((e) => {
      response.status(500).send({
        message: "Password was not hashed successfully",
        e,
      });
    });
});

// login endpoint
router.post("/login", (request, response) => {
  // check if email exists
  User.findOne({ email: request.body.email })

    // if email exists
    .then((user) => {
      // compare the password entered and the hashed password found
      bcrypt
        .compare(request.body.password, user.password)

        // if the passwords match
        .then((passwordCheck) => {
          // check if password matches
          if (!passwordCheck) {
            return response.status(400).send({
              message: "Passwords does not match",
              error,
            });
          }

          //   create JWT token
          const token = jwt.sign(
            {
              userId: user._id,
              userEmail: user.email,
              status: user.status, // dodane*
            },
            "SECRET_KEY",
            { expiresIn: "24h" }
          );

          //   return success response
          response.status(200).send({
            message: "Login Successful",
            email: user.email,
            status: user.status, // dodane*
            token,
          });
        })
        // catch error if password does not match
        .catch((error) => {
          response.status(400).send({
            message: "Passwords does not match",
            error,
          });
        });
    })
    // catch error if email does not exist
    .catch((e) => {
      response.status(404).send({
        message: "Email not found",
        e,
      });
    });
});
// Endpoint do aktualizacji profilu użytkownika
router.put(
  "/update-profile/:userId",
  upload.single("image"),
  async (req, res) => {
    const userId = req.params.userId;
    const user = await User.findById(userId);
    // Check if the image was updated
    const imageUpdated = req.file !== undefined;

    // If the user has an image and it was updated, delete the previous image
    if (user.image && imageUpdated && user.image !== "noname.png") {
      const previousImagePath = path.join(__dirname, "../uploads", user.image);
      if (fs.existsSync(previousImagePath)) {
        fs.unlinkSync(previousImagePath);
      }
    }

    // If the user has an image and it was updated, delete the previous image

    const updateData = {
      name: req.body.name,
      lastName: req.body.lastName,
      subject: req.body.subject,
      topic: req.body.topic,
      levelOfEducation: req.body.levelOfEducation,
      localization: req.body.localization,
      priceRange: req.body.priceRange,
      // check if new file img has been send, if yes, update
      image: req.file ? req.file.filename : user.image,
    };
    console.log("updateData: " + updateData);
    try {
      const updatedUser = await User.updateOne(
        { _id: userId },
        { $set: updateData }
      );

      if (updatedUser.nModified === 0) {
        return res
          .status(404)
          .json({ message: "User not found or no modifications needed" });
      }

      return res
        .status(200)
        .json({ message: "User profile updated successfully" });
    } catch (error) {
      console.error("Error updating user profile:", error);
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ message: "Error updating user profile" });
    }
  }
);

// Endpoint to change user's password
router.put("/change-password/:userId", async (req, res) => {
  const userId = req.params.userId;
  const newPassword = req.body.newPassword;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // update password for the user
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    // save the user's update
    await user.save();
    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/tutor/:userId", async (req, res) => {
  const userId = req.params.userId;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const data = {
      name: user.name,
      lastName: user.lastName,
      subject: user.subject,
      topic: user.topic,
      levelOfEducation: user.levelOfEducation,
      localization: user.localization,
      priceRange: user.priceRange,
      image: user.image,
    };
    res.json(data);
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
// access to the endpoint only for students
router.get("/student", checkStatusStudent, (req, res) => {
  res.json({ message: "Student profile" });
});

// endpoint for get the all informations about tutors.
router.get("/tutors", async (req, res) => {
  try {
    // get all tutors who has tutor status
    const tutors = await User.find({ status: "tutor" });

    // return informations about tutors.
    res.status(200).json({
      message: "All tutor information retrieved successfully",
      tutors,
    });
  } catch (error) {
    console.error("Error fetching tutor information:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
// endpoint to return image
router.get("/api/images/:imageName", (req, res) => {
  const imageName = req.params.imageName;
  const imagePath = path.join(__dirname, "../uploads", imageName);

  // return file image as a respond
  res.sendFile(imagePath);
});

// endpoint to DELETE user account
router.delete("/delete-account/:userId", async (req, res) => {
  const userId = req.params.userId;
  try {
    // find user by userId and delete that record from DB
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
router.get("/tutorIn", (req, res) => {
  // Tutaj umieść kod do renderowania strony dla '/tutorIn'
  // res.sendFile(__dirname + '/public/tutorIn.html');
});
module.exports = router;
