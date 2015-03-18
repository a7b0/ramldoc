var fs = require('fs');
var yargs = require('yargs');
var ramldoc = require('./ramldoc');

function run(options) {
  var file = options._[0];
  var promise;
  if (options.raw) {
    promise = ramldoc.parseFile(file, options).then(function(result) {
      return JSON.stringify(result, false, '  ');
    });
  } else {
    promise = ramldoc.renderFile(file, options);
  }
  return promise.then(function(result) {
    var output = options.output;
    if (!output) {
      console.log(result);
      return;
    }
    return new Promise(function(resolve, reject) {
      fs.writeFile(output, result, function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  });
}

module.exports = {
  run: run,
  interpret: function() {
    var options = yargs
      .usage('Usage: $0 <ramlfile> [options]')
      .demand(1)
      .options('output', {
        alias: 'o',
        describe: 'output file',
        type: 'string'
      })
      .options('raw', {
        describe: 'output json object'
      })
      // .options('build', {
      //   alias: 'b',
      //   describe: 'available documentation types: plain',
      //   type: 'string'
      // })
      .options('template', {
        alias: 't',
        describe: 'path to custom handlebars template',
        type: 'string'
      })
      .help('help')
      .alias('help', 'h')
      .version(function() {
        return require('../package').version;
      })
      .alias('v', 'version')
      .argv;

    run(options).catch(function(err) {
      console.error(err);
      process.exit(1);
    });
  }
};