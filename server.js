// set up ========================================================================================

'use strict';

var express		= require('express');
var bodyParser 		= require('body-parser');
var cookieParser 	= require('cookie-parser');
var session 		= require('express-session');
var mongoose 		= require('mongoose');
var bcrypt 		= require('bcrypt');
var app 		= express();
var port 		= 8080;

// config ========================================================================================

mongoose.connect('mongodb://localhost/mmoauction', function(err) {
	if(err) throw err;
});

var SALT = 10;
var db = mongoose.connection;
var Schema = mongoose.Schema;
var userSchema = new Schema({
	username: 		{ type: String, trim: true, lowercase: true, required: true },
	password: 		{ type: String, required: true },
	email: 			{ type: String, trim: true, lowercase: true },
	firstname: 		String,
	lastname: 		String,
	usertype: 		{ type: String, default: 'user'},
	gender: 		String,
	birth_date: 		Date,
	mobile_number: 		Number,
	address: {
		country: 	String,
		city: 		String,
		state: 		String,
		zipcode: 	Number
	}
}); // Define ang schema nang collection *Optional pwede din i-define dito ang collection name
	
var User = mongoose.model('User', userSchema, 'users'); // Wag kalimutan ang collection name third-parameter
db.once('open', function() {
	console.log('connected');
});

// express modules to use ========================================================================

app.use(express.static(__dirname + '/public'));
app.use(bodyParser());
app.use(cookieParser());
app.use(session({ secret: '1234m@rkuyP0g!4321', key: 'mmoauction' }));

// listen ========================================================================================

app.listen(port);
console.log('Server is listening to ' + port);

// routes ========================================================================================

	// api ------------------------------
	// get all users
	app.get('/api/users', isLoggedIn, function(req, res) {
		User.find(function(err, users) {
			if(err) res.send(err);
			console.log(users);		
			res.json(users);
		});
	});
	
	// get user by username
	app.get('/api/user/:username', function(req, res) {
		console.log(req.params);
		User.findOne({ username: req.params.username}, function(err, user) {
			if(user) {
				res.json(user)
			} else {
				var errorMessage = 'No user ' + req.params.username + ' found!';
				res.json(returnStatus('error', errorMessage));
			}
		});
	});	
	
	// add user 
	app.post('/api/user', isLoggedIn, function(req, res) {
		var salt, encPassword;	
		if(req.body.password) {
			salt = bcrypt.genSaltSync(SALT);
			encPassword = bcrypt.hashSync(req.body.password, salt);
		}
			
		var data = {
			username: req.body.username,
			password: encPassword,
			email: req.body.email,
			firstname: req.body.firstname,
			lastname: req.body.lastname,
			usertype: req.body.usertype,
			gender: req.body.gender,
			birth_date: req.body.birth_date,
			mobile_number: req.body.mobile_number
		};
		
		// check if username is taken	
		User.findOne({ username: data.username }, function(err, user) {
			if(user) {
				var errorMessage = 'Username "' + user.username + '" Already Taken! Use another.';
				res.json(returnStatus('error', errorMessage));
			} else {
				User.create(data, function(err, user) {
				var successMessage = 'Successfully created user ' + data.username;
					// Will trigger error if Mongoose schema validation failed 
					if(err) {
						for(var prop in err.errors) {
							console.log(err.errors[prop].message);
						}	
						res.json(returnStatus('error', err.message));
						return;
					}
					res.json(returnStatus('success', successMessage));
				});
			}
		});
		
	});
	
	// update user 
	app.put('/api/user/:username', isLoggedIn, function(req, res) {
		console.log(req.body);
		User.update({ username: req.params.username }, req.body, function(err, numberAffected, raw) {
			if(err) res.send(err);
			if(numberAffected) {
				var successMessage = 'Successfully updated ' + req.params.username +  '!';
				res.json(returnStatus('success', successMessage));	
			} else {
				var errorMessage = 'Sorry! user ' + req.params.username + ' did not update';
				res.json(returnStatus('error', errorMessage));
			}
		});
	});
	
	// delete user
	app.delete('/api/user/:username', isLoggedIn,  function(req, res) {
		User.remove({
			username: req.params.username
		}, function(err, user) {
			if(err) req.send(err);
			if(user) {
				var successMessage = 'Successfully deleted ' + req.params.username;
				res.json(returnStatus('success', successMessage));
			} else {
				var errorMessage = 'User ' + req.params.username + ' does not exists!';
				res.json(returnStatus('error', errorMessage)); 
			}
		});
	});
	
	// login user	
	app.post('/api/login', function(req, res) {
		console.log(req.body);
		var username = req.body.username || false,
		    password = req.body.password || false;
		if(username && password) {
	
			User.findOne({ username: req.body.username }, function(err, user) {
				if(err) res.json('error', err);
				console.log(user);
			
				if(bcrypt.compareSync(req.body.password, user.password)) {
					req.session.user = user;
					console.log(req.session);
					res.json(returnStatus('success', 'Welcome user ' + user.username));
					
				} else {
					res.json(returnStatus('error', 'Username and Password do not match!'));
				}
			});
		} else {
			res.json(returnStatus('error', 'Username and Password cannot be blanked!'));
		}
	});
	
	// user logout
	app.get('/api/logout', function(req, res) {
		if(req.session.user) {
			delete req.session.user;
			res.json(returnStatus('success', 'Successfully logged out!'));
		} else {
			res.json(returnStatus('error', 'Can\'t use this method'));
		}	
	});

// modules/function ====================================================================

function returnStatus(retStatus, retMessage) {
	console.log(retMessage);
	return { status: retStatus, message: retMessage };
}

function isLoggedIn(req, res, next) {
	if(req.session.user) {
		next();	
	} else {
		res.json('error', 'Please Log In');
	}
}
