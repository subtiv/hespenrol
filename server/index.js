// Setup basic express server
var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var glob = require( 'glob' );  
var port = process.env.PORT || 5000;
const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient({
  keyFilename: 'prtct/hespenrolk.json'
});
var fs = require('fs');
var Vector = require("vector").Vector;
var ExifImage = require('exif').ExifImage;


//settings
const IMG_LOC = "/images";
const IMG_S_LOC = "front/public/images/";
var rendersettings = {};


server.listen(port, function() {
  console.log('Server listening at port %d', port);
});

console.log(__dirname);
// Routing
app.use(express.static(path.join(__dirname, 'public')));
app.use(IMG_LOC, express.static(__dirname + 'front/public/images/'));

// Answer API requests.
app.get('/api', function (req, res) {
  res.set('Content-Type', 'application/json');
  res.send('{"message":"Hello from the custom server!"}');
});

// Chatroom

var numUsers = 0;

io.on('connection', function(socket) {
  // // when the client emits 'new message', this listens and executes
  // socket.on('new message', function (data) {
  //   // we tell the client to execute 'new message'
  //   socket.broadcast.emit('new message', {
  //     username: socket.username,
  //     message: data
  //   });
  // });

  //console.log('CONNECTED: ', socket);

  function inform(msg, progress) {
    socket.emit("inform", {
      msg,
      progress
    });
  }

  function reload() {
    var alldata = {
      general: {},
      individual: []
    };
    fs.readdir(IMG_S_LOC, function(err, items) {
      socket.emit("img", items.map(function(item) {
          var rv = IMG_LOC + "/" + item;
          alldata.individual.push({
            image: rv
          });
          return rv
      }))
      inform("original images loaded", 20);

      function getInformation(slctr) {
        return new Promise((oresolve, oreject) => {
          var promises = [];
          items.forEach(function(item) {
            promises.push(new Promise((resolve, reject) => {
              client[slctr](IMG_S_LOC + "/" + item)
                .then(results => {
                  resolve(results);
                })
                .catch(err => {
                  reject(err);
                  console.error('ERROR:', err);
                });
            }));
          });

          Promise.all(promises).then(function(values) {
            oresolve(values)
          });
        })
      }

      var toppromises = [];

      toppromises.push(new Promise((topresolve, topreject) => {
        getInformation("labelDetection")
          .then(results => {

            var labelDescription = {
              name: "label",
              average: [],
              individual: []
            };

            function uniq(a) {
              return Array.from(new Set(a));
            }

            results.forEach(img => {
              var individualabels = img[0].labelAnnotations.filter(label => label.score > rendersettings.minlabel);
              var averagelabels = img[0].labelAnnotations;
              labelDescription.average = labelDescription.average.concat(averagelabels);
              labelDescription.individual.push(individualabels.map(label => label.description));
            })

            var averagelabels = labelDescription.average;
            averagelabels = averagelabels.slice().sort((a, b) => {
              return a.description > b.description;
            })

            for (var i = 0; i < averagelabels.length - 1; i++) {
              if (averagelabels[i + 1] == averagelabels[i]) {
                averagelabels[i].score = 1;
                averagelabels[i].score = 1;
              }
            }
            labelDescription.average = averagelabels.filter(label => label.score > rendersettings.minlabela).map(label => label.description);
            labelDescription.average = uniq(labelDescription.average);

            inform("labels parsed", 60);
            topresolve(labelDescription);
          }).catch(err => {
            topreject(err);
          })
      }))

      toppromises.push(new Promise((topresolve, topreject) => {
        getInformation("imageProperties")
          .then(results => {
            var colorResult = {
              name: "color",
              average: [],
              individual: []
            };

            results.forEach(result => {
              var colors = result[0].imagePropertiesAnnotation.dominantColors.colors;
              colors = colors.sort((a, b) => {
                return a.score < b.score;
              })
              colors.pop();
              colors.pop();
              colors.pop();
              colors.pop();
              colorResult.individual.push(colors.map(color => color.color));
            })

            var allcolors = [];
            colorResult.individual.forEach(member => {
              allcolors = allcolors.concat(member);
            })

            function makeVector(ob) {
              return [ob.red, ob.green, ob.blue];
            }
            allcolors = allcolors.map(c => makeVector(c));

            var dist = require('vectors/dist')(3)
            var normalize = require('vectors/normalize')(3)

            for (var i = 0; i < rendersettings.iteratecolors; i++) {
              for (var i = 0; i < allcolors.length; i++) {
                for (var j = allcolors.length-1; j > i; j--) {
                  var a = allcolors[i];
                  var b = allcolors[j];
                  var d = dist(normalize(a), normalize(b));

                  if (a[0] > 0.0 && b[0] > 0.0) {
                    if (d <= rendersettings.mergecolors) {
                      allcolors[j] = [0,0,0];
                    } else if (d < rendersettings.mixcolors) {
                      allcolors[j] = allcolors[i] = [(a[0]+b[0])/2, (a[1]+b[1])/2, (a[2]+b[2])/2]
                    }
                  }
                }
              }
            }

            allcolors = allcolors.filter(col=>col[0]>0);
            colorResult.average = allcolors;
            inform("colors analyse ready", 100);
            topresolve(colorResult);
          }).catch(err => {
            topreject(err);
          })
      }))

      //All = all google Vision functions
      Promise.all(toppromises).then(function(values) {
        var sender = {};
        values.forEach(val=>{
          sender[val.name] = {average: val.average, individual: val.individual};
        });
        socket.emit("parsed", sender);
      });

    });

  }

  socket.on("reload", function(data){
    rendersettings = data;
    reload();
  })

});
