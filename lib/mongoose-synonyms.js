var hooks = require('hooks');
var path = require('path');
var _ = require('underscore');

module.exports = exports = function synonymsPlugin(schema, options) {
  if (!options.dictionary) return;

  var dictionary = getDictionary(options.dictionary);
  var fields = options.fields || ['$text.$search'];

  // Add hooks' methods: `hook`, `pre`, `post`
  for (var k in hooks) {
    schema.statics[k] = hooks[k];
  }

  // Add synonyms prior to running queries on `find`, `findOne`, `count`
  ['find', 'findOne', 'count'].forEach(function(method) {
    schema.statics.pre(method, addSynonyms(dictionary, fields));
  });
}

// Load dictionary file
var getDictionary = _.memoize(function(dictionary) {
  if ('string' === typeof dictionary) {
    dictionary = require(path.join('../dictionaries/', dictionary)) || require(dictionary);
  }
  if (dictionary) {
    // Expand synonyms for back-matching
    _.each(_.clone(dictionary), function(synonyms, key) {
      synonyms = synonyms.split(' ');
      synonyms.forEach(function(synonym) {
        if (!dictionary[synonym]) dictionary[synonym] = [];
        if ('string' === typeof dictionary[synonym]) dictionary[synonym] = dictionary[synonym].split(' ');
        dictionary[synonym].push(key);
        dictionary[synonym] = _.uniq(dictionary[synonym]).join(' ');
      });
    });
  }
  return dictionary || {};
});

// Add synonyms to each word in the query
var addSynonyms = function(dictionary, fields) {
  return function(next, conditions) {
    if (conditions) {
      _.each(fields, function(field) {
        // Treat text search differently
        if ('$text.$search' === field && conditions.$text && conditions.$text.$search) {
          conditions.$text.$search = addSynonym(conditions.$text.$search, dictionary);
        } else if (conditions[field]) {
          //-conditions[field] = addSynonym(conditions[field], dictionary);
        }
      });
    }
    return next();
  }
  // Add synonyms to individual fields
  function addSynonym(field, dictionary) {
    // @todo For non-text search fields, add $or clause
    var words = field.split(' ');
    words.forEach(function(word, i) {
      if (dictionary[word]) {
        words[i] += ' ' + dictionary[word];
      }
    });
    return words.join(' ');
  }
}
