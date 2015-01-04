var express = require('express');
var mongoose = require('mongoose');
var Artwork = mongoose.model('Artwork');

var router = express.Router();
var select = {_id:0, url:1, author:1, name:1, score:1, created_utc: 1, subreddit:1, link_id:1, title:1, id:1}

router.get('/', function (req, res) {
  var newArtworks = Artwork.find({}, select).limit(30).sort({created_utc: 'desc'});

  newArtworks.exec(function (err, artworks) {
    res.render('artworks/index', { artworks: artworks });
  });
});

router.get('/top', function (req, res) {
  var bestArtworks = Artwork.find({}, select).limit(30).sort({score: 'desc'});

  bestArtworks.exec(function (err, artworks) {
    res.render('artworks/top', { artworks: artworks });
  });
});


module.exports = router;
