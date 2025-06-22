// server.js
// where your node app starts

// init project
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const app = express();
const fs = require("fs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

// we've started you off with Express,
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static("public"));

// init sqlite db

function DatabaseAPI() {
  const dbFile = ".data/sqlite.db";
  const sqlite3 = require("sqlite3").verbose();
  const DB = new sqlite3.Database(dbFile, function (err) {
    if (err) {
      console.log(err);
      return;
    }
    DB.exec("PRAGMA foreign_keys = ON;", function (error) {
      if (error) {
        console.error("Pragma statement didn't work.");
      } else {
        console.log("Foreign Key Enforcement is on.");
      }
    });
  });
  var dbSchema = `CREATE TABLE IF NOT EXISTS Games (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT, small INTEGER default 0, create_time INTEGER);

  CREATE TABLE IF NOT EXISTS Numbers (id INTEGER PRIMARY KEY AUTOINCREMENT, game INTEGER, number INTEGER, CONSTRAINT fk_game FOREIGN KEY(game) REFERENCES Games(id) ON DELETE CASCADE);`;

  DB.exec(dbSchema, function (err) {
    if (err) {
      console.log(err);
    }
  });
  return DB;
}

const db = DatabaseAPI();

app.get("/", (request, response) => {
  db.run(
    "DELETE FROM Games WHERE create_time < STRFTIME('%s', 'now', '-30 days')"
  );
  response.sendFile(__dirname + "/views/index.html");
});

app.post("/hostGame", (request, response) => {
  let code = randomCode();
  let small = request.body.short === "yes";
  console.log(small);
  db.run(
    `INSERT INTO Games (code, create_time, small) VALUES (?, STRFTIME('%s', 'now'), ?);`,
    [code, small],
    (error) => {
      if (error) {
        console.log(error);
        response.send({ message: "error!" });
      } else {
        response.cookie("gameHost", true, {
          maxAge: 900000000,
          httpOnly: false,
        });
        response.cookie("gameCode", code, {
          maxAge: 900000000,
          httpOnly: false,
        });
        response.clearCookie("currentNumber");
        response.sendFile(__dirname + "/views/host.html");
      }
    }
  );
});

app.post("/joinGame", (request, response) => {
  db.get(
    `SELECT id FROM Games WHERE code = UPPER(?);`,
    [request.body.gameCode],
    (err, row) => {
      if (err) {
        response.send({ message: "error!" });
      } else {
        if (row) {
          response.cookie("gameCode", request.body.gameCode, {
            maxAge: 900000000,
            httpOnly: false,
          });
          response.cookie("gameHost", false, {
            maxAge: 900000000,
            httpOnly: false,
          });
          response.sendFile(__dirname + "/views/player.html");
        } else {
          response.redirect("/");
        }
      }
    }
  );
});

app.get("/genNextNumber", (request, response) => {
  db.get(
    `SELECT id, small FROM Games WHERE code = UPPER(?);`,
    [request.cookies.gameCode],
    (err, row) => {
      if (err) {
        response.send({ message: "error!" });
      } else {
        let num;
        let min = 0;
        let max = 75;
        if (row.small === 1) {
          min = 16;
          max = 60;
        }
        if (request.cookies.gameHost) {
          db.all(
            `SELECT * FROM Numbers WHERE game = ?`,
            [row.id],
            (err, rows) => {
              if (err) {
                console.log(err);
              } else {
                let num = getRangeInt(min, max) + 1;
                rows = rows.map((x) => x.number);
                if (rows.length === max - min) {
                  num = "Game Over!";
                } else {
                  while (rows.includes(num)) {
                    num = getRangeInt(min, max) + 1;
                  }
                  db.run(
                    `INSERT INTO Numbers (game, number) VALUES (?, ?)`,
                    [row.id, num]
                  );
                  num = bingoify(num);
                }
                response.cookie("currentNumber", num, {
                  maxAge: 900000000,
                  httpOnly: false,
                });
                response.sendFile(__dirname + "/views/host.html");
              }
            }
          );
        }
      }
    }
  );
});

app.get("/clearGame", (request, response) => {
  db.get(
    `SELECT id FROM Games WHERE code = UPPER(?);`,
    [request.cookies.gameCode],
    (err, row) => {
      if (err) {
        response.send({ message: "error!" });
      } else {
        let num;
        if (request.cookies.gameHost) {
          db.run(
            `DELETE FROM Numbers WHERE game = ?`,
            [row.id],
            (err, rows) => {
              if (err) {
                console.log(err);
              } else {
                response.clearCookie("currentNumber");
                response.sendFile(__dirname + "/views/host.html");
              }
            }
          );
        }
      }
    }
  );
});

app.get("/getNextNumber", (request, response) => {
  db.get(
    `SELECT id FROM Games WHERE code = UPPER(?);`,
    [request.cookies.gameCode],
    (err, row) => {
      if (err) {
        response.send({ message: "error!" });
      } else {
        let game = row.id;
        return db.get(
          `SELECT * FROM Numbers WHERE game = ? ORDER BY id DESC;`,
          [game],
          (err, row) => {
            if (err) {
              throw err;
            } else {
              console.log(row);
              let num = row ? bingoify(row.number) : "Please Wait";
              response.send({ number: num });
            }
          }
        );
      }
    }
  );
});

const bingoify = function (num) {
  if (num <= 15) return "B" + num;
  if (num <= 30) return "I" + num;
  if (num <= 45) return "N" + num;
  if (num <= 60) return "G" + num;
  return "O" + num;
};

// helper function that prevents html/css/script malice
const cleanseString = function (string) {
  return string.replace(/</g, "&lt;").replace(/>/g, "&gt;");
};

const consonants = "BCDFGHJKLMNPQRSTVWXZ".split("");
const vowels = "AEIOUY".split("");
const all_letters = consonants.concat(vowels);

const getRandomInt = function (max) {
  return Math.floor(Math.random() * Math.floor(max));
};

const getRangeInt = function (min, max) {
  // range between [min, max)
  return getRandomInt(max - min) + min;
};

const randomCode = function () {
  let code = all_letters[getRandomInt(all_letters.length)];
  code += consonants[getRandomInt(consonants.length)];
  code += all_letters[getRandomInt(all_letters.length)];
  code += consonants[getRandomInt(consonants.length)];
  code += all_letters[getRandomInt(all_letters.length)];
  return code;
};

// listen for requests :)
var listener = app.listen(process.env.PORT, () => {
  console.log(`Your app is listening on port ${listener.address().port}`);
});
