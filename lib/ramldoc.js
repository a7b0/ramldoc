var raml = require('raml-parser');
var extend = require('extend');
var context = require('./context');
var Renderer = require('./renderer');
var path = require('path');

var defaults = {
  template: path.resolve(__dirname + '/../templates/plain/main.hbs'),
  protocol: 'http'
};

function Ramldoc(options) {
  options = extend({}, defaults, options);
  var renderer = new Renderer(options);

  function transform(ramlobj) {
    return context.build(ramlobj, options);
  }

  function render(context) {
    return renderer.render(options.template, context);
  }

  this.parse = function(definition) {
    return raml.load(definition).then(transform);
  };

  this.parseFile = function(filename) {
    return raml.loadFile(filename).then(transform);
  };

  this.render = function(definition) {
    if (typeof(definition) === 'string') {
      return this.parse(definition).then(render);
    }
    return render(definition);
  };

  this.renderFile = function(filename) {
    return this.parseFile(filename).then(render);
  };

  this.getOptions = function() {
    return options;
  };
}

module.exports = extend(Ramldoc, {
  defaults: defaults,
  create: function(options) {
    return new Ramldoc(options);
  },
  parseFile: function(definition, options) {
    return new Ramldoc(options).parseFile(definition);
  },
  renderFile: function(definition, options) {
    return new Ramldoc(options).renderFile(definition);
  }
});