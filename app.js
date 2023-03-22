const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const nodemailer = require('nodemailer');
const uuid = require('uuid');
const jwt = require("jsonwebtoken");
const dbPath = path.join(__dirname, "logindb.db");

const cors = require("cors");
const bp = require("body-parser");

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: "*",
  })
);

app.use(
  cors({
    methods: ["GET", "POST", "DELETE", "UPDATE", "PUT", "PATCH"],
  })
);

app.use(bp.json());
app.use(bp.urlencoded({ extended: true }));

app.use(express.json());

let db = null;

const port = process.env.PORT || 3004;

const initializeDBAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(port, () => {
      console.log(`Server Running at http://localhost:${port}/`);
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(-1);
  }
};
initializeDBAndServer();


//User Register API
app.post("/users/", cors(), async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `select * from user where username="${username}";`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    if (password.length >= 5) {
      const createUserQuery = `insert into user(username,name,password,gender,location) values(
          "${username}","${name}","${hashedPassword}","${gender}","${location}"
      );`;
      await db.run(createUserQuery);
      response.status(200);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
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
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid Password");
    }
  }
});

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const checkUser = `select * from user where username="${username}";`;
  const dbUser = await db.get(checkUser);
  if (dbUser !== undefined) {
    const isValidPassword = await bcrypt.compare(oldPassword, dbUser.password);
    if (isValidPassword) {
      if (newPassword.length > 5) {
        const hashedPassword = await bcrypt.hash(request.body.newPassword, 10);
        const updatePassword = `update user set password="${hashedPassword}" where username="${username}";`;
        await db.run(updatePassword);
        response.status(200);
        response.send("Password updated");
      } else {
        response.status(400);
        response.send("Password is too short");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  } else {
    response.status(400);
    response.send(`Invalid user`);
  }
});

app.post('/forgot_password', async (request, response) => {
  const { email,user } = request.body;
  let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com", 
    port: 465,
    secure: true, 
    auth: {
      user: 'sriramloginapi@gmail.com', 
      pass: "txdolgjsmjuinrmu",
    },
  });
  const mailOptions = {
    from: 'sriramloginapi@gmail.com',
    to: email,
    subject: 'Hello from Node.js',
    text: 'This is a test email sent from Node.js'
  };
  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + email);
      response.send(`Invalid user`);
    }
  });
});

let savedOTPS = {};
app.post("/register/", cors(), async (request, response) => {
  const { email,username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  Otp=Math.round(Math.random()*10000)
  const selectUserQuery = `select * from user where username="${username}";`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    if (password.length >= 5) {
      const createUserQuery = `insert into user(username,name,password,gender,location) values(
          "${username}","${name}","${hashedPassword}","${gender}","${location}"
      );`;
      let transporter = nodemailer.createTransport({
        host: "smtp.gmail.com", 
        port: 465,
        secure: true, 
        auth: {
          user: 'sriramloginapi@gmail.com', 
          pass: "txdolgjsmjuinrmu",
        },
      });
      const mailOptions = {
        from: 'sriramloginapi@gmail.com',
        to: email,
        subject: 'Your Otp to Create Account',
        html: `
    <h1>your otp ${Otp}</h1>
    <p>Thanks For Creating Account</p>
    `,
      };
      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        } else {
          savedOTPS[email] = Otp;
                setTimeout(
                    () => {
                        delete savedOTPS.email
                    }, 60000
                )
          console.log('Email sent: ' + email);
          response.send('Otp sent to ' + email);
        }
      });
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/verify", cors(), async (request, response) => {
  const { email,username, name, password, gender, location,otp } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `select * from user where username="${username}";`;
  const dbUser = await db.get(selectUserQuery);
  console.log(savedOTPS)
  if (savedOTPS[email] == otp) {
      const createUserQuery = `insert into user(username,name,password,gender,location) values(
          "${username}","${name}","${hashedPassword}","${gender}","${location}"
      );`;
      await db.run(createUserQuery);
      response.status(200);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Please Enter correct Otp");
    }
  
});

module.exports = app;






