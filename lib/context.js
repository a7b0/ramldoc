var extend = require('extend');
var marked = require('marked');

function slug(name) {
  return name
      .replace(/ /g, '-')
      .replace(/[?!]/g, '')
      .replace(/_/g, '-')
      .replace(/['"]/g, '')
      .replace(/[(){}]/g, '')
      .replace(/\[/g, '')
      .replace(/\]/g, '')
      .replace(/[\/\\]/g, '-')
      .toLowerCase();
}

function getHeadings(text) {
  var headings = [];
  var level = 4;
  marked.lexer(text).forEach(function(token) {
    if (token.type === 'heading') {
      if (token.depth <= level) {
        if (token.depth !== level) {
          headings = [];
        }
        level = token.depth;
        headings.push(token.text);
      }
    }
  });
  return headings;
}

function buildContext(raml, options) {
  var ids = {};
  var toc = [];

  function newId(name) {
    name = slug(name);
    var id = name;
    var index = 0;

    while (id in ids) {
      index++;
      id = name + index;
    }

    return id;
  }

  function extendSecuritySchemes() {
    if (!raml.securitySchemes) {
      return;
    }
    raml.securitySchemes = raml.securitySchemes.map(function(scheme) {
      var key = Object.keys(scheme)[0];
      scheme = scheme[key];
      scheme.key = key;
      scheme._id = newId('scheme-' + scheme.type);
      if (scheme.describedBy) {
        extendResponses(scheme.describedBy);
      }
      return scheme;
    });
  }

  function extendSecuredBy(obj) {
    if (obj.securedBy && raml.securitySchemes) {
      obj.securedBy = obj.securedBy.map(function(key) {
        var schemes = raml.securitySchemes;
        for (var i = 0, l = schemes.length; i < l; i++) {
          var scheme = schemes[i];
          if (scheme.key === key) {
            return {
              _id: scheme._id,
              type: scheme.type,
              key: key
            };
          }
        }
      });
    }
  }

  function extendResponses(obj) {
    if (obj.responses) {
      obj.responses = Object.keys(obj.responses).map(function(key) {
        var response = obj.responses[key];
        response.code = key;
        return response;
      });
    }
  }

  function extendMethods(resource, topics) {
    if (resource.methods) {
      var relativeUri = resource._relativeUri;
      resource.methods.forEach(function(method) {
        var id = newId(method.method + '-resource' + relativeUri);
        topics.push({
          id: id,
          name: method.displayName,
          method: method.method,
          relativeUri: relativeUri
        });
        method._id = id;
        extendSecuredBy(method);
        extendResponses(method);
      });
    }
  }

  function extendResources(parent, topics, level) {
    level = level || 0;
    if (!parent.resources) {
      return;
    }
    parent.resources.forEach(function(resource) {
      extendResource(parent, resource, topics, level);
    });
  }

  function extendResource(parent, resource, topics, level) {
    var parentUri = level ? parent._relativeUri : '';
    var relativeUri = parentUri + resource.relativeUri;
    var id = newId('resource' + relativeUri);
    var uriParameters = [];
    if (level) {
      uriParameters = uriParameters.concat(parent._uriParameters);
    }
    if (resource.uriParameters) {
      uriParameters = uriParameters.concat(resource.uriParameters);
    }
    var topic = {
      id: id,
      name: resource.displayName,
      relativeUri: relativeUri,
      methods: []
    };
    topics.push(topic);
    if (!level) {
      topics = topic.resources = [];
    }
    extend(resource, {
      _id: id,
      _parentUri: parentUri,
      _relativeUri: relativeUri,
      _uriParameters: uriParameters
    });
    extendSecuredBy(resource);
    extendMethods(resource, topic.methods);
    extendResources(resource, topics, level + 1);
  }

  if (raml.baseUri) {
    raml.baseUri = raml.baseUri.replace('{version}', raml.version);
  }

  if (raml.documentation) {
    raml.documentation.forEach(function(doc) {
      doc._id = newId('doc-' + doc.title);
      doc._topics = [];
      getHeadings(doc.content).forEach(function(topic) {
        doc._topics.push({
          id: slug(topic),
          name: topic
        });
      });
    });
  }

  extendSecuritySchemes();
  extendResources(raml, toc);

  return {
    raml: raml,
    options: options,
    toc: toc
  };
}

module.exports = {
  build: buildContext,
  slug: slug
};