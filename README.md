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

A limitation of this approach is that word stemming happens at the database
level, whereas synonym replacement happens at the application level. This means
that synonyms might not be replaced for different conjugations of a word. For
example, searching for the word "_messaging_" might not yield any synonyms,
since it's a conjugation of the word "_message_", whereas searching for the word
"_message_" might yield "_message_", "_communication_", "_memo_",
"_notification_", which would be more useful.

Another limitation is that this method would give each word the same weight when
analyzing the query. The case could be made that the original word should be
preferred over any of its synonyms, but MongoDB has no way of differentiating
between them when executing the query.

Dictionaries are included for nicknames of common names, and acronyms.
