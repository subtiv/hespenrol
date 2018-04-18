$(function() {
  // Initialize variables
  var $window = $(window);
  var socket = io();
  var currmsg = [];
  var MSG_DISP_TIME = 4000;

  var Settings = function() {
    this.minlabel = 0.6;
    this.minlabela = 0.9;
    this.mergecolors = 0.1;
    this.mixcolors = 0.5;
    this.iteratecolors = 10;
    this.reload = ()=>{
      reset();
      socket.emit("reload", this)
    };
  };

  var parsed = {};
  var settings = new Settings();
  var gui = new dat.GUI({
    autoPlace: false
  });
  var customContainer = $('.moveGUI').append($(gui.domElement));
  gui.add(settings, 'minlabela', 0, 1);
  gui.add(settings, 'minlabel', 0, 1);
  gui.add(settings, 'mergecolors', 0, 1);
  gui.add(settings, 'mixcolors', 0, 1);
  gui.add(settings, 'iteratecolors', 1, 30);
  gui.add(settings, 'reload');
  var generalinformation = {};
  var individualinformation = [];

  function reset(){
    $("#orignalimgs").html("");
  }


  function updateInformer() {
    $("#outerinform").html((currmsg.length > 0) ? '<div id="inform" class="informbox"></div>' : "");
    currmsg.forEach(function(msg) {
      $("#inform").append("<p class='informer'>" + msg + "</p>")
    });
  }

  // Whenever the server emits 'typing', show the typing message
  socket.on('inform', function(data) {
    currmsg.push(data.msg);
    updateInformer();
    setTimeout(function() {
      currmsg.shift();
      updateInformer();
    }, MSG_DISP_TIME);
  });

  socket.on("img", function(data){
      $("#orignalimgs").html("");
      data.forEach(function(img){
        $("#orignalimgs").append('<img src='+img+' alt="'+img+'" class="displayimg">');
      });
  })

  socket.on("parsed", function(data){
    parsed = data;
    console.log(parsed);
  })






});
