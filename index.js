const PORT = process.env.PROD_PORT || 3000;
import express, { urlencoded } from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import sql from "mysql2";
import session from "express-session";
import bodyParser from "body-parser";
import { v4 } from "uuid";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import helmet from "helmet";
import morgan from "morgan";
// import { storeReturnTo } from "./middleware";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
const db = sql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "rummy",
  waitForConnections: true,
});
const sessionConfig = {
  secret: process.env.SECRET || "idkthesecret",
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
};

app.use(session(sessionConfig));
app.use(urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("<h1>Server Running</h1>");
});

app.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(password, salt);
    const query =
      "INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)";
    db.query(query, [email, passwordHash, name, "user"], (err, result) => {
      if (err) {
        throw err;
      }
      const userId = result.insertId;
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const day = currentDate.getDate();
      const hours = currentDate.getHours();
      const minutes = currentDate.getMinutes();
      const seconds = currentDate.getSeconds();
      const date = `${year}-${month}-${day}`;
      const time = `${hours}:${minutes}:${seconds}`;

      const insertActiveUserQuery =
        "INSERT INTO activeusers (user_id, isActive, last_active_date, last_active_time) VALUES (?, ?, ?, ?)";
      db.query(
        insertActiveUserQuery,
        [userId, true, date, time],
        (err, result) => {
          if (err) {
            throw err;
          }

          const token = jwt.sign(
            {
              id: userId,
              email,
              name,
            },
            "secretstring",
            {
              expiresIn: "10000h",
            }
          );
          res.status(201).json({ token });
        }
      );
    });
  } catch (err) {
    res.status(500).json({ err });
  }
});

app.post("/login", (req, res) => {
  try {
    const { email, password } = req.body;
    const query = "SELECT * FROM users WHERE email = ?";
    db.query(query, [email], async (err, result) => {
      if (err) {
        throw err;
      }
      if (result.length > 0) {
        const firstUser = result[0];
        const isMatch = await bcrypt.compare(password, firstUser.password);
        if (isMatch) {
          const currentDate = new Date();
          const year = currentDate.getFullYear();
          const month = currentDate.getMonth() + 1;
          const day = currentDate.getDate();
          const hours = currentDate.getHours();
          const minutes = currentDate.getMinutes();
          const seconds = currentDate.getSeconds();
          const date = `${year}-${month}-${day}`;
          const time = `${hours}:${minutes}:${seconds}`;
          const updateQuery =
            "UPDATE activeusers SET last_active_date = ?, last_active_time = ? WHERE user_id = ?";
          db.query(
            updateQuery,
            [date, time, firstUser.user_id],
            (err, updateResult) => {
              if (err) {
                throw err;
              }

              const token = jwt.sign(
                {
                  id: firstUser.id,
                  email: firstUser.email,
                  name: firstUser.name,
                },
                "secretstring",
                {
                  expiresIn: "10000h",
                }
              );
              res.status(200).json({ token });
            }
          );
        } else {
          res.status(400).json({ msg: "Invalid credentials." });
        }
      } else {
        res.status(400).json({ msg: "User does not exist." });
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Internal server error." });
  }
});

// Socket.io wala part
io.on("connection", (socket) => {
  console.log("user joined!!!");

  socket.on("btnClicked", (data) => {
    console.log("data emitted :", data);
  });
  socket.on("disconnect", () => {
    console.log("a user disconnected");
  });
});

server.listen(PORT, () => {
  console.log(`Connected to server Port ${PORT} !!!`);
});
