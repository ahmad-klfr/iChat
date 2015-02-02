/**
 * Author: Ahmad khalilfar
 * Date: 31-Jan-2015
 */
$(document).ready(function() {

  // typing status fading timers
  var FADE_TIME = 150; // ms
  var TYPING_TIMER_LENGTH = 400; // ms
  
  // to beautify usernames
  var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];

  // Initialize varibles
  var $window = $(window);
  var $userValidation = $('.userValidation'); // username validation message
  var $users = $('.users'); // users area
  var $usernameInput = $('.usernameInput'); // Input for username
  var $messages = $('.messages'); // Messages area
  var $typingmsg = $('.typingmsg'); // Typing message
  var $inputMessage = $('.inputMessage'); // Input message input box
  var $loginPage = $('.login.page'); // The login page
  var $chatPage = $('.chat.page'); // The chatroom page

  // Prompt for setting a username
  var num_users = 0;
  var username;
  var connected = false;
  var typing = false;
  var lastTypingTime;
  var $currentInput = $usernameInput.focus();

  //start client
  var socket = io();

  //prompt added user to all users
  function addParticipantsMessage (data) {
    var message = '';
    if (data.population === 1) {
      message += "there's 1 participant";
	  num_users = 1;
    } else {
      message += "there are " + data.population + " participants";
	  num_users = data.population;
    }
    $('.onlines').html('<div class="label label-success">#Onlines: <span class="badge">' + num_users + '</span></div>');
    log(message);
  }
	
   //Update users box
  function updateUsers(data){
	$users.html("");
	$i=0;
	$.each(data.usernames, function(){
		var $elem = $('<div class="list-group-item">').text(data.usernames[$i++]);
		$users.prepend($elem);
	});
  }
  
  // Check client's username
  function setUsername () {
    var usernameTV = cleanInput($usernameInput.val().trim());
	socket.emit('check user', "@" + usernameTV);
  }

  // Sends a chat message
  function sendMessage () {
    var message = $inputMessage.val();
    // Prevent markup from being injected into the message ---> escape
    message = cleanInput(message);
    // if there is a non-empty message and a socket connection
    if (message && connected) {
      $inputMessage.val('');
      addChatMessage({
        username: "You",
        message: message
      });
      // tell server to execute 'new message' and send along one parameter
      socket.emit('new message', message);
    }
  }

  // Log a message ---> add to message box
  function log (message, options) {
    var $el = $('<div class="list-group-item">').text(message);
    addMessageElement($el, options);
  }

  // Adds the chat message to the message box
  // [username  message]
  function addChatMessage (data, options) {
    // Don't fade the message in if there is an 'X was typing'
    options = options || {};
	options.prepend = true;

    var $usernameDiv = $('<span class="username">')
      .text(data.username)
      .css('color', getUsernameColor(data.username));
    var $messageBodyDiv = $('<span class="messageBody">')
      .text(data.message);

    var typingClass = data.typing ? 'typing' : '';
    var $messageDiv = $('<div class="list-group-item">')
      .data('username', data.username)
      .addClass(typingClass)
      .append($usernameDiv, $messageBodyDiv);

    addMessageElement($messageDiv, options);
  }

  // Adds the chat typing message in fading area ---> bellow input message
  function addChatTyping (data) {
    data.typing = true;
    data.message = 'is typing';
    addChatTypingMessage(data);
  }
  
  // Adds the chat typing message status in fading area
  function addChatTypingMessage (data, options) {
    // Don't fade the message in if there is an 'X was typing'
    var $typingMessages = getTypingMessages(data);
    options = options || {};
    if ($typingMessages.length !== 0) {
      options.fade = false;	  
      $typingMessages.remove();
    }

    var $usernameDiv = $('<span class="username">')
      .text(data.username)
      .css('color', getUsernameColor(data.username));
    var $messageBodyDiv = $('<span class="messageBody">')
      .text(data.message);

    var typingClass = data.typing ? 'typing' : '';
    var $messageDiv = $('<span class="text-primary">')
      .data('username', data.username)
      .addClass(typingClass)
      .append($usernameDiv, $messageBodyDiv);
	
	var $el = $messageDiv;

    // Setup default options
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }

    // Apply options
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
	
    $typingmsg.html($el);
  }

  // Removes the chat typing message status
  function removeChatTyping (data) {
    getTypingMessages(data).fadeOut(function () {
      $(this).remove();
    });
  }

  // Adds a message element to the messages box
  // el - The element to add as a message
  // options.fade - If the element should fade-in (default = true)
  // options.prepend - If the element should prepend
  // all other messages (default = false)
  function addMessageElement (el, options) {
    var $el = $(el);

    // Setup default options
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = true;
    }

    // Apply options
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
  }

  // Prevents input from having injected markup ---> escape mal. data
  function cleanInput (input) {
    return $('<div>').text(input).text();
  }

  // Updates the typing event
  function updateTyping () {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing');
      }
      lastTypingTime = (new Date()).getTime();

      setTimeout(function () {
        var typingTimer = (new Date()).getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit('stop typing');
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }

  // Gets the '[username] is typing' messages of a user
  function getTypingMessages (data) {
    return $('.typing').filter(function (i) {
      return $(this).data('username') === data.username;
    });
  }

  // Gets the color of a username through our hash function
  function getUsernameColor (username) {
    // Compute hash code
    var hash = 7;
    for (var i = 0; i < username.length; i++) {
       hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate color
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }

  // ------------- Keyboard events ------------------
  
  // for control user status
  $window.keydown(function (event) {
    // Auto-focus the current input when a key is typed
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $currentInput.focus();
    }
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      if (username) {
        sendMessage();
        socket.emit('stop typing');
        typing = false;
      } else {
        setUsername();
      }
    }
  });

  $inputMessage.on('input', function() {
    updateTyping();
  });
  //------------------------------------------------
  
  
  // ------------- Click events --------------------
  
  // Focus input when clicking anywhere on login page
  $loginPage.click(function () {
    $currentInput.focus();
  });

  // Focus input when clicking on the message input's border
  $inputMessage.click(function () {
    $inputMessage.focus();
  });
  //------------------------------------------------
  
  
  // ------------- Socket events -------------------

  // Whenever the server emits 'login', log the login message
  socket.on('login', function (data) {
    connected = true;
    // Display the welcome message
    var message = "Welcome to iChat ";
    log(message, {
      prepend: true
    });
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'new message', update the chat body
  socket.on('new message', function (data) {
	if(data.username !== username)
		addChatMessage(data);
  });

  // Whenever the server emits 'user joined', log it in the chat body
  socket.on('user joined', function (data) {
    log(data.username + ' joined');
    addParticipantsMessage(data);
	updateUsers(data);
  });

  // Whenever the server emits 'user left', log it in the chat body
  socket.on('user left', function (data) {
    log(data.username + ' left');
    addParticipantsMessage(data);
    removeChatTyping(data);
	updateUsers(data);
  });

  // Whenever the server emits 'typing', show the typing message
  socket.on('typing', function (data) {
    if(data.username !== username)
		addChatTyping(data);
  });

  // Whenever the server emits 'stop typing', kill the typing message
  socket.on('stop typing', function (data) {
	if(data.username !== username)
		removeChatTyping(data);
  });

  // Whenever the server emits 'valid user', check server response
  socket.on('valid user', function (data) {
    if(data.isValid){
		username = data.username;
		$userValidation.html('');
		// If the username is valid
		if (username) {
		  $loginPage.fadeOut();
		  $chatPage.show();
		  $loginPage.off('click');
		  $currentInput = $inputMessage.focus();

		  // Tell the server your username
		  socket.emit('add user', username);
		}
	}else{
		$userValidation.html('<div class="alert alert-danger">Sorry!! This name entered earlier!</div>');
	}
  });  
  //------------------------------------------------
});