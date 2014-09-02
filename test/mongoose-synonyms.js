var expect = require('chai').expect;
var mongoose = require('mongoose');
var mongooseSynonyms = require('../lib/mongoose-synonyms');

var schema, dictionary, conditions;
describe('Mongoose synonyms plugin', function() {
  before(function() {
    schema = mongoose.Schema({ firstName: String });
  });

  it('should add hooks to static schema methods', function() {
    expect(schema).to.not.contain.property('hook');
    mongooseSynonyms(schema, {
      dictionary: 'nicknames'
    });
    expect(schema).to.contain.property('pre');
  });

  describe('.prepareDictionary', function() {
    before(function() {
      dictionary = mongooseSynonyms.prepareDictionary('nicknames');
    });

    it('should load dictionary file', function() {
      expect(dictionary).to.be.ok;
    });

    it('should map words to synonyms', function() {
      expect(dictionary).to.contain.key('victor');
      expect(dictionary.victor).to.contain.members(['victor', 'vick', 'vic']);
    });

    it('should map synonyms to words', function() {
      expect(dictionary).to.contain.key('vic');
      expect(dictionary.vic).to.contain.members(['victor', 'vick', 'vic']);
    });

    it('should load custom dictionary from path', function() {
      var dict = mongooseSynonyms.prepareDictionary(require('./dictionary.json'));
      expect(dict).to.be.ok;
      expect(dict).to.have.keys(['coffee', 'java', 'brew']);
    });
  });

  describe('.addSynonyms', function() {
    before(function(done) {
      var addSynonyms = mongooseSynonyms.addSynonyms(dictionary, ['firstName', 'alias', '$text.$search', 'foo']);
      conditions = {
        firstName: 'victor',
        alias: { $in: ['victor', 'david', 'foo'] },
        $text: { $search: 'victor david' },
        bar: 'baz'
      };
      addSynonyms(done, conditions);
    });

    it('should replace string queries', function() {
      expect(conditions.firstName).to.be.ok;
      expect(conditions.firstName).to.have.keys('$in');
      expect(conditions.firstName.$in).to.be.an.instanceOf(Array);
      expect(conditions.firstName.$in).to.contain.members(['victor', 'vick', 'vic']);
    });

    it('should replace array queries', function() {
      expect(conditions.alias).to.be.ok;
      expect(conditions.alias).to.have.keys('$in');
      expect(conditions.alias.$in).to.be.an.instanceOf(Array);
      expect(conditions.alias.$in).to.contain.members(['victor', 'vick', 'vic', 'david', 'dave', 'davy', 'vida', 'foo']);
    });

    it('should replace text search queries', function() {
      expect(conditions.$text.$search).to.be.ok;
      expect(conditions.$text.$search).to.contain('victor');
      expect(conditions.$text.$search).to.contain('vick');
      expect(conditions.$text.$search).to.contain('vic');
      expect(conditions.$text.$search).to.contain('david');
      expect(conditions.$text.$search).to.contain('dave');
      expect(conditions.$text.$search).to.contain('davy');
      expect(conditions.$text.$search).to.contain('vida');
    });

    it('should not replace words not in dictionary', function() {
      expect(conditions.bar).to.be.ok;
      expect(conditions.bar).to.equal('baz');
    });
  });
});
