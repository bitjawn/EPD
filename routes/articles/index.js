const express = require('express');
const router = express.Router();
const cfc = require('../../modules/cfc');
const csrf = require('csurf');
const csrfProtection = csrf();
const flash = require('connect-flash');
const Article = require('../../models/article');
const User = require('../../models/user');

// list articles per user
router.get('/', (req, res) => {
	Article.where('author').eq(req.user.id).exec((err, articles) => {
		if (err) {
			console.log(err);
		}
		res.render('articles/list', {title:cfc('articles'), articles:articles});
	});
});

// list articles for all users
router.get('/list', (req, res) => {
	let uid = '';
	try {
		uid = req.user.id || false;
	} catch (error) {
		uid = false;
	}

	Article.find({}, (err, arts) => {
		if (err) {
			console.log(err);
		}
		let articles = [];
		for (var a in arts) {
			let article = arts[a];
			if (article.author == uid) {
				article.isAuthor = true;
			}
			articles.push(article);
		}
		res.render('articles/list', {title:cfc('articles'), articles:articles});
	});
});

// display single article
router.get('/article/:id', (req, res) => {
	let aId = req.params.id.split(';')[0];
	let uId = req.params.id.split(';')[1];


	Article.findById(aId, (err, art) => {
		if (err) {
			console.log(err);
			return;
		}

		let result = art;
		User.findById(art.author, (err, user) => {
			let article = {};
			article.title = result.title;
			article.author = cfc(user.fname) + ' ' + cfc(user.lname);
			article.url = result.url || '';
			article.postDate = result.postDate;
			article.postTime = result.postTime;
			article.private = result.private;
			article.body = result.body;


			let match = user.id == uId;

			res.render('articles/article', {title:cfc(result.title), article:article, isAuthor:match});
		});
	});
});

// add article
router.post('/add', isLoggedIn, (req, res) => {
	let article = new Article();
	article.title = req.body.title;
	article.url = req.body.url || '';
	article.body = req.body.body;
	article.author = req.user.id;
	article.private = req.body.private;
	article.postDate = postDate();
	article.postTime = postTime();

	article.save(function(err){
		if (err) {
			console.log(err);
			return;
		} else {
			req.flash('success', 'Article Added');
			res.redirect('/articles/');
		}
	});
});

// delete article
router.delete('/delete', isLoggedIn, (req, res) => {

});

// search
router.post('/search', (req, res) => {
	let searchType = req.body.type;
	let keyword = req.body.search;

	switch (searchType) {
		case 'title':
			Article.findByTitle(keyword, (err, art) => {
				if (err) {
					console.log(err);
					return;
				}

				if (null != art && undefined != art && 'undefined' != art) {
					if (Object.keys(art).length) {
						User.findById(art.author, (err, user) => {
							let article = {};
							article.title = art.title;
							article.author = user.fname + ' ' + user.lname;
							article.postDate = art.postDate;
							article.postTime = art.postTime;
							article.url = art.url || '';
							article.body = art.body;
							res.render('articles/article', {title:cfc(article.title), article:article});
						});
					} else {
						res.redirect('/articles/list');
					}
				} else {
						res.redirect('/articles/list');
				}
				});
			break;

		case 'author':
			User.find({}, (err, users) => {
				if (err) {
					console.log(err);
				}

				for (var u in users) {
					let user = users[u];
					let name = user.fname + ' ' + user.lname;
					if (keyword == name) {
						Article.findByAuthor(user.id, (err, articles) => {
							if (err) {
								console.log(err);
							}
							if (null != articles && undefined != articles && 'undefined' != articles) {
								res.render('articles/list', {title:cfc('articles'), articles:articles});
							}
						});
					} {
						break;
					}
				}
				res.redirect('/articles/list');
			});
			break;
	}
});

module.exports = router;

function log(data) {
	if (null != data && undefined != data && 'undefined' != data) {
		console.log(data);
	}
}

function postDate() {
	let date = new Date();
	return date.getMonth() + '/' + date.getDate() + '/' + date.getFullYear();
}

function postTime() {
	let date = new Date();
	return date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
}

function isLoggedIn(req, res, next) {
	if (req.isAuthenticated()) {
		next();
	} else {
		req.flash('errors', ['You must be logged in to access this resource']);
		res.redirect('/users/signin');
	}
}

function notLoggedIn(req, res, next) {
	if (!req.isAuthenticated()) {
		res.redirect('/users/signin');
	} else {
		next();
	}
}
