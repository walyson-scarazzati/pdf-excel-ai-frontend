const { proxyToPath } = require('./lib/proxy');

module.exports = async function health(req, res) {
  return proxyToPath(req, res, 'health');
};
