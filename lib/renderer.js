var fs = require('fs');
var path = require('path');
var util = require('util');
var handlebars = require('handlebars');
var Visitor = handlebars.Visitor;
var defaultHelpers = require('./helpers');

function readFile(filename) {
  return new Promise(function(resolve, reject) {
    fs.readFile(filename, { encoding: 'utf-8'}, function(err, text) {
      if (err) {
        return reject(err);
      }
      resolve(text);
    });
  });
}

function PartialModifier(basePath) {
  var partials = [];
  Visitor.call(this);
  this.PartialStatement = function(partial) {
    var name = partial.name.original;
    if (!path.isAbsolute(name)) {
      name = path.join(basePath, name);
    }
    partial.name.original = name;
    Visitor.prototype.PartialStatement.call(this, partial);
    partials.push(name);
  };
  this.getPartials = function() {
    return partials;
  };
}

util.inherits(PartialModifier, Visitor);

function wait() {
  throw new Error('partial is not imported yet');
}

function Renderer(options) {

  var hbs = handlebars.create();
  var templates = hbs.partials = {};
  var defaultBasePath = options.basePath;

  hbs.registerHelper(defaultHelpers);

  if (options.helpers) {
    var helpers = options.helpers;
    if (typeof(helpers) === 'string') {
      try {
        helpers = require(helpers);
      } catch (ex) {
        throw new Error('error at load helpers from module \"' + helpers + '"');
      }
    }
    hbs.registerHelper(helpers);
  }

  function template(name, context) {
    return templates[name](context);
  }

  function prepare(filename) {
    if (templates[filename]) {
      return Promise.resolve();
    }
    templates[filename] = wait;
    var basePath = path.dirname(filename);
    return readFile(filename).then(function(content) {
      var ast = hbs.parse(content);
      var modifier = new PartialModifier(basePath);
      modifier.accept(ast);
      templates[filename] = hbs.compile(ast);
      var promises = modifier.getPartials().map(function(item) {
        return prepare(item);
      });
      return Promise.all(promises);
    });
  }

  this.render = function(filename, context) {
    if (!filename) {
      throw new Error("template file is not defined");
    }
    if (!path.isAbsolute(filename)) {
      if (defaultBasePath) {
        filename = path.join(defaultBasePath, filename);
      }
      filename = path.resolve(filename);
    }
    if (filename in templates) {
      return template(filename, context);
    }
    return prepare(filename).then(function() {
      return template(filename, context);
    });
  };
}

Renderer.create = function(options) {
  return new Renderer(options);
};

module.exports = Renderer;