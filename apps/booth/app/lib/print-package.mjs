// Photo booth print-package rules used by the guest app and operator controls.
// Defaults match Friendly Party Rental's current customer-facing package.
export const DEFAULT_PRINT_PACKAGE = Object.freeze({
  includedPrints: 108,
  addOnPrints: 0,
  addOn54Price: 35,
  addOn108Price: 60,
  shotsPerSession: 4,
  copiesPerSession: 1,
  digitalEnabled: true,
  printingEnabled: true
});

const asInt=(value,fallback,min=0,max=10000)=>{
  const n=Number.parseInt(value,10);
  return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;
};

export function normalizePrintPackage(input={}){
  const source=input&&typeof input==='object'?input:{};
  return {
    includedPrints:asInt(source.includedPrints,DEFAULT_PRINT_PACKAGE.includedPrints),
    addOnPrints:asInt(source.addOnPrints,DEFAULT_PRINT_PACKAGE.addOnPrints),
    addOn54Price:asInt(source.addOn54Price,DEFAULT_PRINT_PACKAGE.addOn54Price),
    addOn108Price:asInt(source.addOn108Price,DEFAULT_PRINT_PACKAGE.addOn108Price),
    shotsPerSession:asInt(source.shotsPerSession,DEFAULT_PRINT_PACKAGE.shotsPerSession,3,4),
    copiesPerSession:asInt(source.copiesPerSession,DEFAULT_PRINT_PACKAGE.copiesPerSession,1,1),
    digitalEnabled:source.digitalEnabled!==false,
    printingEnabled:source.printingEnabled!==false
  };
}

export function printAllowance(settings){
  const s=normalizePrintPackage(settings);
  return s.includedPrints+s.addOnPrints;
}

export function printsRemaining(settings,used=0){
  return Math.max(0,printAllowance(settings)-asInt(used,0));
}

export function canPrint(settings,used=0,alreadyPrinted=false){
  const s=normalizePrintPackage(settings);
  return s.printingEnabled&&!alreadyPrinted&&printsRemaining(s,used)>0;
}

export function addPrintPack(settings,size){
  const s=normalizePrintPackage(settings);
  const amount=size===54?54:size===108?108:0;
  return {...s,addOnPrints:s.addOnPrints+amount};
}

export function packageSummary(settings,used=0){
  const s=normalizePrintPackage(settings);
  const allowance=printAllowance(s);
  const remaining=printsRemaining(s,used);
  return {allowance,remaining,used:Math.min(asInt(used,0),allowance),shotsPerSession:s.shotsPerSession,copiesPerSession:s.copiesPerSession};
}
