// authMiddleware.js

const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization.split(" ")[1]; // Pobierz token z nagłówka

  jwt.verify(token, "SECRET_KEY", (err, decodedToken) => {
    if (err) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userStatus = decodedToken.status; // Pobierz status (rolę) użytkownika z tokena

    // Sprawdź, czy użytkownik ma odpowiedni status dla tego endpointu
    if (userStatus === "tutor") {
      next(); // Użytkownik z odpowiednim statusem - przejdź do następnego middleware lub obsługi endpointu
    } else {
      return res.status(403).json({ message: "Access denied" }); // Użytkownik nie ma odpowiedniego statusu
    }
  });
};

module.exports = authMiddleware;
