const numRegisters = 16;
const numInstructions = 8;
const maxValue = 65535; // 0xFFFF

const bgColor = 0;
const tableBgColor = 15;
const tableLabelColor = 100;
const tableStrokeColor = 100;
const cdbStrokeColor = 100;
const titleColor = 150;

let s;

let tableOuterStrokeWidth;
let tableInnerStrokeWidth;
let rowHeight;
let labelTextSize;
let rowLabelTextShift;
let tableSeparation;
let tablePaddingLeft;
let tablePaddingTop;
let cdbY;
let titleTextSize;

let registerLabels;
let instructionLabels;

let rsTag = 'A'; // Starter tag

let RAT;
let reg;
let inst;
let rsLSU;
let rsALU;

let memory = [];

function setup() {
  textFont('Courier New');
  smooth();
  
  s = min(windowWidth/560, 5); // Eyeballed

  tableOuterStrokeWidth = 1*s;
  tableInnerStrokeWidth = 1*s/2;
  rowHeight = 10*s;
  labelTextSize = 5*s;
  rowLabelTextShift = -2*s;
  tableSeparation = 25*s;
  tablePaddingLeft = 15*s;
  tablePaddingTop = 15*s;
  cdbY = 2*tablePaddingTop + numRegisters*rowHeight;
  titleTextSize = 18.5*s;
  versionTextSize = 10*s;

  createCanvas(windowWidth, 3*tablePaddingTop + numRegisters*rowHeight);
  
  registerLabels = [];
  for (let i = 0; i < numRegisters; i++) {
    registerLabels.push('R' + i);
  }
  
  instructionLabels = [];
  for (let i = numInstructions; i > 0; i--) {
    instructionLabels.push(i);
  }
  
  inst = drawTable(
    {
      pos: {x: tablePaddingLeft, y: tablePaddingTop + rowHeight*(numRegisters-numInstructions)},
      rows: numInstructions,
      width: 90*s,
      divs: [90*s],
      columnLabels: ['Instruction Buffer'],
      rowLabels: instructionLabels,
      initValue: {instruction: ''},
      values: [],
      outputValue: {},
      outputLabel: ''
    }, false, true
  );
  
  rsALU = drawTable(
    {
      pos: {x: tablePaddingLeft + tableSeparation + inst.width, y: tablePaddingTop + rowHeight*(numRegisters-numInstructions)},
      rows: numInstructions-2,
      width: 120*s,
      divs: [20*s, 60*s, 70*s, 110*s],
      columnLabels: ['OpCode', 'Operand 1', 'V', 'Operand 2', 'V'],
      rowLabels: [],
      initValue: {opcode: '', operands: [{value: 0, v: 0}, {value: 0, v: 0}]},
      values: [],
      outputValue: {tag: '', value: 0},
      outputLabel: 'Arithmetic-Logic Unit'
    }, true, true
  );
  
  rsLSU = drawTable(
    {
      pos: {x: tablePaddingLeft + 2*tableSeparation + inst.width + rsALU.width, y: tablePaddingTop + rowHeight*(numRegisters-numInstructions)},
      rows: numInstructions-2,
      width: 120*s,
      divs: [20*s, 60*s, 70*s, 110*s],
      columnLabels: ['OpCode', 'Operand 1', 'V', 'Operand 2', 'V'],
      rowLabels: [],
      initValue: {opcode: '', operands: [{value: 0, v: 0}, {value: 0, v: 0}]},
      values: [],
      outputValue: {tag: '', value: 0},
      outputLabel: 'Load-Store Unit'
    }, true, true
  );
  
  // rsLSU = drawTable(
  //   {
  //     pos: {},
  //     rows: numInstructions,
  //     width: 70*s,
  //     divs: [20*s, 60*s],
  //     columnLabels: ['OpCode', 'Operand', 'V'],
  //     rowLabels: [],
  //     initValue: {opcode: '', operands: [{operand: 0, v: 0}]},
  //     values: [],
  //     outputValue: {},
  //     outputLabel: ''
  //   }, true, true
  // );

  RAT = drawTable(
    {
      pos: {x: tablePaddingLeft + 3*tableSeparation + inst.width + rsALU.width + rsLSU.width, y: tablePaddingTop},
      rows: numRegisters,
      width: 60*s,
      divs: [10*s, 50*s],
      columnLabels: ['Tag', 'Value', 'V'],
      rowLabels: registerLabels,
      initValue: {tag: '~', value: 0, v: 0},
      values: [],
      outputValue: {},
      outputLabel: ''
    }, false, true
  );
  
  reg = drawTable(
    {
      pos: {x: tablePaddingLeft + 4*tableSeparation + inst.width + rsALU.width + rsLSU.width + RAT.width, y: tablePaddingTop},
      rows: numRegisters,
      width: 40*s,
      divs: [40*s],
      columnLabels: ['Value'],
      rowLabels: registerLabels,
      initValue: {value: 0},
      values: [],
      outputValue: {},
      outputLabel: ''
    }, false, true
  );

  document.body.style.backgroundColor = `rgb(${bgColor},${bgColor},${bgColor})`;
  inputField = document.getElementById('textArea');
  inputField.style.position = 'absolute';
  inputField.style.width = `${inst.width-tableOuterStrokeWidth-2*s}px`;
  inputField.rows = numInstructions;
  inputField.style.left = `${tablePaddingLeft+s}px`;
  inputField.style.top = `${tablePaddingTop+s}px`;
  inputField.style.resize = 'none';
  inputField.style.overflow = 'hidden';
  inputField.style.fontFamily = 'monospace';
  inputField.style.zindex = 10;
  inputField.placeholder = 'MOV R1, 0xB0CA\nMOV R2, 0xB0CA\nADD R3, R1, R2'
  inputField.style.backgroundColor = `rgb(${tableBgColor},${tableBgColor},${tableBgColor})`;
  inputField.style.color = `rgb(${titleColor},${titleColor},${titleColor})`;
  inputField.style.border = 'none'; // `${tableOuterStrokeWidth}px solid`;
  inputField.style.borderWidth = `${tableOuterStrokeWidth}px`;
  inputField.style.borderColor = `rgb(${tableLabelColor},${tableLabelColor},${tableLabelColor})`;
  inputField.style.outline = 'none';
  inputField.style.padding = 0.1*s;
  inputField.style.fontSize = `${4.8*s}px`;

  document.getElementById('textArea').addEventListener('input', function () {
    const lines = this.value.split('\n').map(line => line.substring(0, 'INST [RXX], [0xXXXX], [0xXXXX]'.length));
    this.value = lines.slice(0, numInstructions).join('\n');
    if (lines.length > numInstructions) {
      this.selectionStart = this.selectionEnd = this.value.length;
    }
  });
}
  
function draw() {
  background(bgColor);
  drawTitle();
  drawInstructionUnit();
  drawCDB();
  drawTable(RAT);
  drawTable(reg);
  drawTable(inst);
  drawTable(rsALU);
  drawTable(rsLSU);
}

function drawInstructionUnit() {
  setConfigTableRows(tableOuterStrokeWidth);
  line(inst.pos.x + inst.width/2, tablePaddingTop, inst.pos.x + inst.width/2, inst.pos.y - rowHeight);
  rect(tablePaddingLeft, tablePaddingTop, inst.width, 56*s);
  setConfigLabels(labelTextSize, 'center');
  text('Instruction Unit', inst.pos.x+inst.width/2, tablePaddingTop-0.8*rowHeight/2);
}

function drawTitle() {
  strokeWeight(0);
  textStyle('bold');
  fill(titleColor);
  textSize(titleTextSize);
  textAlign('right', 'top');
  text('T0M0SUL0-16', rsLSU.pos.x + rsLSU.width, tablePaddingTop);
  textSize(versionTextSize);
  text('v0.0.0.1', rsLSU.pos.x + rsLSU.width, tablePaddingTop + titleTextSize);
}

function drawCDB() {
  setConfigTableRows(tableOuterStrokeWidth);
  line(inst.pos.x + inst.width/2, cdbY, reg.pos.x + reg.width/2, cdbY);
  for (let table of [rsALU, rsLSU, RAT, reg, inst]) {
    line(table.pos.x + table.width/2, cdbY, table.pos.x + table.width/2, cdbY - rowHeight*numInstructions/2 - tablePaddingTop);
  }
  setConfigLabels(labelTextSize, 'center');
  text('Common Data Bus', (inst.pos.x + inst.width/2) + ((reg.pos.x + reg.width/2)-(inst.pos.x + inst.width/2))/2, cdbY + labelTextSize);
}

function drawTable(table, tag = false, init = false) {
  for (let i = 0; i < table.rows; i++) {
    setConfigTableRows(tableOuterStrokeWidth);
    rect(table.pos.x, table.pos.y+i*rowHeight, table.width, rowHeight);
    setConfigLabels(labelTextSize, 'right');
    if (tag) {
      table.rowLabels.push(rsTag);
      rsTag = nextChar();
    }
    if (init) {
      table.values.push({...table.initValue}); // Shallow copy
    }
    if (table.rowLabels.length > i) {
      text(table.rowLabels[i], table.pos.x+rowLabelTextShift, table.pos.y+(i+0.5)*rowHeight);
    }
  }
  
  strokeWeight(tableInnerStrokeWidth);
  for (let x of table.divs) {
    line(table.pos.x+x, table.pos.y, table.pos.x+x, table.pos.y+rowHeight*table.rows);
  }
  
  setConfigLabels(labelTextSize, 'center');
  for (let [i, label] of table.columnLabels.entries()) {
    if (i == 0) {
      text(label, table.pos.x+(table.divs[i]/2), table.pos.y-rowHeight/2);
    } else if (i == table.columnLabels.length - 1) {
      text(label, table.pos.x+table.divs[i-1]+(table.width-table.divs[i-1])/2, table.pos.y-rowHeight/2);
    } else {
      text(label, table.pos.x+table.divs[i-1]+(table.divs[i]-table.divs[i-1])/2, table.pos.y-rowHeight/2);
    }
  }
  
  if (!(Object.entries(table.outputValue).length === 0)) {
    setConfigTableRows(tableOuterStrokeWidth);
    quad(
      table.pos.x+1.5*s, table.pos.y + table.rows*rowHeight,
      table.pos.x+table.width/2-25*s, table.pos.y + (table.rows+1)*rowHeight,
      table.pos.x+table.width/2+25*s, table.pos.y + (table.rows+1)*rowHeight,
      table.pos.x-1.5*s+table.width, table.pos.y + table.rows*rowHeight
    );
    rect(table.pos.x+table.width/2-25*s, table.pos.y+(table.rows+1)*rowHeight, 50*s, rowHeight);
    strokeWeight(tableInnerStrokeWidth);
    line(table.pos.x+table.width/2-25*s+10*s, table.pos.y+(table.rows+1)*rowHeight, table.pos.x+table.width/2-25*s+10*s, table.pos.y+(table.rows+2)*rowHeight);
    setConfigLabels(labelTextSize, 'center');
    text(table.outputLabel, table.pos.x+table.width/2, table.pos.y+(table.rows+0.5)*rowHeight);
  }

  return table;
}

function nextChar() {
  return String.fromCharCode(rsTag.charCodeAt() + 1);
}

function setConfigLabels(size, align) {
  strokeWeight(0);
  textStyle('bold');
  fill(tableLabelColor);
  textSize(size);
  textAlign(align, 'center');
}

function setConfigTableRows(w) {
  fill(tableBgColor);
  stroke(tableStrokeColor);
  strokeWeight(w);
}

// Instructions

function add(v1, v2) {
  return constrain(v1 + v2, 0, maxValue);
}

function sub(v1, v2) {
  return constrain(v1 - v2, 0, maxValue);
}

function mul(v1, v2) {
  return constrain(v1 * v2, 0, maxValue);
}

function store(v1, v2) {
  memory[v1] = v2;
}

function load(v1) {
  if (memory[v1] === undefined) {
    memory[v1] = floor(random(0, maxValue/8));
  }
  return memory[v1];
}