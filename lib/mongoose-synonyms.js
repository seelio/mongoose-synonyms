var hooks = require('hooks');
var path = require('path');
var _ = require('underscore');

module.exports = function synonymsPlugin(schema, options) {
  if (!options || !options.dictionary) return;

  var dictionary = prepareDictionary(options.dictionary);
  // Default to full-text search if no fields are provided
  var fields = options.fields || ['$text.$search'];

  // Add hook methods: `hook`, `pre`, `post`
  for (var k in hooks) {
    schema.statics[k] = schema.statics[k] || hooks[k];
  }

  // Add synonyms prior to running queries on `find`, `findOne`, `count`
  ['find', 'findOne', 'count'].forEach(function(method) {
    schema.statics.hook(method, schema.statics[method]);
    schema.statics.pre(method, addSynonyms(dictionary, fields));
  });
}

// Prepare dictionary for use
var prepareDictionary = module.exports.prepareDictionary = _.memoize(function(dictionary) {
  if ('string' === typeof dictionary) {
    // Load dictionary file
    dictionary = require(path.join('../dictionaries/', dictionary));
  }
  if (dictionary) {
    // Expand synonyms for back-matching
    _.each(_.clone(dictionary), function(synonyms, key) {
      synonyms.forEach(function(synonym) {
        if (!dictionary[synonym]) dictionary[synonym] = [];
        dictionary[synonym] = _.uniq(dictionary[synonym].concat([key], synonyms));
      });
      // Add word key to synonym list
      dictionary[key].push(key);
    });
  }
  return dictionary || {};
});

// Add synonyms to each word in the query
var addSynonyms = module.exports.addSynonyms = function(dictionary, fields) {
  return function(next, conditions) {
    if (conditions) {
      _.each(fields, function(field) {
        if ('$text.$search' === field && conditions.$text && conditions.$text.$search) {
          // Text search is a string of words
          conditions.$text.$search = _.map(conditions.$text.$search.split(' '), function(word) {
            return getWordSynonyms(word, dictionary).join(' ');
          }).join(' ');
        } else if (conditions[field] && 'string' === typeof conditions[field]) {
          // Convert string query to a list used with `$in`
          conditions[field] = { $in: getWordSynonyms(conditions[field], dictionary) };
        } else if (conditions[field] && conditions[field].$in) {
          // Add extra elements to `$in` in array queries
          conditions[field].$in = _.chain(conditions[field].$in).map(function(word) {
            return getWordSynonyms(word, dictionary);
          }).flatten().value();
        }
      });
    }
    return next();
  }
  // Get synonym for a specific word
  function getWordSynonyms(word, dictionary) {
    return dictionary[word] || [word];
  }
}
