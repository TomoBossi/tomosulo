p5.disableFriendlyErrors = true;

const numRegisters = 16;
const numInstructions = 8;
const maxValue = 65535; // 0xFFFF

const bgColor = 0;
const tableBgColor = 15;
const tableLabelColor = 100;
const tableStrokeColor = 100;
const cdbStrokeColor = 100;
const titleColor = 130;
const tableTextColor = 150;
const tableTextDefaultColor = 50;
const buttonHighlightColor = 200;

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
const maxCharsPerInstruction = 'INST [RXX], [0xXXXX], [0xXXXX]'.length;
let qsInstructionInput;

let resetButtonPos = {x: 0, y: 0};
let bufferButtonPos = {x: 0, y: 0};
let issueButtonPos = {x: 0, y: 0};
let executeButtonPos = {x: 0, y: 0};

function setup() {
  textFont('Courier New');
  smooth();
  
  s = min(windowWidth/432, 5); // Eyeballed

  tableOuterStrokeWidth = s;
  tableInnerStrokeWidth = s;
  tableInnerStrokeOpacity = 0.35;
  rowHeight = 10*s;
  labelTextSize = 5*s;
  rowLabelTextShift = -2*s;
  tableSeparation = 20*s;
  tablePaddingLeft = 12.5*s;
  tablePaddingTop = 12.5*s;
  cdbY = 1.75*tablePaddingTop + numRegisters*rowHeight;
  titleTextSize = 12.5*s;
  versionTextSize = 6*s;
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
  inputField.placeholder = 'LDR R1, [R0]\n' +
    'MOV R3, 0x0042\n' +
    'MUL R5, R1, R2\n' +
    'ADD R3, R1, R5\n' +
    'SUB R3, R3, R2\n' +
    'AND R6, R3, R5\n' +
    'OR R7, R6, R3\n' +
    'MUL R3, R7, R2';
  inputField.style.backgroundColor = 'transparent'; // `rgb(${tableBgColor},${tableBgColor},${tableBgColor})`;
  inputField.style.color = `rgb(${titleColor},${titleColor},${titleColor})`;
  inputField.style.border = 'none'; // `${tableOuterStrokeWidth}px solid`;
  inputField.style.borderWidth = `${tableOuterStrokeWidth}px`;
  inputField.style.borderColor = `rgb(${tableLabelColor},${tableLabelColor},${tableLabelColor})`;
  inputField.style.outline = 'none';
  inputField.style.padding = 0.1*s;
  inputField.style.fontSize = `${5*s}px`;

  inputField.addEventListener('input', 
    () => {
      const lines = inputField.value.split('\n').map(line => line.substring(0, maxCharsPerInstruction));
      inputField.value = lines.slice(0, numInstructions).join('\n');
      if (lines.length > numInstructions) {
        inputField.selectionStart = inputField.selectionEnd = inputField.value.length;
      }
    }
  );

  qsInstructionInput = parseQsParams();
  if (!(qsInstructionInput.length === 1 && qsInstructionInput[0] === '')) {
    inputField.placeholder = '';
    inputField.value = qsInstructionInput.join('\n');
    buffer();
  }

  resetButtonPos = {x: tablePaddingLeft + tableSeparation + inst.width, y: tablePaddingTop};
  bufferButtonPos = {x: resetButtonPos.x, y: tablePaddingTop + 1.2*rowHeight};
  issueButtonPos = {x: resetButtonPos.x, y: tablePaddingTop + 3.7*rowHeight};
  executeButtonPos = {x: resetButtonPos.x, y: tablePaddingTop + 4.9*rowHeight};
}
  
function draw() {
  cursor('');
  background(bgColor);
  drawTitleCard();
  drawButton(resetButtonPos.x, resetButtonPos.y, 'RESET');
  drawButton(bufferButtonPos.x, bufferButtonPos.y, 'BUFFER');
  drawButton(issueButtonPos.x, issueButtonPos.y, 'ISSUE', false);
  drawButton(executeButtonPos.x, executeButtonPos.y, 'EXECUTE', false);
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
    stroke(buttonHighlightColor);
    cursor('pointer');
  }
  rect(x, y, buttonWidth, rowHeight);
  setConfigLabels(labelTextSize, 'center');
  text(label, x + buttonWidth/2, y + rowHeight/2+0.5*s);
}

function drawInstructionUnit() {
  setConfigTableRows(tableOuterStrokeWidth);
  line(inst.pos.x + inst.width/2, tablePaddingTop, inst.pos.x + inst.width/2, inst.pos.y - rowHeight);
  rect(tablePaddingLeft, tablePaddingTop, inst.width, 59*s);
  setConfigLabels(labelTextSize, 'center');
  text('Instruction Unit', inst.pos.x+inst.width/2, tablePaddingTop-0.8*rowHeight/2);
}

function drawTitleCard() {
  strokeWeight(tableInnerStrokeWidth);
  stroke(tableStrokeColor, 255*tableInnerStrokeOpacity);
  fill(bgColor);
  rect(rsALU.pos.x + buttonWidth + tableSeparation, tablePaddingTop, rsALU.width + rsLSU.width - buttonWidth, 59*s)
  strokeWeight(0);
  textStyle('bold');
  fill(titleColor);
  textSize(titleTextSize);
  textAlign('left', 'top');
  text('T0M0SUL0-16', rsALU.pos.x + buttonWidth + tableSeparation + 3*s, tablePaddingTop + 3*s);
  textSize(versionTextSize);
  text('v0.0.0.1', rsALU.pos.x + buttonWidth + tableSeparation + 3*s, tablePaddingTop + titleTextSize + 3*s);
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
      table.pos.x+3*s, table.pos.y + table.rows*rowHeight,
      table.pos.x+table.width/2-(25-8.75)*s, table.pos.y + (table.rows+1)*rowHeight,
      table.pos.x+table.width/2+(25-8.75)*s, table.pos.y + (table.rows+1)*rowHeight,
      table.pos.x-3*s+table.width, table.pos.y + table.rows*rowHeight
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
      width: 94*s,
      divs: [94*s],
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
      width: 62.5*s,
      divs: [20*s, 30*s, 52.5*s],
      columnLabels: ['Code', 'Tag', 'Op.1', 'V'],
      rowLabels: [],
      initValue: {opcode: '', operands: [{tag: '~', value: 0, v: 0}]},
      values: [],
      outputValue: {tag: '', value: 0},
      outputLabel: 'LSU' // 'Load-Store Unit'
    }, true, true
  );

  RAT = drawTable(
    {
      pos: {x: tablePaddingLeft + 3*tableSeparation + inst.width + rsALU.width + rsLSU.width, y: tablePaddingTop},
      rows: numRegisters,
      width: 42.5*s,
      divs: [10*s, 32.5*s],
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
      width: 22.5*s,
      divs: [22.5*s],
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

function buffer() {
  let buffered = instructionLoadIndex;
  let value = inputField.value;
  if (value === '') {
    value = inputField.placeholder;
  }
  for (let [i, instruction] of value.split('\n').map(line => line.toUpperCase()).filter(line => line.trim() !== '').entries()) {
    if (instructionLoadIndex < numInstructions) {
      inst.values[instructionLoadIndex].instruction = parseInstruction(instruction);
      instructionLoadIndex++;
    }
  }
  buffered = instructionLoadIndex - buffered;
  inputField.value = value.split('\n').filter(line => line.trim() !== '').slice(buffered).join('\n');
  if (inputField.value === '') {
    inputField.placeholder = '';
  }
  if (buffered !== 0) {
    window.history.pushState(null, "", '?instructions=' + inst.values.filter(value => value.instruction !== '').map(value => value.instruction).join('|'));
  }
}

function issue() {
  console.log('TODO');
}

function execute() {
  console.log('TODO');
}

function mouseHover(pos, w, h) {
  return mouseX > pos.x && mouseX < pos.x + w && mouseY > pos.y && mouseY < pos.y + h;
}

function mouseClicked() {
  if (mouseHover(resetButtonPos, buttonWidth, rowHeight)) {
    reset();
  } else if (instructionLoadIndex < numInstructions && mouseHover(bufferButtonPos, buttonWidth, rowHeight)) {
    buffer();
  }  else if (mouseHover(issueButtonPos, buttonWidth, rowHeight)) {
    issue();
  } else if (mouseHover(executeButtonPos, buttonWidth, rowHeight)) {
    execute();
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
    if (value.operands.length > 1) {
      text(value.operands[1].tag, rs.pos.x + rs.divs[3] + 3.5*s, rs.pos.y + (i+0.5)*rowHeight + 0.5*s);
      text(int2hex(value.operands[1].value), rs.pos.x + rs.divs[4] + 2*s, rs.pos.y + (i+0.5)*rowHeight + 0.5*s);
      text(value.operands[1].v, rs.pos.x + rs.divs[5] + 3.5*s, rs.pos.y + (i+0.5)*rowHeight + 0.5*s);
    }
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

function parseQsParams() {
  let params = new URLSearchParams(window.location.href.split('?').pop());
  let instructions = '';
  if (params.has('instructions')) {
    instructions = params.get('instructions')
  }
  return instructions.split('|').slice(0, numInstructions*2).map(line => line.slice(0, maxCharsPerInstruction));
}

function parseInstruction(instruction) {
  
  return instruction;
}