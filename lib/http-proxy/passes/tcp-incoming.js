var http   = require('http'),
    https  = require('https'),
    net  = require('net'),
    tls  = require('tls'),
	proxyProtocol = require('proxy-protocol-v2'),
    common = require('../common'),
    passes = exports;

/*!
 * Array of passes.
 *
 * A `pass` is just a function that is executed on `req, socket, options`
 * so that you can easily add new checks while still keeping the base
 * flexible.
 */

/*
 * Websockets Passes
 *
 */

var passes = exports;

[
  /**
   * WebSocket requests must have the `GET` method and
   * the `upgrade:websocket` header
   *
   * @param {ClientRequest} Req Request object
   * @param {Socket} Websocket
   *
   * @api private
   */

  function checkMethodAndHeader (req, socket) {
    if (req.method !== 'GET' || !req.headers.upgrade) {
      socket.destroy();
      return true;
    }

    if (req.headers.upgrade.toLowerCase() !== 'websocket') {
      socket.destroy();
      return true;
    }
  },

  /**
   * Does the actual proxying.
   *
   * @param {ClientRequest} Req Request object
   * @param {Socket} Websocket
   * @param {Object} Options Config object passed to the proxy
   *
   * @api private
   */
  function stream(req, socket, options, head, server, clb) {

    common.setupSocket(socket);

    if (head && head.length) socket.unshift(head);

    var proxySocket,
        connectEvent,
        headers = req.headers,
        socketOptions = common.setupOutgoing(options.ssl || {}, options);

    if(common.isSSL.test(options.target.protocol)) {
        proxySocket = tls.connect(socketOptions);
        connectEvent = 'secureConnect';
    } else {
        proxySocket = new net.Socket();
        proxySocket.connect(socketOptions.port, socketOptions.host);
        connectEvent = 'connect';
    }

    proxySocket.on(connectEvent, function() {
      proxySocket.on('error', onOutgoingError);

      // Allow us to listen when the websocket has completed
      proxySocket.on('end', function () {
        server.emit('close', null, proxySocket);
      });

      // The pipe below will end proxySocket if socket closes cleanly, but not
      // if it errors (eg, vanishes from the net and starts returning
      // EHOSTUNREACH). We need to do that explicitly.
      socket.on('error', function () {
        proxySocket.end();
      });

      common.setupSocket(proxySocket);

      if(options.proxyProtocol) {
		if(options.proxyProtocol == 'v1')
		  proxySocket.write(proxyProtocol.v1_encode(socket));
		else
		  proxySocket.write(proxyProtocol.v2_encode(socket));
      }

      var headerLines = [[req.method, req.url, 'HTTP/' + req.httpVersion].join(' ')];
      Object.keys(headers).forEach(function(i) {
        headerLines.push(i + ": " + headers[i]);
      });

      proxySocket.write(headerLines.join('\r\n') + '\r\n\r\n');

      proxySocket.pipe(socket).pipe(proxySocket);

      server.emit('open', proxySocket);
      server.emit('proxySocket', proxySocket);  //DEPRECATED.
    });

    return false;

    function onOutgoingError(err) {
      if (clb) {
        clb(err, req, socket);
      } else {
        server.emit('error', err, req, socket);
      }
      socket.end();
    }
  }

] // <--
  .forEach(function(func) {
    passes[func.name] = func;
  });
