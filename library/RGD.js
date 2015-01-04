var config = require('../config.js');
var when = require('when');
var snoocore = require('snoocore');
var imgur = require('imgur');
var mongoose = require('mongoose');
var Post = mongoose.model('Post');
var Artwork = mongoose.model('Artwork');

var RGD = function(){
  return {
    reddit: new snoocore({
      userAgent: 'Gotdrawn: http://www.Gotdrawn.com'
    }),
    imgur: imgur,
    config: config,
    
    nextListing: function(next) {
      var $this = this;

      next.then (function(slice) {
        slice.children.forEach(function(post, i){
          $this.processPost(post.data);

          $this.getArtworks(post.data.id).then(function(slice) {
            var artworks = slice[1].data.children
            console.log(slice[1].data.children.length + i);

            artworks.forEach(function(artwork){
              $this.processArtwork(artwork.data);
            });
          });

        })

        console.log(slice.count);

        if (slice.children.length > 0) {
          var artworkTime = parseInt(slice.children[0].data.created_utc) * 1000;
        } else {
          var artworkTime = new Date().getTime();
        }

        if ($this.lessThanDaysAgo(2, artworkTime)){
          next = slice === undefined ? $this.getPosts() : slice.next();
          setTimeout($this.nextListing(next), 2000);
        } else {
          next = $this.getPosts();
          $this.nextListing(next);
        }
      }); 
    },

    run: function() {
      this.imgur.setClientId(this.config.clientID);
      var next = this.getPosts();
      this.nextListing(next);
    },

    getPosts: function() {
      return this.reddit('/r/$subreddit/hot').listing({
        $subreddit: 'redditgetsdrawn',
        limit: 300
      });
    },

    getArtworks: function(post_id) {
      return this.reddit('/r/$subreddit/comments/$article').get({
        $subreddit: 'redditgetsdrawn',
        $article: post_id,
        limit: 300,
        depth: 1
      })
    },

    processPost: function(post) {
      $this = this;
      if (post.body === '[deleted]' || post.stickied === true) { return; } 

      if (!$this.isImg(post.url) && $this.isImgur(post.url)) {
        if ($this.isImgurAlbum(post.url)) {
          var albumID = $this.extractImgurAlbumID(post.url);

          $this.imgur.getAlbumInfo(albumID).then(function(info) {
            post.url = info.data.images[0].link;
            if (!post.url) { return; }
            $this.createOrUpdate(Post, post);
          });

        } else {
          post.url = $this.imgurToImgLink(post.url);
          $this.createOrUpdate(Post, post);
        }
      } else if ($this.isImg(post.url)) { 
        $this.createOrUpdate(Post, post);
      }
    },

    processArtwork: function(artwork) {
      $this = this;
      if (artwork.body === '[deleted]' || !artwork.body) { return; }

      var url = $this.extractURL(artwork);

      if ($this.isImgurAlbum(url)) {
        var albumID = $this.extractImgurAlbumID(url);

        $this.imgur.getAlbumInfo(albumID).then(function(info) {
          url = info.data.images[0].link;
          if (!url) { return; }
          artwork.url = url;

          $this.createOrUpdate(Artwork, artwork);
        });

      } else if ($this.isImgur(url)) {
        artwork.url = $this.imgurToImgLink(url);
        $this.createOrUpdate(Artwork, artwork);
      } else if ($this.isImg(url)) {
        artwork.url = url;
        $this.createOrUpdate(Artwork, artwork);
      }
    },

    createOrUpdate: function(object, toStore) {
      var item = new object(toStore);
      var upsertItem = item.toObject();

      delete upsertItem._id

      object.update(
        {name: upsertItem.name}, 
        upsertItem, 
        {upsert: true}, 
        function (err, doc) { if(err) { console.log(err) } }
      );
    },

    extractURL: function(artwork) {
      var urlPattern = /(http|ftp|https):\/\/[\w-]+(\.[\w-]+)+([\w.,@?^=%&amp;:\/~+#-]*[\w@?^=%&amp;\/~+#-])?/;
      var match = artwork.body.match(urlPattern);
      return match ? match[0] : null;
    },

    isImg: function(url) {
      if (!url) { return false; }
      return url.match(/.(jpg|jpeg|gif|png|tif)/i) !== null;
    },

    isImgur: function(url) {
      if (!url) { return false; }
      return url.match(/imgur.com/i) !== null;
    },

    isImgurAlbum: function(url) {
      if (!url) { return false; }
      return url.match(/imgur.com\/(a|album)\//i) !== null;
    },

    imgurToImgLink: function(url) {
      if (!url) { return ''; }
      var imgur = url.match(/(imgur.com\/)([a-z0-9])*/i)[0];
      return "http://i." + imgur + ".jpg";
    },

    extractImgurAlbumID: function(url) {
      if (!url) { return ''; }
      return url.match(/imgur.com\/(a|album)?\/([a-z0-9]*)/i)[2];
    },

    lessThanDaysAgo: function(days, time) {
      var dateNow = new Date().getTime(),
          numDaysAgo = dateNow - (86400000 * days);
      return time > numDaysAgo;
    }
  }
}

module.exports = RGD();