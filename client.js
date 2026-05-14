window.TrelloPowerUp.initialize({
  'board-buttons': function(t) {
    return [{
      text: 'Download Attachments',
      callback: function(t) {
        return t.popup({
          title: 'Downloader',
          url: './popup.html',
          height: 200
        });
      }
    }];
  }
});