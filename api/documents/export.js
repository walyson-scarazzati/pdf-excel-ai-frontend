const { proxyToPath } = require('../lib/proxy');

module.exports = async function exportFile(req, res) {
  return proxyToPath(req, res, 'documents/export');
};
