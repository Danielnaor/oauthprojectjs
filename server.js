const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const { Pool } = require('pg');

const app = express();
app.use(bodyParser.json());

// Database connection configuration
const pool = new Pool({
  connectionString: 'postgres://Danielnaor:D6reVYcpM8GN@ep-snowy-art-761695-pooler.us-east-2.aws.neon.tech/usersDatabase?sslmode=require',
});


pool.connect()
  .then(() => {
    console.log('Connected to the database successfully');
  })
  .catch((error) => {
    console.error('Failed to connect to the database:', error);
  });


// Route for "/"
app.get('/', (req, res) => {
  const html = `
    <html>
      <head>
        <style>
          body {
            background-color: black;
            color: white;
            font-family: monospace;
            font-size: 13px;
            margin: 0;
            padding: 0;
            display: flex;
            align-items: flex-start;
            justify-content: flex-start;
            min-height: 100vh;
          }
          pre {
            margin: 0;
            padding: 0;
          }
          code {
            white-space: pre-wrap;
            display: block;
            margin: 0;
            padding: 0;
          }
        </style>
      </head>
      <body>
        <pre>
          <code>"message": "Welcome to Express API"</code>
        </pre>
      </body>
    </html>
  `;

  return res.status(200).send(html);
});

// Route for "/token"
app.post('/token', async (req, res) => {
    const requestBody = req.body;
    
    if (requestBody.code) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
  
        // Check if the authorization code exists in the database
        const { rows } = await client.query('SELECT code FROM authorization_codes WHERE code = $1', [requestBody.code]);
  
        if (rows.length === 1) {
          // Generate a unique access token
          const accessToken = crypto.randomBytes(16).toString('hex');
  
          // Store the access token in the database
          await client.query('INSERT INTO access_tokens (token) VALUES ($1)', [accessToken]);
  
          await client.query('COMMIT');
  
          // Send the access token as the response
          const response = {
            access_token: accessToken,
            token_type: 'Bearer',
            expires_in: 3600
          };

          // Delete the authorization code from the database
            await client.query('DELETE FROM authorization_codes WHERE code = $1', [requestBody.code]);


          return res.status(200).json(response);
        } else {
          // Invalid authorization code
          return res.status(400).json({ error: 'Invalid code' });
        }
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } else {
      return res.status(400).json({ error: 'Authorization code is missing' });
    }
  });
  

// Route for "/authorize"
app.get('/authorize', async (req, res) => {
    const client_id = req.query.client_id;
    const code = crypto.randomBytes(16).toString('hex');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
  
      // Check if the client_id exists in the users table
      const { rows } = await client.query('SELECT id FROM users WHERE client_id = $1', [client_id]);
  
      if (rows.length === 1) {
        // Insert the authorization code with the associated client_id
        await client.query('INSERT INTO authorization_codes (code, client_id) VALUES ($1, $2)', [code, client_id]);
      } else {
        // Invalid client_id
        return res.status(400).json({ error: 'Invalid client_id' });
      }
  
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  
    const redirectUri = req.query.redirect_uri;
    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.append('code', code);
  
    return res.redirect(redirectUrl.toString());
  });
  

// Route for "/hello-world"
app.get('/hello-world', (req, res) => {
  return res.status(200).send('Hi!');
});

// Start the server
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

app.get('/callback', (req, res) => {
    const code = req.query.code;
    console.log('Authorization Code:', code);
  
   
  
    res.send('Authorization code received successfully!');
  });
  

// test the /authorize route


/*
-- Create the users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  client_id VARCHAR(255) NOT NULL
);

-- Create the authorization_codes table
CREATE TABLE authorization_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(255) NOT NULL,
  client_id VARCHAR(255) NOT NULL
);

-- Create the access_tokens table
CREATE TABLE access_tokens (
  id SERIAL PRIMARY KEY,
  token VARCHAR(255) NOT NULL,
  user_id INT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);


*/