
var coap = require("coap")
  , request = require("superagent")
  , total = 5000
  , print = function(text) {
              process.stdout.write(text + "\n");
            }
  , receivers = 0
  , start = null
  , handler = function(packet) {
                var time = Date.now() - start;
                connected--;
                print((total - connected) + "," + time);
                this.close();
              }
  , connected = 0 
  , publish = function() {
                  var req;
                  connected++;
                  if (connected === total) {
                    //print("publishing");
                    console.error("all client connected, sending the message");
                    start = Date.now();
                    request
                        .put('http://localhost:3000/topics/hello')
                        .send("world")
                        .end(function(error, res){
                          console.error("done");
                        });
                  }
                }
  , i = 0
  , created = function(res) {
                res.once('data', function() {
                  // the first one is the current one
                  res.once('data', handler)
                })
                publish()
                next()
              }
  , next = function() {
             var current = receivers

             if (receivers++ < total) {

               var req = coap.request({ 
                 pathname: "/topics/hello",
                 observe: true
               }).end();

               req.on('response', created)

               req.on('error', function(err) {
                  receivers--;
                  console.error(err);
                  setTimeout(next, 1000);
                  return;
               });
             }
           };

coap.request({
  method: "PUT",
  pathname: "/topics/hello"
}).end("done").on("response", function() {
  next();
})
