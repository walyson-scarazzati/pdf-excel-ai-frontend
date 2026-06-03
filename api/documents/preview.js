const { proxyToPath } = require('../lib/proxy');

module.exports = async function preview(req, res) {
  return proxyToPath(req, res, 'documents/preview');
};
