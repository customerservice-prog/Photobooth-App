import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_PRINT_PACKAGE,normalizePrintPackage,printAllowance,printsRemaining,canPrint,addPrintPack} from '../app/lib/print-package.mjs';

test('Friendly package defaults to 108 prints and four photos per session',()=>{
  const p=normalizePrintPackage();
  assert.equal(p.includedPrints,108);
  assert.equal(p.shotsPerSession,4);
  assert.equal(p.copiesPerSession,1);
});

test('54 and 108 print add-ons increase physical print allowance',()=>{
  let p=normalizePrintPackage();
  p=addPrintPack(p,54);
  assert.equal(printAllowance(p),162);
  p=addPrintPack(p,108);
  assert.equal(printAllowance(p),270);
});

test('digital usage does not affect physical print allowance',()=>{
  const p=normalizePrintPackage({includedPrints:108,addOnPrints:108});
  assert.equal(printsRemaining(p,17),199);
  assert.equal(canPrint(p,17,false),true);
});

test('a guest session cannot request a second physical copy',()=>{
  const p=normalizePrintPackage();
  assert.equal(canPrint(p,0,false),true);
  assert.equal(canPrint(p,0,true),false);
});

test('printing stops cleanly when the package allowance is exhausted',()=>{
  const p=normalizePrintPackage({includedPrints:108});
  assert.equal(printsRemaining(p,108),0);
  assert.equal(canPrint(p,108,false),false);
});
