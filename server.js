const express = require('express');
require('dotenv').config();
const bodyParser = require('body-parser');
const { initDb } = require('./data/database');
const passport = require('passport');
const session = require('express-session');
const GitHubStrategy = require('passport-github2').Strategy;
const cors = require('cors');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');
const path = require('path');
const dns = require('dns');
const { getCallbackURL } = require('./utils/getCallbackURL');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-here',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// Passport GitHub Strategy
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: getCallbackURL()
},
function(accessToken, refreshToken, profile, done) {
  console.log('✅ GitHub OAuth successful for user:', profile.username);
  return done(null, profile);
}
));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Routes
app.use('/', require('./routes/index.js'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error occurred:', err);
  
  // For GitHub OAuth errors, redirect to home with error
  if (req.originalUrl.startsWith('/auth/github')) {
    return res.redirect('/?error=internal_error');
  }
  
  // For all other errors, render a simple HTML error page
  res.status(500).send(`
    <h1>Internal Server Error</h1>
    <p style="color:red;">${err.message || 'Something went wrong.'}</p>
    <a href="/">Go back to Home</a>
  `);
});

// Connect to database and start server
initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`✅ Database connected. Server running on port ${port}`);
      console.log(`📝 API Documentation available at: http://localhost:${port}/api-docs`);
      console.log(`🔐 GitHub OAuth callback URL: ${getCallbackURL()}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch(err => {
    console.error('❌ Failed to connect to database:', err);
    process.exit(1);
  });

// --- replaced swagger setup: prefer static swagger.json bundled with project ---
let swaggerSpec;
try {
  const swaggerPath = path.join(__dirname, 'swagger.json');
  if (fs.existsSync(swaggerPath)) {
    const raw = fs.readFileSync(swaggerPath, 'utf8');
    swaggerSpec = JSON.parse(raw);

    // If Swagger 2.0, set host/schemes to local server so "Try it out" hits your running API
    if (swaggerSpec.swagger === '2.0') {
      swaggerSpec.host = `localhost:${port}`;
      swaggerSpec.schemes = ['http'];
      swaggerSpec.basePath = swaggerSpec.basePath || '/';
    } else if (swaggerSpec.openapi && swaggerSpec.openapi.startsWith('3')) {
      // OpenAPI 3: set servers to local
      swaggerSpec.servers = [{ url: `http://localhost:${port}` }];
    }

    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    console.log('✅ Swagger UI serving static swagger.json (adjusted for local server).');
  } else {
    // Minimal fallback spec so UI is available even if swagger.json missing
    swaggerSpec = {
      openapi: '3.0.0',
      info: { title: 'Library Management API (minimal)', version: '1.0.0' },
      servers: [{ url: `http://localhost:${port}` }],
      paths: {
        '/': { get: { summary: 'Root', responses: { '200': { description: 'OK' } } } }
      }
    };
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    console.warn('⚠️ swagger.json not found — serving minimal docs.');
  }
} catch (err) {
  console.error('❌ Failed to load swagger spec:', err);
  app.get('/api-docs', (req, res) => res.status(500).send('Swagger docs unavailable. Check server logs.'));
}
// --- end replaced ---

// Use Cloudflare + Google resolvers as a temporary workaround for local DNS failures
dns.setServers(['1.1.1.1', '8.8.8.8']);
console.log('🔧 Node DNS servers set to: 1.1.1.1, 8.8.8.8 (temporary)');