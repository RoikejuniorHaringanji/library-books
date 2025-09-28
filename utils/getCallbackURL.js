function getCallbackURL() {
  if (process.env.GITHUB_CALLBACK_URL) return process.env.GITHUB_CALLBACK_URL;
  const port = process.env.PORT || 3000;
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    const host = process.env.HOSTNAME || 'cse340-two.onrender.com';
    return `https://${host}/auth/github/callback`;
  }
  return `http://localhost:${port}/auth/github/callback`;
}

module.exports = { getCallbackURL };