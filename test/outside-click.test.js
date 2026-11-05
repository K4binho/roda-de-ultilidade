const {test}=require('node:test'),assert=require('node:assert/strict');
const {isOutside}=require('../src/outside-click');
test('clique fora da janela e limites em monitor com origem negativa',()=>{
 const bounds={x:-1500,y:200,width:380,height:380};
 for(const point of [{x:-1501,y:300},{x:-1120,y:300},{x:-1300,y:199},{x:-1300,y:580}])assert.equal(isOutside(point,bounds),true);
 for(const point of [{x:-1500,y:200},{x:-1300,y:400},{x:-1121,y:579}])assert.equal(isOutside(point,bounds),false);
});
