var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});
module.exports = app;

// ----------------- my codes --------------------//

//jshint
/* global require */
/* global console */
/* global __dirname */
/* global module */
/* global process */
//

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

//express settings
app.set('port', process.env.PORT || 3000);
app.use(express.static(__dirname + '/public'));
// set up handlebars view engine
var handlebars = require('express-handlebars')
	.create({ defaultLayout:'main' });
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

// usernames which are currently connected to the chat
var usernames = {}; // key and value are username text
var usernamesIndexed = {}; // key is index[zero based] and value is username
var population = 0;

//var ip;
app.get('/', function(req, res){
  //ip = req.ip;
  res.render('home', {title: "iChat!" });
});

app.get('/about', function(req, res){
  res.render('about', {title: "About iChat!" });
});

io.on('connection', function(socket){	
  var addedUser = false;

  // check username(username to validate)
  socket.on('check user', function (usernameTV) {
    var isValid = true;
	var i=0;
	for(i=0;i<population;i++){
		if(usernamesIndexed[i] === usernameTV){
			isValid = false;
			break;
		}
	}	
	socket.emit('valid user', {
       isValid: isValid,
	   username: usernameTV
     });
  });
  
  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (username) {
    // store the username and userId in the socket session for this client
    socket.username = username;
	socket.id = population;
	
    // add the client's username to the storage
    usernames[username] = username;
	usernamesIndexed[population] = username;
    population++;
    addedUser = true;
     
    // emit globally(all clients) that a new user has connected
    socket.broadcast.emit('user joined', {
      username: socket.username,
      population: population,
	  usernames: usernamesIndexed
    });
	
	socket.emit('login', {
       population: population
     });
  });
  
  // when the client emits 'new message', this listens and executes
  socket.on('new message', function (data) {
    // send the 'new message' to all clients
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data
    });
  });

  

  // send user typing status to all clients [start]
  socket.on('typing', function () {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // send user typing status to all clients [stop]
  socket.on('stop typing', function () {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects
  socket.on('disconnect', function () {
    // remove the username from storage
    if (addedUser) {
      delete usernames[socket.username];
	  delete usernamesIndexed[socket.id];
      population--;

      // send to all clients that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        population: population,
		usernames: usernamesIndexed
      });
    }
  });
});

// 404 catch-all handler (middleware)
app.use(function(req, res, next){
	res.status(404);
	res.render('404', {title: "Page not found"});
});
// 500 error handler (middleware)
app.use(function(err, req, res, next){
	console.error(err.stack);
	res.status(500);
	res.render('500', {title: "Server error" });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});