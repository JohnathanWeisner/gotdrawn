var express = require('express');
var mongoose = require('mongoose');
var Post = mongoose.model('Post');
var Artwork = mongoose.model('Artwork');

var router = express.Router();

function complete(posts, res) {
  if (!posts.some(artworksNotLoaded)) {
    res.render('index', { posts: posts });
  }
}

function artworksNotLoaded(post) {
  return post.artworks === undefined;
}

/* GET home page. */
router.get('/', function (req, res) {
  var dateNow = new Date().getTime(),
      oneDay = 86400000,
      oneDayAgo = (dateNow - oneDay)/1000,
      postSelect = {_id:0, url:1, author:1, name:1, score:1, title:1, permalink:1, created_utc:1},
      artworkSelect = {_id:0, url:1, author:1, id:1, score:1, subreddit:1, link_id:1},
      bestPosts = Post.find({created_utc:{$gte : oneDayAgo}}, postSelect).limit(20).sort({score: 'desc'});

  bestPosts.exec(function (err, posts) {
    posts.forEach(function (post) {
      Artwork.find(
        {link_id: post.name}, 
        artworkSelect, 
        function (err, artworks) {
          post.artworks = artworks;
          complete(posts, res);
        }
      );
    });
  });
});

module.exports = router;
