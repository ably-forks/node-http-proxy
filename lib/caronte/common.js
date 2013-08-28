var common = exports;

/**
 * Copies the right headers from `options` and `req` to 
 * `outgoing` which is then used to fire the proxied 
 * request.
 *
 * Examples:
 *
 *    common.setupOutgoing(outgoing, options, req)
 *    // => { host: ..., hostname: ...}
 *
 * @param {Object} Outgoing Base object to be filled with required properties
 * @param {Object} Options Config object passed to the proxy
 * @param {ClientRequest} Req Request Object
 * 
 * @return {Object} Outgoing Object with all required properties set
 *
 * @api private
 */

common.setupOutgoing = function(outgoing, options, req) {
  ['host', 'hostname', 'port', 'socketPath'/*, 'agent'*/].forEach(
    function(e) { outgoing[e] = options.target[e]; }
  );

  ['method', 'path', 'headers'].forEach(
    function(e) { outgoing[e] = req[e]; }
  );

  return outgoing;
};