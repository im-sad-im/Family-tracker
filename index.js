import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

//Connect to PostgreSQL database
const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "malisadim123",
  port: 5432,
});
db.connect();

//Middleware for handling URL-encoded data and static files
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

let users = [
  { id: 1, name: "Angela", color: "teal" },
  { id: 2, name: "Jack", color: "powderblue" },
];

//Fn to check visited countries for the current user
async function checkVisisted() {
  const result = await db.query(
    "SELECT country_code FROM visited_countries JOIN users ON users.id = visited_countries.user_id WHERE user_id = $1;",
    [currentUserId]
  );
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

//Fn to get the current user from the database
async function getCurrentUser() {
  const result = await db.query("SELECT * FROM users");
  users = result.rows; //Update array of users by retreiving from db
  return users.find((user) => user.id == currentUserId);
}


//Route for the home page
app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  const currentUser = await getCurrentUser();

  // console.log(currentUser)
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.color,
  });
});

//Route to handle adding visited countries
app.post("/add", async (req, res) => {
  const input = req.body["country"];

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2);",
        [countryCode, currentUserId]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});

//Route to switch between users
app.post("/user", async (req, res) => {
  if (req.body.add == "new") {
    res.render("new.ejs");
  } else {
    const userId = req.body.user;
    currentUserId = userId;
    // console.log(currentUserId);
    res.redirect("/");
  }
});

//Route to add new users
app.post("/new", async (req, res) => {
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html
  const userName = req.body["name"];
  const color = req.body["color"];
  console.log(userName + " " + color);
  try {
    const result = await db.query(
      "INSERT INTO users (name, color) VALUES ($1, $2) RETURNING *;",
      [userName, color]
    );
    const id = result.rows[0].id;
    currentUserId = id;

    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});

//Start the server on port 
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
