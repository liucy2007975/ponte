
var coap = require('coap');
var topicsRegexp = /^\/topics\/(.+)$/;
var callback = require("callback-stream");

function CoAP(opts, done) {
  if (!(this instanceof CoAP)) {
    return new CoAP(opts, done);
  }

  if (typeof opts === "function") {
    cb = opts;
    opts = {};
  }

  var that = this;

  this._persistence = opts.ponte.persistence;
  this._broker = opts.ponte.broker;

  this.server = coap.createServer(function handler(req, res) {
    var match = req.url.match(topicsRegexp)
    var topic
    var cb = function(topic, payload) {
      res.write(payload);
    }
    var deliver = 'end'
    if (match) {
      topic = match[1];
      if (req.method === 'GET') {
        if (req.headers['Observe'] === 0) {
          deliver = 'write'
          that._broker.subscribe(topic, cb);
          res.on('finish', function() {
            that._broker.unsubscribe(topic, cb);
          });
        }

        that._persistence.lookupRetained(topic, function(err, packets) {
          if (packets.length === 0) {
            res.statusCode = '4.04'
            res[deliver]();
          } else {
            res[deliver](packets[0].payload);
          }
        });
      } else if (req.method === 'PUT') {
        req.pipe(callback(function(err, payload) {
          payload = payload.toString();
          var packet = { topic: topic, payload: payload, retain: true };
          that._persistence.storeRetained(packet, function() {
            opts.ponte.broker.publish(topic, payload, function() {
              res.setOption('Location-Path', '/topics/' + topic)
              res.statusCode = 204
              res.end();
            });
          });
        }));
      }
    }
  });

  this.server.listen(opts.port, function(err) {
    done(err, that)
    opts.ponte.logger.info({ service: "CoAP", port: opts.port }, "server started");
  });
}

CoAP.prototype.close = function(done) {
  this.server.close(done);
};

module.exports = CoAP