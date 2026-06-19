module.exports = async function (req, res) {
  try {
    const requestHandler = require('../server/index');
    await requestHandler(req, res);
  } catch (error) {
    console.error('API handler failed:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'Internal server error' }));
  }
};
