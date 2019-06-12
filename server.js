const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

let config = require('./config');
let middleware = require('./middleware');

let User = require('./models/user.model');

const app = express();
const PORT = 4000;
const API = 'api';
const VERSION = 1;

app.use(cors());
app.use(require('cookie-parser')());
app.use(bodyParser.json());

mongoose.connect('mongodb://127.0.0.1:27017/DB_NAME', {
  useNewUrlParser: true
});

const connection = mongoose.connection;

connection.once('open', function() {
  console.log('MongoDB database connection established successfully');
});

const routes = express.Router();

function createToken(userId) {
  return jwt.sign({ userId }, config.secret, { expiresIn: '24h' });
}

routes.route('/signup').post(async function(req, res) {
  const newUser = new User(req.body);

  await newUser.save(function(err, savedUser) {
    if (err) {
      throw err;
    }
    res.json({
      success: true,
      message: 'User created and logged in',
      token: createToken(savedUser._id)
    });
  });
});

routes.route('/login').post(function(req, res) {
  const { email, password } = req.body;
  User.findOne({ email }, function(err, user) {
    if (err) {
      throw err;
    }

    if (user) {
      user.comparePassword(password, function(error, isMatch) {
        if (error) {
          throw error;
        }

        if (isMatch) {
          res.json({
            success: true,
            message: 'Authentication successful',
            token: createToken(user._id)
          });
        } else {
          res.status(400).json({ success: false, message: 'Authentication failed' });
        }
      });
    } else {
      res.status(400).json({ success: false, message: 'Authentication failed' });
    }
  });
});

routes.route('/me').get(middleware.checkToken, function(req, res) {
  const { userId } = req.decoded;
  User.findById(userId, '-password', function(err, user) {
    if (err) {
      throw err;
    }

    if (user) {
      res.json(user);
    } else {
      res.status(500).json({ success: false, message: 'User cannot be found' });
    }
  });
});

app.use(`/${API}/${VERSION}`, routes);

app.listen(PORT, function() {
  console.log(`Server is running on Port: ${PORT}`);
});
