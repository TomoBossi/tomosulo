p5.disableFriendlyErrors = true;

const numRegisters = 16;
const numInstructions = 8;
const maxValue = 65535; // 0xFFFF

const bgColor = 0;
const tableBgColor = 15;
const tableLabelColor = 100;
const tableStrokeColor = 100;
const cdbStrokeColor = 100;
const titleColor = 150;
const tableTextColor = 150;
const tableTextDefaultColor = 50;

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

let inputField;
let buttonWidth;

let rsTag = 'A'; // Starter tag

let RAT;
let reg;
let inst;
let rsLSU;
let rsALU;

let memory = [];

let instructionLoadIndex = 0;

let resetButtonPos = {x: 0, y: 0};
let loadButtonPos = {x: 0, y: 0};
let stepButtonPos = {x: 0, y: 0};

function setup() {
  textFont('Courier New');
  smooth();
  
  s = min(windowWidth/525, 5); // Eyeballed

  tableOuterStrokeWidth = s;
  tableInnerStrokeWidth = s;
  tableInnerStrokeOpacity = 0.35;
  rowHeight = 10*s;
  labelTextSize = 5*s;
  rowLabelTextShift = -2*s;
  tableSeparation = 25*s;
  tablePaddingLeft = 12.5*s;
  tablePaddingTop = 15*s;
  cdbY = 2*tablePaddingTop + numRegisters*rowHeight;
  titleTextSize = 18.5*s;
  versionTextSize = 10*s;
  buttonWidth = 40*s;

  createCanvas(windowWidth, 3*tablePaddingTop + numRegisters*rowHeight);
  
  registerLabels = [];
  for (let i = 0; i < numRegisters; i++) {
    registerLabels.push('R' + i);
  }
  
  instructionLabels = [];
  for (let i = numInstructions; i > 0; i--) {
    instructionLabels.push(i);
  }
  
  initTables();

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
  inputField.placeholder = 'MOV R1, 0xB0CA\nMOV R2, 0xB0CA\nADD R3, R1, R2';
  inputField.style.backgroundColor = 'transparent'; // `rgb(${tableBgColor},${tableBgColor},${tableBgColor})`;
  inputField.style.color = `rgb(${titleColor},${titleColor},${titleColor})`;
  inputField.style.border = 'none'; // `${tableOuterStrokeWidth}px solid`;
  inputField.style.borderWidth = `${tableOuterStrokeWidth}px`;
  inputField.style.borderColor = `rgb(${tableLabelColor},${tableLabelColor},${tableLabelColor})`;
  inputField.style.outline = 'none';
  inputField.style.padding = 0.1*s;
  inputField.style.fontSize = `${4.8*s}px`;

  inputField.addEventListener('input', 
    () => {
      const lines = inputField.value.split('\n').map(line => line.substring(0, 'INST [RXX], [0xXXXX], [0xXXXX]'.length));
      inputField.value = lines.slice(0, numInstructions).join('\n');
      if (lines.length > numInstructions) {
        inputField.selectionStart = inputField.selectionEnd = inputField.value.length;
      }
    }
  );

  resetButtonPos = {x: tablePaddingLeft + tableSeparation + inst.width, y: tablePaddingTop};
  loadButtonPos = {x: resetButtonPos.x, y: tablePaddingTop + 2*rowHeight};
  stepButtonPos = {x: resetButtonPos.x, y: tablePaddingTop + 4*rowHeight};
}
  
function draw() {
  cursor('');
  background(bgColor);
  drawTitle();
  drawButton(resetButtonPos.x, resetButtonPos.y, 'RESET');
  drawButton(loadButtonPos.x, loadButtonPos.y, 'LOAD');
  drawButton(stepButtonPos.x, stepButtonPos.y, 'STEP', false);
  drawInstructionUnit();
  drawCDB();
  drawTable(RAT);
  drawTable(reg);
  drawTable(inst);
  drawTable(rsALU);
  drawTable(rsLSU);
  drawText();
}

function drawButton(x, y, label, connectLeft = true) {
  if (connectLeft) {
    setConfigTableRows(tableInnerStrokeWidth);
    stroke(tableStrokeColor, 255*tableInnerStrokeOpacity);
    line(x - tableSeparation, y + rowHeight/2, x, y + rowHeight/2);
  }
  setConfigTableRows(tableOuterStrokeWidth);
  if (mouseX > x && mouseX < x+buttonWidth && mouseY > y && mouseY < y + rowHeight) {
    stroke(titleColor);
    cursor('pointer');
  }
  rect(x, y, buttonWidth, rowHeight);
  setConfigLabels(labelTextSize, 'center');
  text(label, x + buttonWidth/2, y + rowHeight/2+0.5*s);
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
      text(table.rowLabels[i], table.pos.x+rowLabelTextShift, table.pos.y+(i+0.5)*rowHeight + 0.5*s);
    }
  }
  
  strokeWeight(tableInnerStrokeWidth);
  stroke(tableStrokeColor, 255*tableInnerStrokeOpacity);
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
      table.pos.x+table.width/2-(25-8.75)*s, table.pos.y + (table.rows+1)*rowHeight,
      table.pos.x+table.width/2+(25-8.75)*s, table.pos.y + (table.rows+1)*rowHeight,
      table.pos.x-1.5*s+table.width, table.pos.y + table.rows*rowHeight
    );
    rect(table.pos.x+table.width/2-(25-8.75)*s, table.pos.y+(table.rows+1)*rowHeight, 32.5*s, rowHeight);
    strokeWeight(tableInnerStrokeWidth);
    stroke(tableStrokeColor, 255*tableInnerStrokeOpacity);
    line(table.pos.x+table.width/2-(25-8.75)*s+10*s, table.pos.y+(table.rows+1)*rowHeight, table.pos.x+table.width/2-(25-8.75)*s+10*s, table.pos.y+(table.rows+2)*rowHeight);
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

function initTables() {
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
      width: 105*s,
      divs: [20*s, 30*s, 52.5*s, 62.5*s, 72.5*s, 95*s],
      columnLabels: ['Code', 'Tag', 'Op.1', 'V', 'Tag', 'Op.2', 'V'],
      rowLabels: [],
      initValue: {opcode: '', operands: [{tag: '~', value: 0, v: 0}, {tag: '~', value: 0, v: 0}]},
      values: [],
      outputValue: {tag: '', value: 0},
      outputLabel: 'ALU' // 'Arithmetic-Logic Unit'
    }, true, true
  );
  
  rsLSU = drawTable(
    {
      pos: {x: tablePaddingLeft + 2*tableSeparation + inst.width + rsALU.width, y: tablePaddingTop + rowHeight*(numRegisters-numInstructions)},
      rows: numInstructions-2,
      width: 105*s,
      divs: [20*s, 30*s, 52.5*s, 62.5*s, 72.5*s, 95*s],
      columnLabels: ['Code', 'Tag', 'Op.1', 'V', 'Tag', 'Op.2', 'V'],
      rowLabels: [],
      initValue: {opcode: '', operands: [{tag: '~', value: 0, v: 0}, {tag: '~', value: 0, v: 0}]},
      values: [],
      outputValue: {tag: '', value: 0},
      outputLabel: 'LSU' // 'Load-Store Unit'
    }, true, true
  );

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
}

function reset() {
  rsTag = 'A';
  initTables();
  instructionLoadIndex = 0;
  // inputField.value = '';
}

function load() {
  let loaded = instructionLoadIndex;
  let value = inputField.value;
  if (value === '') {
    value = inputField.placeholder;
  }
  for (let [i, instruction] of value.split('\n').map(line => line.toUpperCase()).entries()) {
    if (instructionLoadIndex < numInstructions) {
      inst.values[instructionLoadIndex].instruction = instruction;
      instructionLoadIndex++;
    }
  }
  loaded = instructionLoadIndex - loaded;
  inputField.value = value.split('\n').slice(loaded).join('\n');
}

function step() {
  console.log('TODO');
}

function mouseHover(pos, w, h) {
  return mouseX > pos.x && mouseX < pos.x + w && mouseY > pos.y && mouseY < pos.y + h;
}

function mouseClicked() {
  if (mouseHover(resetButtonPos, buttonWidth, rowHeight)) {
    reset();
  } else if (instructionLoadIndex < numInstructions && mouseHover(loadButtonPos, buttonWidth, rowHeight)) {
    load();
  }  else if (mouseHover(stepButtonPos, buttonWidth, rowHeight)) {
    step();
  }
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

function mov(v1, v2) {
  // TODO ???
}

function st(v1, v2) {
  memory[v1] = v2;
}

function ld(v1) {
  if (memory[v1] === undefined) {
    memory[v1] = floor(random(0, maxValue/8));
  }
  return memory[v1];
}

// Write data

function drawText() {
  drawTextRs(rsALU);
  drawTextRs(rsLSU);
  drawTextRAT();
  drawTextReg();
  drawTextInst();
}

function setConfigTableText() {
  strokeWeight(0);
  textAlign('left', 'center');
  textSize(labelTextSize);
}

function int2hex(value) {
  return '0x'+value.toString(16).padStart(4, '0');
}

function drawTextRs(rs) {
  setConfigTableText();
  for (let [i, value] of rs.values.entries()) {
    fill(tableTextColor);
    if (deepEqual(value, rs.initValue)) {
      fill(tableTextDefaultColor);
    }
    text(value.opcode, rs.pos.x + 2*s, rs.pos.y + (i+0.5)*rowHeight + 0.5*s);
    text(value.operands[0].tag, rs.pos.x + rs.divs[0] + 3.5*s, rs.pos.y + (i+0.5)*rowHeight + 0.5*s);
    text(int2hex(value.operands[0].value), rs.pos.x + rs.divs[1] + 2*s, rs.pos.y + (i+0.5)*rowHeight + 0.5*s);
    text(value.operands[0].v, rs.pos.x + rs.divs[2] + 3.5*s, rs.pos.y + (i+0.5)*rowHeight + 0.5*s);
    text(value.operands[1].tag, rs.pos.x + rs.divs[3] + 3.5*s, rs.pos.y + (i+0.5)*rowHeight + 0.5*s);
    text(int2hex(value.operands[1].value), rs.pos.x + rs.divs[4] + 2*s, rs.pos.y + (i+0.5)*rowHeight + 0.5*s);
    text(value.operands[1].v, rs.pos.x + rs.divs[5] + 3.5*s, rs.pos.y + (i+0.5)*rowHeight + 0.5*s);
  }
}

function drawTextRAT() {
  setConfigTableText();
  for (let [i, value] of RAT.values.entries()) {
    fill(tableTextColor);
    if (deepEqual(value, RAT.initValue)) {
      fill(tableTextDefaultColor);
    }
    text(value.tag, RAT.pos.x + 3.5*s, RAT.pos.y + (i+0.5)*rowHeight + 0.5*s);
    text(int2hex(value.value), RAT.pos.x + RAT.divs[0] + 2*s, RAT.pos.y + (i+0.5)*rowHeight + 0.5*s);
    text(value.v, RAT.pos.x + RAT.divs[1] + 3.5*s, RAT.pos.y + (i+0.5)*rowHeight + 0.5*s);
  }
}

function drawTextReg() {
  setConfigTableText();
  fill(tableTextColor);
  for (let [i, value] of reg.values.entries()) {
    text(int2hex(value.value), reg.pos.x + 2*s, reg.pos.y + (i+0.5)*rowHeight + 0.5*s);
  }
}

function drawTextInst() {
  setConfigTableText();
  fill(tableTextColor);
  for (let [i, value] of inst.values.entries()) {
    text(value.instruction, inst.pos.x + 2*s, inst.pos.y + numInstructions*rowHeight - (i+0.5)*rowHeight + 0.5*s);
  }
}

// https://stackoverflow.com/a/32922084
function deepEqual(x, y) {
  const ok = Object.keys, tx = typeof x, ty = typeof y;
  return x && y && tx === 'object' && tx === ty ? (
    ok(x).length === ok(y).length &&
      ok(x).every(key => deepEqual(x[key], y[key]))
  ) : (x === y);
}