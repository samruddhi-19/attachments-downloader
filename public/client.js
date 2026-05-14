window.TrelloPowerUp.initialize({
  'board-buttons': function(t) {
    return [{
      icon: 'https://cdn-icons-png.flaticon.com/512/724/724933.png',
      text: 'Download',
      callback: function(t) {
        return t.popup({
          title: 'Downloader',
          url: 'index.html',
          height: 200
        });
      }
    }];
  }
});