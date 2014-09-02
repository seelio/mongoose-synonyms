var expect = require('chai').expect;
var mongooseSynonyms = require('../lib/mongoose-synonyms');

var dictionary, conditions;
describe('Mongoose synonyms plugin', function() {
  describe('.prepareDictionary', function() {
    before(function() {
      dictionary = mongooseSynonyms.prepareDictionary('nicknames');
    });
    it('should load dictionary file', function() {
      expect(dictionary).to.be.ok;
    });
    it('should map words to synonyms', function() {
      expect(dictionary).to.contain.key('victor');
      expect(dictionary.victor).to.contain('victor');
      expect(dictionary.victor).to.contain('vick');
      expect(dictionary.victor).to.contain('vic');
    });
    it('should map synonyms to words', function() {
      expect(dictionary).to.contain.key('vic');
      expect(dictionary.vic).to.contain('victor');
      expect(dictionary.vic).to.contain('vick');
      expect(dictionary.vic).to.contain('vic');
    });
  });

  describe('.addSynonyms', function() {
    before(function(done) {
      var addSynonyms = mongooseSynonyms.addSynonyms(dictionary, ['firstName', 'alias', '$text.$search']);
      conditions = {
        firstName: 'victor',
        alias: { $in: ['victor', 'david'] },
        $text: { $search: 'victor david' }
      };
      addSynonyms(done, conditions);
    });
    it('should replace string queries', function() {
      expect(conditions.firstName).to.be.ok;
      expect(conditions.firstName).to.have.keys('$in');
      expect(conditions.firstName.$in).to.be.an.instanceOf(Array);
      expect(conditions.firstName.$in).to.contain('victor', 'vick', 'vic');
    });
    it('should replace array queries', function() {
      expect(conditions.alias).to.be.ok;
      expect(conditions.alias).to.have.keys('$in');
      expect(conditions.alias.$in).to.be.an.instanceOf(Array);
      expect(conditions.alias.$in).to.contain.members(['victor', 'vick', 'vic', 'david', 'dave', 'davy', 'vida']);
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
  });
});
