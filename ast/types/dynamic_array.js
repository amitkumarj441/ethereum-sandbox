var _ = require('lodash');
var async = require('async');
var util = require('../../util');

var DynamicArrayType = {
  is: function(typeName) {
    return /\[\] [\w ]+$/.test(typeName);
  },
  init: function(typeName, typeCreator, contract) {
    this.type = typeName;
    var parts = /^(.*)\[\] ([\w ]+)$/.exec(typeName);
    this.storageType = parts[2];
    var internalTypeName = parts[1];
    this.internal = typeCreator.create(internalTypeName, contract);
    return this;
  },
  retrieve: function(storage, hashDict, position) {
    var self = this;
    
    if (position.offset > 0) {
      util.inc(position.index);
      position.offset = 0;
    }

    var entry = _.find(storage, function(entry) {
      return entry.key.equals(position.index);
    });

    var value = [];
    if (entry) {
      var data = util.decodeRlp(entry.value);
      var len = (data.readUIntBE(0, data.length));
      var internalPosition = {
        index: util.sha3(position.index, 'binary'),
        offset: 0
      };

      value = _.times(len, function() {
        return self.internal.retrieve(storage, hashDict, internalPosition);
      });
    }
    
    util.inc(position.index);
    return value;
  },
  retrieveStack: function(stack, memory, index) {
    var self = this;
    var offset = stack[index].readUIntBE(0, stack[index].length);
    var length = Buffer.from(memory.slice(offset, offset + 32)).readUIntBE(0, 32);
    offset += 32;
    return _.times(length, function(i) {
      return self.internal.retrieveStack(
        [ Buffer.from(memory.slice(offset + i * 32, offset + i * 32 + 32)) ],
        memory,
        0
      );
    });
  }
};

module.exports = DynamicArrayType;
