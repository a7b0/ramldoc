var hbs = require('handlebars');
var http = require('http');
var marked = require('marked');
var markedRenderer = new marked.Renderer();
var slug = require('./context').slug;

markedRenderer.heading = function(text, level, raw) {
  return '<h'+ level + ' id="' + slug(raw) + '">' + text + '</h' + level + '>\n';
};

var helpers = {
  md: function(text) {
    if (text && text.length) {
      var html = marked(text, {
        renderer: markedRenderer
      });
      return new hbs.SafeString(html);
    }
    return '';
  },
  markdown: function(options) {
    var content = options.fn(this);
    return helpers.md(content);
  },
  toStatusCode: function(value) {
    var code = parseInt(value, 10);
    if (code && (code in http.STATUS_CODES)) {
      return http.STATUS_CODES[code];
    }
    return '';
  },
  toLowerCase: function(text) {
    return text.toLowerCase();
  },
  toUpperCase: function(text) {
    return text.toUpperCase();
  }
};

module.exports = helpers;