Mongoose Synonyms
=================

[Mongoose Synonyms](https://github.com/vkareh/mongoose-synonyms) is a
[mongoose](http://mongoosejs.com/) plugin that adds synonyms from a dictionary
to search queries.

The basic mechanics of this module are to replace words in a MongoDB query with
a list of synonyms for those words. For example, the query
```javascript
{ $text: { $search: "cup of coffee" } }
```
might be replaced by the query
```javascript
{ $text: { $search: "cup mug of coffee brew java joe" } }
```
right before being sent to MongoDB.

You can use multiple dictionaries for different purposes and paths, which allows
for language-dependent synonyms, acronyms, and nicknames, based on the needs of
the data.

Usage
-----
After defining your schema, load the plugin with the dictionary to use for each
field:
```javascript
var mongooseSynonyms = require('mongoose-synonyms');
var MySchema = new mongoose.Schema({ ... });
MySchema.plugin(mongooseSynonyms, {
  dictionary: 'nicknames',
  fields: ['firstName', '$text.$search']
});
```
Queries that include `firstName`, as well as full-text search queries, will now
include common nicknames:
```javscript
db.users.find({ firstName: 'victor' })
```
would be replaced by
```javascript
db.users.find({ firstName: { $in: ['victor', 'vic', 'vick'] } })
```
Thus making it more likely that we will find the correct person.

In addition to basic word replacement, this plugin includes an optional word
stemmer to account for different conjugations of words. This is most useful when
using a dictionary for common word replacements (as opposed to nicknames or
acronyms). To use the word stemming feature, pass a `{stem: true}` option to the
plugin:
```javascript
MySchema.plugin(mongooseSynonyms, {
  dictionaryName: 'common-words',
  dictionary: require('./myDictionaryOfCommonWords.json'),
  stem: true
});
```

When passing a custom dictionary (be it an inline JSON object or a required
dictionary file), you should always pass a `dictionaryName` property along with
it so that the plugin knows to cache it (and thus avoid preparing the dictionary
from scratch for every database query).

Other options allowed in the plugin are `keyOnly` and `quoteMatch`:
```javascript
MySchema.plugin(mongooseSynonyms, {
  dictionary: 'nicknames',
  keyOnly: true,
  quoteMatch: true
});
```
The `keyOnly` flag prepares the dictionary in such a way that each term will be
replaced by the dictionary key only, thus avoiding all possible synonyms. For
example, the for the following dictionary entry:
```javascript
dictionary["soft drink"] = ["pop", "soda"];
```
the plugin would, by default, return `soft drink pop soda` whenever you search
for _any_ of the three terms. The `keyOnly` flag will ensure that only `soft
drink` is returned, rather than the entire list of synonyms. The `quoteMatch`
flag works on top of that to ensure that the matching key is enclosed in quotes.
Thus, searching for `fruity pop` will return `fruity "soft drink"`, which forces
an `AND` operation in MongoDB.

Limitations
-----------
A limitation of this plugin is that this method would give each word the same
weight when analyzing the query. The case could be made that the original word
should be preferred over any of its synonyms, but MongoDB has no way of
differentiating between them when executing the query.

Dictionaries
------------
Some sample (but usable) dictionaries are included. Feel free to add more
entries to them and pull request, or to add entirely new dictionaries from free
and open sources.
