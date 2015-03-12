var hooks = require('hooks');
var Stemmer = require('natural').LancasterStemmer;
var path = require('path');
var _ = require('underscore');

module.exports = function synonymsPlugin(schema, options) {
  if (!options || !options.dictionary) return;

  if ('string' !== typeof options.dictionary && options.dictionaryName) {
    var dictionary = prepareDictionary(options.dictionaryName, options.dictionary, options);
  } else {
    var dictionary = prepareDictionary(options.dictionary, null, options);
  }

  // Default to full-text search if no fields are provided
  var fields = options.fields || ['$text.$search'];

  // Add hook methods: `hook`, `pre`, `post`
  for (var k in hooks) {
    schema.statics[k] = schema.statics[k] || hooks[k];
  }

  // Add synonyms prior to running queries on `find`, `findOne`, `count`
  ['find', 'findOne', 'count'].forEach(function(method) {
    schema.statics.hook(method, schema.statics[method]);
    schema.statics.pre(method, addSynonyms(dictionary, fields, options));
  });
}

// Prepare dictionary for use
var prepareDictionary = module.exports.prepareDictionary = _.memoize(function(name, dictionary, options) {
  options = options || {};
  if (!dictionary) {
    // Use dictionary name to access cached version
    dictionary = name;
  }
  // Load dictionary file
  if ('string' === typeof dictionary) {
    dictionary = require(path.join('../dictionaries/', dictionary));
  }
  var dict = {};
  if (dictionary) {
    // Expand synonyms dictionary for caching
    _.each(dictionary, function(synonyms, word) {
      var key = word.toLowerCase();
      // Store stemmed word keys when configured
      if (options.stem) key = Stemmer.stem(key);
      dict[key] = [word].concat(synonyms);
      // Add values as keys for back-matching
      dict[key].forEach(function(synonym) {
        var synonymKey = synonym.toLowerCase();
        // Store stemmed synonym as new key when configured
        if (options.stem) synonymKey = Stemmer.stem(synonymKey);
        if (!dict[synonymKey]) dict[synonymKey] = [word];
        dict[synonymKey] = _.uniq(dict[synonymKey].concat(dict[key]));
      });
    });
  }
  return dict;
});

// Add synonyms to each word in the query
var addSynonyms = module.exports.addSynonyms = function(dictionary, fields, options) {
  options = options || {};
  return function(next, conditions) {
    if (conditions) {
      _.each(fields, function(field) {
        if ('$text.$search' === field && conditions.$text && conditions.$text.$search) {
          // Text search is a string of words
          conditions.$text.$search = _.map(conditions.$text.$search.split(' '), function(word) {
            return getWordSynonyms(word, dictionary, options).join(' ');
          }).join(' ');
        } else if (conditions[field] && 'string' === typeof conditions[field]) {
          // Convert string query to a list used with `$in`
          conditions[field] = { $in: getWordSynonyms(conditions[field], dictionary, options) };
        } else if (conditions[field] && conditions[field].$in) {
          // Add extra elements to `$in` in array queries
          conditions[field].$in = _.chain(conditions[field].$in).map(function(word) {
            return getWordSynonyms(word, dictionary, options);
          }).flatten().value();
        }
      });
    }
    return next();
  }
  // Get synonym for a specific word
  function getWordSynonyms(word, dictionary, options) {
    options = options || {};
    var synonyms = dictionary[options.stem ? Stemmer.stem(word) : word.toLowerCase()];
    if (!synonyms) return [word];
    if (options.keyOnly) {
      if (options.quoteMatch) {
        synonyms = ['"' + synonyms[0] + '"'];
      } else {
        synonyms = [synonyms[0]];
      }
    }
    return synonyms;
  }
}
