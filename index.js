const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const dbPath = path.join(__dirname, "goodreads.db");
const app = express();

app.use(express.json());

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(-1);
  }
};
initializeDBAndServer();

//Get Books API
app.get("/books/", authToken, async (request, response) => {
  const getBooksQuery = `
            SELECT
              *
            FROM
             book
            ORDER BY
             book_id;`;
  const booksArray = await db.all(getBooksQuery);
  response.send(booksArray);

  //     let jwtToken;
  //   const authHeader = request.headers["authorization"];
  //   if (authHeader !== undefined) {
  //     jwtToken = authHeader.split(" ")[1];
  //   }
  //   if (jwtToken === undefined) {
  //     response.status(401);
  //     response.send("Invalid Access Token");
  //   } else {
  //     jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
  //       if (error) {
  //         response.send("Invalid Access Token");
  //       } else {
  //         const getBooksQuery = `
  //             SELECT
  //               *
  //             FROM
  //              book
  //             ORDER BY
  //              book_id;`;
  //         const booksArray = await db.all(getBooksQuery);
  //         response.send(booksArray);
  //       }
  //     });
  //   }
});

//Get Book API
app.get("/books/:bookId/", authToken, async (request, response) => {
  const { bookId } = request.params;
  const getBookQuery = `
      SELECT
       *
      FROM
       book 
      WHERE
       book_id = ${bookId};
    `;
  const book = await db.get(getBookQuery);
  response.status(200).send(book);
  //   const authHeader = request.headers["authorization"];
  //   let token;
  //   if (authHeader) {
  //     token = authHeader.split(" ")[1];
  //   }
  //   console.log(token);
  //   if (token) {
  //     try {
  //       jwt.verify(token, "MY_SECRET_TOKEN");
  //   const getBookQuery = `
  //   SELECT
  //    *
  //   FROM
  //    book
  //   WHERE
  //    book_id = ${bookId};
  // `;
  //   const book = await db.get(getBookQuery);
  //   response.status(200).send(book);
  //     } catch (err) {
  //       response.status(401).send("Unauthorized Access");
  //     }
  //   } else {
  //     response.status(401).send("Invalid Token");
  //   }
});

//User Register API
app.post("/users/", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(request.body.password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    const createUserQuery = `
      INSERT INTO 
        user (username, name, password, gender, location) 
      VALUES 
        (
          '${username}', 
          '${name}',
          '${hashedPassword}', 
          '${gender}',
          '${location}'
        )`;
    await db.run(createUserQuery);
    response.send(`User created successfully`);
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

//User Login API
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      console.log(jwtToken);
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid Password");
    }
  }
});

function authToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  let token;
  if (authHeader) {
    token = authHeader.split(" ")[1];
  }
  if (token) {
    try {
      const response = jwt.verify(token, "MY_SECRET_TOKEN");
      req.username = response.username;
      next();
    } catch (error) {
      res.status(401).send("Invalid Access");
    }
  } else {
    res.status(401).send("Unauthorized Access");
  }
}

app.get("/users/profile", authToken, async (req, res) => {
  const { username } = req;
  console.log(username);
  const getUserQuery = `SELECT * FROM user WHERE username ="${username}";`;
  const dbUser = await db.get(getUserQuery);
  res.send(dbUser);
});
