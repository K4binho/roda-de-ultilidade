const {test}=require('node:test');const assert=require('node:assert/strict');
const {defaults,validate}=require('../src/config');
test('os quatro tamanhos são aceitos e configurações antigas continuam válidas',()=>{const c=defaults();for(const size of ['large','medium','small','compact']){c.wheelSize=size;assert.equal(validate(c).wheelSize,size);}delete c.wheelSize;assert.ok(validate(c));});
test('tamanho desconhecido e objeto no lugar do tamanho são rejeitados',()=>{const c=defaults();for(const size of ['tiny',null,{},700]){c.wheelSize=size;assert.throws(()=>validate(c));}});
