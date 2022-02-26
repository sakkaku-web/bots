var { TwitterApi } = require('twitter-api-v2');
var dotenv = require('dotenv');
var express = require('express');
var app = express();
var sessions = require('express-session');
var cookieParser = require("cookie-parser");

dotenv.config();

app.use(sessions({
  secret: 'supersecretsession',
  saveUninitialized: true,
  cookie: { maxAge: 1000 * 60 },
  resave: false
}));

app.get('/', async (req, res) => {
  const client = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
  });

  const { url, oauth_token_secret } = await client.generateAuthLink('http://localhost:8080/callback');
  req.session.oauth_token_secret = oauth_token_secret;
  res.redirect(url);
})

app.get('/callback', async (req, res) => {
  // Exact tokens from query string
  const { oauth_token, oauth_verifier } = req.query;
  // Get the saved oauth_token_secret from session
  const { oauth_token_secret } = req.session;

  if (!oauth_token || !oauth_verifier || !oauth_token_secret) {
    return res.status(400).send('You denied the app or your session expired!');
  }

  // Obtain the persistent tokens
  // Create a client from temporary tokens
  const client = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
    accessToken: oauth_token,
    accessSecret: oauth_token_secret,
  });

  const { accessSecret, accessToken } = await client.login(oauth_verifier)

  res.send(JSON.stringify({ accessSecret, accessToken }));
});

var server = app.listen(8080, function () {
  var host = server.address().address
  var port = server.address().port

  console.log("Example app listening at http://%s:%s", host, port)
})
