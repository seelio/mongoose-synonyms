var expect = require('chai').expect;
var mongoose = require('mongoose');
var mongooseSynonyms = require('../lib/mongoose-synonyms');
var _ = require('underscore');

var schema, dictionary, conditions;
describe('Mongoose synonyms plugin', function() {
  before(function() {
    schema = mongoose.Schema({ firstName: String, description: String });
  });

  describe('without word stemming', function() {
    it('should add hooks to static schema methods', function() {
      expect(schema).to.not.contain.property('hook');
      mongooseSynonyms(schema, {
        dictionary: 'nicknames',
        fields: ['firstName']
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

      it('should load dictionary file from path', function() {
        var dict = mongooseSynonyms.prepareDictionary('universities', require('../dictionaries/universities.json'));
        expect(dict).to.be.ok;
        expect(dict).to.contain.keys(['university of michigan', 'umich', 'u of m']);
        var cached = mongooseSynonyms.prepareDictionary('universities');
        expect(cached).to.equal(dict);
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

  describe('with word stemming', function() {
    var pangram = {
      'quick': ['rapid', 'fast'],
      'jumps': ['hops', 'skips'],
      'over': ['above'],
      'lazy': ['idle', 'sluggish'],
      'dog': ['canine']
    };
    before(function() {
      mongooseSynonyms(schema, {
        dictionaryName: 'pangram',
        dictionary: pangram,
        stem: true
      });
    });

    it('should prepare a dictionary with stemmed keys', function() {
      var dict = mongooseSynonyms.prepareDictionary('pangram');
      expect(dict).to.contain.keys(['quick', 'rapid', 'fast', 'jump', 'hop', 'skip', 'ov', 'abov', 'lazy', 'idl', 'slug', 'dog', 'canin']);
    });

    it('should get synonms based on word stem', function(done) {
      var dict = mongooseSynonyms.prepareDictionary('pangram');
      var addSynonyms = mongooseSynonyms.addSynonyms(dict, ['$text.$search'], {stem: true});
      conditions = { $text: { $search: 'The rapidly hopping fox skipped over the idling dog.' } };
      addSynonyms(function() {
        expect(conditions).to.be.ok;
        expect(conditions.$text.$search).to.equal('The quick rapid fast jumps hops skips fox jumps hops skips over above the lazy idle sluggish dog.');
        done();
      }, conditions);
    });
  });

  describe('with key lookup only', function() {
    before(function() {
      dictionary = mongooseSynonyms.prepareDictionary('u10s', require('../dictionaries/universities.json'), {keyOnly: true});
    });

    it('should return only the matching key', function(done) {
      var addSynonyms = mongooseSynonyms.addSynonyms(dictionary, ['$text.$search'], {keyOnly: true});
      conditions = { $text: { $search: 'foo umich bar' } };
      addSynonyms(function() {
        expect(conditions).to.be.ok;
        expect(conditions.$text.$search).to.equal('foo University of Michigan bar');
        done();
      }, conditions);
    });
  });

  describe('with key lookup and quoted term', function() {
    before(function() {
      dictionary = mongooseSynonyms.prepareDictionary('u10s', require('../dictionaries/universities.json'), {keyOnly: true});
    });

    it('should return only the matching key surrounded by quotes', function(done) {
      var addSynonyms = mongooseSynonyms.addSynonyms(dictionary, ['$text.$search'], {keyOnly: true, quoteMatch: true});
      conditions = { $text: { $search: 'foo umich bar' } };
      addSynonyms(function() {
        expect(conditions).to.be.ok;
        expect(conditions.$text.$search).to.equal('foo "University of Michigan" bar');
        done();
      }, conditions);
    });
  });
});
