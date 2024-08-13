p5.disableFriendlyErrors = true;

const numRegisters = 16;
const numInstructions = 8;
const maxValue = 65535; // 0xFFFF, 16-bits

const supportedInstructionsMap = {
  ADD: {fn: add, numArgs: 2, rs: 'ALU'},
  SUB: {fn: sub, numArgs: 2, rs: 'ALU'},
  MUL: {fn: mul, numArgs: 2, rs: 'ALU'},
  AND: {fn: and, numArgs: 2, rs: 'ALU'},
  OR:  {fn: or,  numArgs: 2, rs: 'ALU'},
  MOV: {fn: () => {}, numArgs: 1, rs: 'LSU'},
  LDR: {fn: ld, numArgs: 1, rs: 'LSU'},
  // STR: {fn: st, numArgs: 1, rs: 'LSU'}
};

let darkMode = true;
let bgColor = 0;
let tableBgColor = 15;
let tableLabelColor = 100;
let tableStrokeColor = 100;
let cdbStrokeColor = 100;
let titleColor = 130;
let tableTextColor = 150;
let tableTextDefaultColor = 50;
let buttonHighlightColor = 200;
let secondaryStrokeColor = 35;

let s;

let tableOuterStrokeWidth;
let tableInnerStrokeWidth;
let buttonWidth;
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
let logsText;
let logsTitle;

let rsTag = 'A'; // Starter tag

let rat;
let reg;
let inst;
let rsLSU;
let rsALU;

let memory = [];

let instructionLoadIndex = 0;
const maxCharsPerInstruction = 'INS [0xXXXX], [0xXXXX], [0xXXXX]'.length;
let qsInstructionInput;
let lastIssued = '';
let logs = '';

let resetButtonPos = {x: 0, y: 0};
let enqueueButtonPos = {x: 0, y: 0};
let issueButtonPos = {x: 0, y: 0};
let executeButtonPos = {x: 0, y: 0};
let lastIssuedButton = {x: 0, y: 0, w: 0};
let switchPos;
let switchSize;

function setup() {
  textFont('Courier New');
  smooth();
  
  s = windowWidth/424; // Eyeballed (praise the lord :praying-hands-emoji:)

  tableOuterStrokeWidth = s;
  tableInnerStrokeWidth = s;
  tableInnerStrokeOpacity = 0.35;
  rowHeight = 10*s;
  labelTextSize = 4.8*s;
  tableInnerTextSize = 5*s;
  rowLabelTextShift = -2*s;
  tableSeparation = 20*s;
  tablePaddingLeft = 12.5*s;
  tablePaddingTop = 12.5*s;
  cdbY = 1.75*tablePaddingTop + numRegisters*rowHeight;
  titleTextSize = 12.15*s;
  versionTextSize = 4.4*s;
  buttonWidth = 40*s;

  createCanvas(windowWidth*0.977, 2.5*tablePaddingTop + numRegisters*rowHeight);
  
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
    'SUB R3, [R3], R5\n' +
    'AND R6, R3, R5\n' +
    'MOV R7, R6\n' +
    'MUL R3, R7, 0xFAFA';
  inputField.style.backgroundColor = 'transparent'; // `rgb(${tableBgColor},${tableBgColor},${tableBgColor})`;
  inputField.style.color = `rgb(${titleColor},${titleColor},${titleColor})`;
  inputField.style.border = 'none'; // `${tableOuterStrokeWidth}px solid`;
  inputField.style.borderWidth = `${tableOuterStrokeWidth}px`;
  inputField.style.borderColor = `rgb(${tableLabelColor},${tableLabelColor},${tableLabelColor})`;
  inputField.style.outline = 'none';
  inputField.style.padding = 0.1*s;
  inputField.style.fontSize = `${5*s}px`;
  inputField.style.lineHeight = `${6.9*s}px`;

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
    enqueue();
  }

  resetButtonPos = {x: tablePaddingLeft + tableSeparation + inst.width, y: tablePaddingTop};
  enqueueButtonPos = {x: resetButtonPos.x, y: tablePaddingTop + 1.2*rowHeight};
  issueButtonPos = {x: resetButtonPos.x, y: tablePaddingTop + 4.9*rowHeight}; // 3.7*rowHeight};
  // executeButtonPos = {x: resetButtonPos.x, y: tablePaddingTop + 4.9*rowHeight};
  lastIssuedButton = {x: issueButtonPos.x + buttonWidth + tableSeparation, y: issueButtonPos.y, w: 16*s};

  switchPos = 6.5*s;
  switchSize = 12*s;

  logsTitle = document.getElementById('logsTitle');
  logsText = document.getElementById('logs');
  logsTitle.style.fontFamily = 'monospace';
  logsTitle.style.color = `rgb(${titleColor},${titleColor},${titleColor})`;
  logsTitle.style.position = 'absolute';
  logsTitle.style.top = `${height-21.75*s}px`;
  logsTitle.style.left = `${tablePaddingLeft}px`;
  logsTitle.style.fontSize = `${4.5*s}px`;
  logsText.style.fontFamily = 'monospace';
  logsText.style.color = `rgb(${titleColor},${titleColor},${titleColor})`;
  logsText.style.position = 'absolute';
  logsText.style.top = `${height-14*s}px`;
  logsText.style.left = `${tablePaddingLeft-0.5*s}px`;
  logsText.style.fontSize = `${3.5*s}px`;
  logsText.style.lineHeight = `${4.5*s}px`;
}
  
function draw() {
  cursor('');
  background(bgColor);
  drawButton(resetButtonPos.x, resetButtonPos.y, 'RESET', true, false);
  drawButton(enqueueButtonPos.x, enqueueButtonPos.y, 'ENQUEUE', true, false);
  drawButton(issueButtonPos.x, issueButtonPos.y, 'ISSUE', false, true);
  // drawButton(executeButtonPos.x, executeButtonPos.y, 'EXECUTE', false, false);
  drawInstructionUnit();
  drawCDB();
  drawTable(rat);
  drawTable(reg);
  drawTable(inst);
  drawTable(rsALU);
  drawTable(rsLSU);
  drawText();
  drawTitleCard();
  drawLastIssued();
  drawToggleButton();
  highlightPersistent();
}

function highlightPersistent() {
  if (mouseHover(lastIssuedButton, lastIssuedButton.w, rowHeight)) {
    for (let table of [rsALU, rsLSU, inst, rat, reg]) {
      for (let [i, highlight] of table.highlightPersistent.entries()) {
        if (highlight === 1) {
          table.highlight[i] = 0.65;
        }
      }
    }
    setConfigTableRows(tableOuterStrokeWidth);
    noFill();
    rect(lastIssuedButton.x, lastIssuedButton.y, lastIssuedButton.w, rowHeight);
  }
}

function drawToggleButton() {
  let hover = false;
  if (mouseHover({x: switchPos - switchSize/4, y: switchPos - switchSize/4}, switchSize/2, switchSize/2)) {
    hover = true;
    cursor('pointer');
  }
  if (darkMode) {
    for (let i = 0; i < 4; i++) {
      push();
      translate(switchPos, switchPos);
      rotate(i*PI/4);
      stroke(hover ? 255-bgColor : tableTextDefaultColor);
      strokeWeight(0.9*s);
      line(-switchSize/4, 0, switchSize/4, 0);
      pop();
    }
    fill(bgColor);
    ellipse(switchPos, switchPos, switchSize/2.3);
  } 
  fill(hover ? 255-bgColor : tableTextDefaultColor);
  noStroke();
  ellipse(switchPos, switchPos, switchSize/3);
  fill(bgColor);
  if (!darkMode) {
    ellipse(switchPos+switchSize/12, switchPos, switchSize*0.6/3);
  } else {
    ellipse(switchPos, switchPos, switchSize*0.6/3);
  }
}

function updateColors() {
  bgColor = darkMode ? 0 : 255;
  document.body.style.backgroundColor = `rgb(${bgColor},${bgColor},${bgColor})`;
  tableBgColor = darkMode ? 15 : 240;
  tableLabelColor = darkMode ? 100 : 130;
  tableStrokeColor = darkMode ? 100 : 120;
  cdbStrokeColor = darkMode ? 100 : 100;
  titleColor = darkMode ? 130 : 80;
  document.getElementById('textArea').style.color = `rgb(${titleColor},${titleColor},${titleColor})`;
  document.getElementById('logs').style.color = `rgb(${titleColor},${titleColor},${titleColor})`;
  document.getElementById('logsTitle').style.color = `rgb(${titleColor},${titleColor},${titleColor})`;
  tableTextColor = darkMode ? 150 : 50;
  tableTextDefaultColor = darkMode ? 50 : 200;
  buttonHighlightColor = darkMode ? 200 : 200;
  secondaryStrokeColor = darkMode ? 35 : 200;
}

function updateLogs(log) {
  logs += log + '\n';
  document.getElementById('logs').innerHTML = logs;
}

function drawButton(x, y, label, connectLeft = true, connectRight = true) {
  if (connectLeft || connectRight) {
    setConfigTableRows(tableInnerStrokeWidth);
    stroke(tableStrokeColor, 255*tableInnerStrokeOpacity);
    if (connectLeft) {
      line(x - tableSeparation, y + rowHeight/2, x, y + rowHeight/2);
    } if (connectRight) {
      line(x + buttonWidth, y + rowHeight/2, x + buttonWidth + tableSeparation, y + rowHeight/2);
    }
  }
  setConfigTableRows(tableOuterStrokeWidth);
  if (label !== 'EXECUTE' && mouseHover({x: x, y: y}, buttonWidth, rowHeight)) {
    stroke(buttonHighlightColor);
    cursor('pointer');
  }
  if (label === 'EXECUTE') {stroke(50);}
  rect(x, y, buttonWidth, rowHeight);
  setConfigLabels(labelTextSize, 'center');
  if (label === 'EXECUTE') {fill(50);}
  text(label, x + buttonWidth/2, y + rowHeight/2+0.5*s);
}

function drawInstructionUnit() {
  setConfigTableRows(tableOuterStrokeWidth);
  line(inst.pos.x + inst.width/2, tablePaddingTop, inst.pos.x + inst.width/2, inst.pos.y - 0.95*rowHeight);
  rect(tablePaddingLeft, tablePaddingTop, inst.width, 59*s);
  setConfigLabels(labelTextSize, 'center');
  text('Instruction Unit', inst.pos.x+inst.width/2, tablePaddingTop-0.8*rowHeight/2);
}

function drawTitleCard() {
  strokeWeight(tableInnerStrokeWidth);
  stroke(secondaryStrokeColor);
  fill(bgColor);
  rect(rsALU.pos.x + buttonWidth + tableSeparation, tablePaddingTop, rsALU.width + rsLSU.width - buttonWidth, 47*s);
  strokeWeight(0);
  textStyle('bold');
  fill(titleColor);
  textSize(titleTextSize);
  textAlign('left', 'top');
  text('T0M0SUL0-16', rsALU.pos.x + buttonWidth + tableSeparation + 3*s, tablePaddingTop + 3*s);
  textSize(versionTextSize);
  text('v0.0.0.0.1 - Cannot be trusted', rsALU.pos.x + buttonWidth + tableSeparation + 3*s, tablePaddingTop + titleTextSize + 3*s);
  textSize(versionTextSize*0.78);
  const yOffset = 12*s;
  text('Features:', rsALU.pos.x + buttonWidth + tableSeparation + 3*s, tablePaddingTop + titleTextSize + yOffset);
  text('- Read-only Memory (REAL safety for REAL programmers)', rsALU.pos.x + buttonWidth + tableSeparation + 3*s, tablePaddingTop + titleTextSize + yOffset + 5*s);
  text('- 16 whole 16-bit Registers', rsALU.pos.x + buttonWidth + tableSeparation + 3*s, tablePaddingTop + titleTextSize + yOffset + 9*s);
  text('- Supports ADD, SUB, MUL, AND, OR, MOV, LDR (kind of)', rsALU.pos.x + buttonWidth + tableSeparation + 3*s, tablePaddingTop + titleTextSize + yOffset + 13*s);
  text('- Reading from Memory auto-generates LDR instructions', rsALU.pos.x + buttonWidth + tableSeparation + 3*s, tablePaddingTop + titleTextSize + yOffset + 17*s);
}

function drawLastIssued() {
  setConfigTableRows(tableOuterStrokeWidth);
  stroke(secondaryStrokeColor);
  rect(lastIssuedButton.x, lastIssuedButton.y, rsALU.width + rsLSU.width - buttonWidth, rowHeight);
  line(lastIssuedButton.x + lastIssuedButton.w, lastIssuedButton.y, issueButtonPos.x + buttonWidth + tableSeparation + 16*s, issueButtonPos.y + rowHeight);
  setConfigLabels(labelTextSize, 'left');
  text('LAST', lastIssuedButton.x + 2.5*s, lastIssuedButton.y + rowHeight/2 + 0.5*s);
  fill(titleColor);
  text(lastIssued, issueButtonPos.x + buttonWidth + tableSeparation + 18.2*s, issueButtonPos.y + rowHeight/2 + 0.5*s);
}

function drawCDB() {
  setConfigTableRows(tableOuterStrokeWidth);
  line(inst.pos.x + inst.width/2, cdbY, reg.pos.x + reg.width/2, cdbY);
  for (let table of [rsALU, rsLSU, rat, reg, inst]) {
    line(table.pos.x + table.width/2, cdbY, table.pos.x + table.width/2, cdbY - rowHeight*numInstructions/2 - tablePaddingTop);
  }
  setConfigLabels(labelTextSize, 'center');
  text('Common Data Bus', (inst.pos.x + inst.width/2) + ((reg.pos.x + reg.width/2)-(inst.pos.x + inst.width/2))/2, cdbY + labelTextSize);
}

function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj)); // Deep Copy
}

function drawTable(table, tag = false, init = false) {
  let highlightProportion;
  let highlightColor;
  let newHighlightColor;
  for (let i = 0; i < table.rows; i++) {
    setConfigTableRows(tableOuterStrokeWidth);
    rect(table.pos.x, table.pos.y+i*rowHeight, table.width, rowHeight);
    setConfigLabels(labelTextSize, 'right');
    if (tag) {
      table.rowLabels.push(rsTag);
      rsTag = nextChar();
    }
    if (init) {
      table.values.push(deepCopy(table.initValue));
    }
    if (i < table.rowLabels.length) {
      highlightColor = tableLabelColor + (darkMode ? 255-tableLabelColor : -tableLabelColor)*table.highlight[i];
      fill(highlightColor);
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
      text(label, table.pos.x+(table.divs[i]/2), table.pos.y-0.8*rowHeight/2);
    } else if (i == table.columnLabels.length - 1) {
      text(label, table.pos.x+table.divs[i-1]+(table.width-table.divs[i-1])/2, table.pos.y-0.8*rowHeight/2);
    } else {
      text(label, table.pos.x+table.divs[i-1]+(table.divs[i]-table.divs[i-1])/2, table.pos.y-0.8*rowHeight/2);
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
    setConfigLabels(labelTextSize*0.9, 'center');
    text(table.outputLabel, table.pos.x+table.width/2, table.pos.y+(table.rows+0.5)*rowHeight);
  }

  for (let i = 0; i < table.rows; i++) {
    highlightProportion = lerp(table.highlight[i], 0, 0.025);
    newHighlightColor = tableLabelColor + (darkMode ? 255-tableLabelColor : -tableLabelColor)*table.highlight[i];
    setConfigTableRows(0.65*tableOuterStrokeWidth+2*tableOuterStrokeWidth*highlightProportion);
    stroke(newHighlightColor);
    noFill();
    if (table.highlight[i] > 0.01 && (i == 0 || (i > 0 && darkMode ? newHighlightColor >= highlightColor : newHighlightColor <= highlightColor))) {
      rect(table.pos.x, table.pos.y+i*rowHeight, table.width, rowHeight);
    }
    table.highlight[i] = highlightProportion;
    highlightColor = newHighlightColor;
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
      width: 100*s,
      divs: [100*s],
      columnLabels: ['Instruction Queue'],
      rowLabels: instructionLabels,
      initValue: {instruction: ''},
      values: [],
      highlight: Array(numInstructions).fill(0),
      highlightPersistent: Array(numInstructions).fill(0),
      outputValue: {},
      outputLabel: ''
    }, false, true
  );
  
  rsALU = drawTable(
    {
      pos: {x: tablePaddingLeft + tableSeparation + inst.width, y: tablePaddingTop + rowHeight*(numRegisters-numInstructions)},
      rows: numInstructions-2,
      width: 98.5*s,
      divs: [13.5*s, 23.5*s, 46*s, 56*s, 66*s, 88.5*s],
      columnLabels: ['Code', 'Tag', 'Op.1', 'V', 'Tag', 'Op.2', 'V'],
      rowLabels: [],
      initValue: {opcode: '', operands: [{tag: '', value: 0, v: 0}, {tag: '', value: 0, v: 0}]},
      values: [],
      free: Array(numInstructions-2).fill(true),
      highlight: Array(numInstructions-2).fill(0),
      highlightPersistent: Array(numInstructions-2).fill(0),
      outputValue: {tag: '', value: 0},
      outputLabel: 'Arithmetic-Logic' // 'Arithmetic-Logic Unit'
    }, true, true
  );
  
  rsLSU = drawTable(
    {
      pos: {x: tablePaddingLeft + 2*tableSeparation + inst.width + rsALU.width, y: tablePaddingTop + rowHeight*(numRegisters-numInstructions)},
      rows: numInstructions-2,
      width: 56*s,
      divs: [13.5*s, 23.5*s, 46*s],
      columnLabels: ['Code', 'Tag', 'Op.1', 'V'],
      rowLabels: [],
      initValue: {opcode: '', operands: [{tag: '', value: 0, v: 0}]},
      values: [],
      free: Array(numInstructions-2).fill(true),
      highlight: Array(numInstructions-2).fill(0),
      highlightPersistent: Array(numInstructions-2).fill(0),
      outputValue: {tag: '', value: 0},
      outputLabel: 'Load' // 'Load-Store Unit'
    }, true, true
  );

  rat = drawTable(
    {
      pos: {x: tablePaddingLeft + 3*tableSeparation + inst.width + rsALU.width + rsLSU.width, y: tablePaddingTop},
      rows: numRegisters,
      width: 42.5*s,
      divs: [10*s, 32.5*s],
      columnLabels: ['Tag', 'Value', 'V'],
      rowLabels: registerLabels,
      initValue: {tag: '', value: 0, v: 0},
      values: [],
      highlight: Array(numRegisters).fill(0),
      highlightPersistent: Array(numRegisters).fill(0),
      outputValue: {},
      outputLabel: ''
    }, false, true
  );
  
  reg = drawTable(
    {
      pos: {x: tablePaddingLeft + 4*tableSeparation + inst.width + rsALU.width + rsLSU.width + rat.width, y: tablePaddingTop},
      rows: numRegisters,
      width: 22.5*s,
      divs: [22.5*s],
      columnLabels: ['Value'],
      rowLabels: registerLabels,
      initValue: {value: 0},
      values: [],
      highlight: Array(numRegisters).fill(0),
      highlightPersistent: Array(numRegisters).fill(0),
      outputValue: {},
      outputLabel: ''
    }, false, true
  );
}

function reset() {
  rsTag = 'A';
  initTables();
  instructionLoadIndex = 0;
  lastIssued = '';
  updateLogs('[RESET] ...');
  // inputField.value = '';
  // window.history.replaceState(null, '', '/');
}

function enqueue() {
  let enqueued = instructionLoadIndex;
  let value = inputField.value;
  if (value === '') {
    value = inputField.placeholder;
  }

  value = value.split('\n').filter(line => line.trim() !== '').map(line => formatInstructionDisplay(line));
  if (value.includes('')) {
    window.alert('Invalid or unsupported instruction(s) or operand(s)');
    return;
  }

  for (let instruction of value) {
    if (instructionLoadIndex < numInstructions) {
      inst.values[instructionLoadIndex].instruction = instruction;
      instructionLoadIndex++;
    }
  }
  
  enqueued = instructionLoadIndex - enqueued;
  inputField.value = value.slice(enqueued).join('\n');
  
  if (inputField.value === '') {
    inputField.placeholder = '';
  }

  if (enqueued !== 0) {
    let registerValues = '';
    for (let i = 0; i < numRegisters; i++) {
      if (reg.values[i].value !== 0) {
        if (registerValues === '') {
          registerValues += '?R'+i+'='+int2hex(reg.values[i].value);
        } else {
          registerValues += '&R'+i+'='+int2hex(reg.values[i].value);
        }
      }
    }
    let instructions = '?instructions=';
    if (registerValues !== '') {
      instructions = '&instructions=';
    }
    instructions += inst.values.filter(value => value.instruction !== '').map(value => value.instruction).join('|');
    window.history.replaceState(null, '', registerValues + instructions);
    updateLogs('[QUEUE] ...');
  }
}

function issue() {
  let instruction = inst.values[0].instruction;
  if (instruction !== inst.initValue.instruction) {
    let tokens = instruction.split(', ');
    tokens = tokens[0].split(' ').concat(tokens.slice(1));
  
    // Check that issuing is possible
    const freeALUentries = rsALU.free.filter(e => e === true).length;
    const freeLSUentries = rsLSU.free.filter(e => e === true).length;
    const requiredALUentries = supportedInstructionsMap[tokens[0]].rs === 'ALU' ? 1 : 0;
    const requiredLSUentries = tokens.slice(1).filter(e => e[0] === '[').length;
    if (freeALUentries >= requiredALUentries && freeLSUentries >= requiredLSUentries) {
      // Delete previous persistent highlights
      rsALU.highlightPersistent = rsALU.highlightPersistent.map(() => 0);
      rsLSU.highlightPersistent = rsALU.highlightPersistent.map(() => 0);
      inst.highlightPersistent = rsALU.highlightPersistent.map(() => 0);
      rat.highlightPersistent = rsALU.highlightPersistent.map(() => 0);
      reg.highlightPersistent = rsALU.highlightPersistent.map(() => 0);
      // Parse instruction
      if (supportedInstructionsMap[tokens[0]].rs === 'LSU') { // tokens[0] === 'MOV'
        issueMov(tokens); // MOV is treated as a special case
      } else {
        // Parse operands & destination
        let tag = '';
        let indexOfNextFreeRsEntry;
        let indexOfNextFreeOutputRsEntry;
        let indexOfReg;
        for (let [i, operand] of tokens.slice(2).entries()) {
          
          if (i === 0) {
            indexOfNextFreeOutputRsEntry = rsALU.free.indexOf(true);
            rsALU.free[indexOfNextFreeOutputRsEntry] = false;
            rsALU.values[indexOfNextFreeOutputRsEntry].opcode = tokens[0];
            rsALU.highlight[indexOfNextFreeOutputRsEntry] = 1;
            rsALU.highlightPersistent[indexOfNextFreeOutputRsEntry] = 1;
          }

          if (operand[0] === '[') {
            if (operand[1] === '0') {
              indexOfNextFreeRsEntry = loadInstructionToRs(rsLSU, 'LDR', [{tag: '~', value: Number(operand.slice(1, -1), 16), v: 1}, {tag: '~', value: '~', v: '~'}]);
            } else {
              indexOfReg = Number(operand.slice(2, -1));
              initRegOp(indexOfReg);
              indexOfNextFreeRsEntry = loadInstructionToRs(rsLSU, 'LDR', [deepCopy(rat.values[indexOfReg]), {tag: '~', value: '~', v: '~'}]);
            }
            rsALU.values[indexOfNextFreeOutputRsEntry].operands[i].tag = rsLSU.rowLabels[indexOfNextFreeRsEntry];
          } 
          
          else if (operand[0] === '0') {
            rsALU.values[indexOfNextFreeOutputRsEntry].operands[i] = {tag: '~', value: Number(operand, 16), v: 1};
          }

          else {
            indexOfReg = Number(operand.slice(1));
            initRegOp(indexOfReg);
            rsALU.values[indexOfNextFreeOutputRsEntry].operands[i] = deepCopy(rat.values[indexOfReg]);
          }
        }
        
        // Update RAT
        let outputReg = null;
        let loadReg = null;
        if (tokens[1].slice(0, 2) === '[R') {
          loadReg = Number(tokens[1].slice(2, -1));
          initRegOp(loadReg);
          indexOfNextFreeRsEntry = loadInstructionToRs(rsLSU, 'STR', [deepCopy(rat.values[loadReg]), {tag: rsALU.rowLabels[indexOfNextFreeOutputRsEntry], value: 0, v: 0}]);
        } else if (tokens[1].slice(0, 2) === '[0') {
          indexOfNextFreeRsEntry = loadInstructionToRs(rsLSU, 'STR', [{tag: '~', value: Number(tokens[1].slice(1, -1), 16), v: 1}, {tag: rsALU.rowLabels[indexOfNextFreeOutputRsEntry], value: 0, v: 0}]);
        } else {
          outputReg = Number(tokens[1].slice(1));
        }
        if (outputReg != null) {
          rat.values[outputReg].tag = rsALU.rowLabels[indexOfNextFreeOutputRsEntry];
          rat.values[outputReg].v = 0;
          rat.highlight[outputReg] = 1;
          rat.highlightPersistent[outputReg] = 1;
        }
      }

      // Move instruction queue
      for (let i = 0; i < numInstructions - 1; i++) {
        inst.values[i].instruction = inst.values[i+1].instruction;
      }
      inst.values[numInstructions-1].instruction = inst.initValue.instruction;
      instructionLoadIndex--;

      // Update logs
      lastIssued = instruction;
      updateLogs('[ISSUE] ' + instruction);
    } else {
      window.alert('Not enough space in the Reservation Stations');
    }
  }
}

function issueMov(tokens) {
  let indexOfRegDest;
  let indexOfRegOp;
  let indexOfInstruction;

  // imm to...
  if (tokens[2][0] === '0') {
    // ...reg
    if (tokens[1][0] === 'R') {
      indexOfRegDest = Number(tokens[1].slice(1));
      reg.values[indexOfRegDest].value = Number(tokens[2], 16);
      reg.highlight[indexOfRegDest] = 1;
      reg.highlightPersistent[indexOfRegDest] = 1;
      rat.values[indexOfRegDest] = {tag: '~', value: Number(tokens[2], 16), v: 1};
      rat.highlight[indexOfRegDest] = 1;
      rat.highlightPersistent[indexOfRegDest] = 1;
    }
    // ...memory pointed by reg (STR) TODO
    // else if (tokens[1].slice(0, 2) === '[R') {
    //   indexOfRegDest = Number(tokens[1].slice(2, -1));
    //   initRegOp(indexOfRegDest);
    //   loadInstructionToRs(rsLSU, 'STR', [deepCopy(rat.values[indexOfRegDest])]);
    // }
    // ...memory pointed by imm (STR) TODO
  } 

  // reg to... 
  else if (tokens[2][0] === 'R') {
    indexOfRegOp = Number(tokens[2].slice(1));
    initRegOp(indexOfRegOp);
    // ...reg
    if (tokens[1][0] === 'R') {
      indexOfRegDest = Number(tokens[1].slice(1));
      if (rat.values[indexOfRegOp].v == 1) {
        reg.values[indexOfRegDest].value = reg.values[indexOfRegOp].value;
        reg.highlight[indexOfRegDest] = 1;
        reg.highlightPersistent[indexOfRegDest] = 1;
      }
      rat.values[indexOfRegDest] = deepCopy(rat.values[indexOfRegOp]);
      rat.highlight[indexOfRegDest] = 1;
      rat.highlightPersistent[indexOfRegDest] = 1;
    }
    // ...memory pointed by reg (STR) TODO
    // ...memory pointed by imm (STR) TODO
  }

  // memory pointed by reg to...
  else if (tokens[2].slice(0, 2) === '[R') {
    indexOfRegOp = Number(tokens[2].slice(2, -1));
    initRegOp(indexOfRegOp);
    // ...reg (LDR)
    if (tokens[1][0] === 'R') {
      indexOfRegDest = Number(tokens[1].slice(1));
      indexOfInstruction = loadInstructionToRs(rsLSU, 'LDR', [deepCopy(rat.values[indexOfRegOp]), {tag: '~', value: '~', v: '~'}]);
      rat.values[indexOfRegDest].tag = rsLSU.rowLabels[indexOfInstruction];
      rat.highlight[indexOfRegDest] = 1;
      rat.highlightPersistent[indexOfRegDest] = 1;
    }
    // ...memory pointed by reg (LDR + STR) TODO
    // ...memory pointed by imm (LDR + STR) TODO
  }

  // memory pointed by imm to...
  else if (tokens[2].slice(0, 2) === '[0') {
    // ...reg (LDR)
    if (tokens[1][0] === 'R') {
      indexOfRegDest = Number(tokens[1].slice(1));
      indexOfInstruction = loadInstructionToRs(rsLSU, 'LDR', [{tag: '~', value: Number(tokens[2].slice(1, -1)), v: 1}, {tag: '~', value: '~', v: '~'}]);
      rat.values[indexOfRegDest].tag = rsLSU.rowLabels[indexOfInstruction];
      rat.highlight[indexOfRegDest] = 1;
      rat.highlightPersistent[indexOfRegDest] = 1;
    }
    // ...memory pointed by reg (LDR + STR) TODO
    // ...memory pointed by imm (LDR + STR) TODO
  }
}

function initRegOp(indexOfReg) {
  if (deepEqual(rat.values[indexOfReg], rat.initValue)) {
    rat.values[indexOfReg] = {tag: '~', value: reg.values[indexOfReg].value, v: 1};
    rat.highlight[indexOfReg] = 1;
    rat.highlightPersistent[indexOfReg] = 1;
  }
}

function loadInstructionToRs(rs, opcode, operands) {
  indexOfNextFreeRsEntry = rs.free.indexOf(true);
  rs.free[indexOfNextFreeRsEntry] = false;
  rs.values[indexOfNextFreeRsEntry].opcode = opcode;
  rs.values[indexOfNextFreeRsEntry].operands = operands;
  rs.highlight[indexOfNextFreeRsEntry] = 1;
  rs.highlightPersistent[indexOfNextFreeRsEntry] = 1;
  return indexOfNextFreeRsEntry;
}

function execute() {
  console.log('...doing this would be too hard');
}

function mouseHover(pos, w, h) {
  return mouseX > pos.x && mouseX < pos.x + w && mouseY > pos.y && mouseY < pos.y + h;
}

function mouseClicked() {
  if (mouseHover(resetButtonPos, buttonWidth, rowHeight)) {
    reset();
  } else if (instructionLoadIndex < numInstructions && mouseHover(enqueueButtonPos, buttonWidth, rowHeight)) {
    enqueue();
  }  else if (mouseHover(issueButtonPos, buttonWidth, rowHeight)) {
    issue();
  // } else if (mouseHover(executeButtonPos, buttonWidth, rowHeight)) {
  //   execute();
  } else if (mouseHover({x: switchPos - switchSize/4, y: switchPos - switchSize/4}, switchSize/2, switchSize/2)) {
    toggleDarkMode();
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

function and(v1, v2) {
  return v1 & v2;
}

function or(v1, v2) {
  return v1 | v2;
}

function ld(v1) {
  if (memory[v1] === undefined) {
    memory[v1] = floor(random(0, maxValue/8));
  }
  return memory[v1];
}

// function st(v1, v2) {
//   memory[v1] = v2;
// }

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
  return '0x'+constrain(value, 0, maxValue).toString(16).padStart(4, '0').toUpperCase();
}

function drawTextRs(rs) {
  for (let [i, value] of rs.values.entries()) {
    setConfigTableText();
    textSize(tableInnerTextSize);
    fill(tableTextColor);
    if (deepEqual(value, rs.initValue)) {
      fill(tableTextDefaultColor);
    }
    text(value.opcode, rs.pos.x + 2.3*s, rs.pos.y + (i+0.5)*rowHeight + 0.5*s);
    text(value.operands[0].tag, rs.pos.x + rs.divs[0] + 3.5*s, rs.pos.y + (i+0.5)*rowHeight + 0.5*s);
    if (value.operands[0].v == 0) {
      fill(tableTextDefaultColor);
    }
    text(int2hex(value.operands[0].value), rs.pos.x + rs.divs[1] + 2.2*s, rs.pos.y + (i+0.5)*rowHeight + 0.5*s);
    text(value.operands[0].v, rs.pos.x + rs.divs[2] + 3.5*s, rs.pos.y + (i+0.5)*rowHeight + 0.5*s);
    if (value.operands.length > 1) {
      fill(tableTextColor);
      text(value.operands[1].tag, rs.pos.x + rs.divs[3] + 3.5*s, rs.pos.y + (i+0.5)*rowHeight + 0.5*s);
      if (value.operands[1].v == 0) {
        fill(tableTextDefaultColor);
      }
      text(value.operands[1].v, rs.pos.x + rs.divs[5] + 3.5*s, rs.pos.y + (i+0.5)*rowHeight + 0.5*s);
      if (value.operands[1].value === '~') {
        textAlign('center');
        text('~', rs.pos.x + rs.divs[4] + (rs.divs[5] - rs.divs[4])/2, rs.pos.y + (i+0.5)*rowHeight + 0.5*s);
      } else {
        text(int2hex(value.operands[1].value), rs.pos.x + rs.divs[4] + 2.2*s, rs.pos.y + (i+0.5)*rowHeight + 0.5*s);
      }
    }
  }
}

function drawTextRAT() {
  setConfigTableText();
  textSize(tableInnerTextSize);
  for (let [i, value] of rat.values.entries()) {
    fill(tableTextColor);
    if (deepEqual(value, rat.initValue)) {
      fill(tableTextDefaultColor);
    }
    text(value.tag, rat.pos.x + 3.5*s, rat.pos.y + (i+0.5)*rowHeight + 0.5*s);
    if (value.v == 0) {
      fill(tableTextDefaultColor);
    }
    text(int2hex(value.value), rat.pos.x + rat.divs[0] + 2.2*s, rat.pos.y + (i+0.5)*rowHeight + 0.5*s);
    text(value.v, rat.pos.x + rat.divs[1] + 3.5*s, rat.pos.y + (i+0.5)*rowHeight + 0.5*s);
  }
}

function drawTextReg() {
  setConfigTableText();
  textSize(tableInnerTextSize);
  fill(tableTextColor);
  for (let [i, value] of reg.values.entries()) {
    text(int2hex(value.value), reg.pos.x + 2.2*s, reg.pos.y + (i+0.5)*rowHeight + 0.5*s);
  }
}

function drawTextInst() {
  setConfigTableText();
  textSize(tableInnerTextSize);
  fill(tableTextColor);
  for (let [i, value] of inst.values.entries()) {
    text(value.instruction, inst.pos.x + 2.3*s, inst.pos.y + numInstructions*rowHeight - (i+0.5)*rowHeight + 0.5*s);
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
  const params = new URLSearchParams(window.location.href.split('?').pop());
  let instructions = '';
  if (params.has('instructions')) {
    instructions = params.get('instructions');
  }
  for (let i = 0; i < numRegisters; i++) {
    if (params.has('R'+i)) {
      if (params.get('R'+i).slice(0, 2) === '0x' || params.get('R'+i).slice(0, 2) === '0X') {
        reg.values[i].value = constrain(Number(params.get('R'+i), 16), 0, maxValue);
      } else {
        reg.values[i].value = constrain(Number(params.get('R'+i)), 0, maxValue);
      }
    }
  }
  return instructions.split('|').slice(0, numInstructions*2).map(line => line.slice(0, maxCharsPerInstruction));
}

function isRegister(string) {
  if (string[0] === '[' && string.slice(-1) === ']') {
    string = string.slice(1,-1);
  }
  const regNumber = Number(string.slice(1));
  return string[0] === 'R' && string.length > 1 && !isNaN(regNumber) && Number.isInteger(regNumber) && regNumber >= 0 && regNumber < numRegisters;
}

function isValidValue(string) {
  if (string[0] === '[' && string.slice(-1) === ']') {
    string = string.slice(1,-1);
  }
  const number = Number(string);
  return !isNaN(number) && Number.isInteger(number) && number >= 0 && number <= maxValue;
}

function areRegistersOrValues(strings) {
  return strings.every(string => isRegister(string) || isValidValue(string));
}

function formatArg(arg) {
  if (isValidValue(arg)) {
    let indirect = arg[0] === '[';
    if (indirect) {
      arg = arg.slice(1,-1);
    }
    const number = Number(arg);
    arg = int2hex(number);
    if (indirect) {
      arg = '[' + arg + ']'
    }
  }
  return arg;
}

function formatInstructionDisplay(instruction) {
  try {
    let tokens = instruction.split(',');
    tokens = tokens[0].split(' ').filter(token => token !== '').concat(tokens.slice(1));
    tokens = tokens.map(token => token.trim().toUpperCase());
    let instructionSupported = supportedInstructionsMap.hasOwnProperty(tokens[0]);
    let matchingNumArgs = tokens.length - 2 === supportedInstructionsMap[tokens[0]].numArgs;
    let secondTokenIsRegister = isRegister(tokens[1]);
    let secondTokenIsntStore = tokens[1][0] !== '[';
    let allArgsAreRegistersOrValues = areRegistersOrValues(tokens.slice(2));
    if (instructionSupported && matchingNumArgs && secondTokenIsRegister && allArgsAreRegistersOrValues && secondTokenIsntStore) {
      return tokens[0] + ' ' + tokens.slice(1).map(token => formatArg(token)).join(', ');
    }
  } catch (e) {}
  return '';
}

function toggleDarkMode() {
  darkMode = !darkMode;
  updateColors();
}