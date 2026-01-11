#!/usr/bin/env node
/**
 * Quick verification that Player4 calls step is properly calling performTestPlayerAction
 */

const fs = require('fs');
const path = require('path');

// Navigate to project root from tests/unit/ directory
const projectRoot = path.join(__dirname, '../..');
const stepFile = path.join(projectRoot, 'selenium/step_definitions/5-player-comprehensive-steps.js');
const content = fs.readFileSync(stepFile, 'utf8');

// Check 1: Player4 calls more (all-in) with pocket step should have performTestPlayerAction
const pattern1 = /When\(\/\^Player\(\\\d\+\) calls.*more.*all-in.*with pocket.*\$/;
const section1Start = content.indexOf('When(/^Player(\\d+) calls \\$?(\\d+) more \\(all-in\\) with pocket (\\w+)s$/');

if (section1Start === -1) {
  console.log('❌ Could not find the "calls more (all-in) with pocket" pattern');
  process.exit(1);
}

const section1End = content.indexOf('When(', section1Start + 100);
const section1 = content.substring(section1Start, section1End);

if (section1.includes('performTestPlayerAction')) {
  console.log('✅ "Player calls more (all-in) with pocket" step includes performTestPlayerAction');
} else {
  console.log('❌ "Player calls more (all-in) with pocket" step DOES NOT call performTestPlayerAction');
  process.exit(1);
}

// Check 2: Generic "Player calls $X more" step should have performTestPlayerAction
const section2Start = content.indexOf('When(/^Player(\\d+) calls \\$?(\\d+) more(?: \\(.*\\))?$/');

if (section2Start === -1) {
  console.log('❌ Could not find the generic "calls more" pattern');
  process.exit(1);
}

const section2End = content.indexOf('When(', section2Start + 100);
const section2 = content.substring(section2Start, section2End);

if (section2.includes('performTestPlayerAction')) {
  console.log('✅ Generic "Player calls $X more" step includes performTestPlayerAction');
} else {
  console.log('❌ Generic "Player calls $X more" step DOES NOT call performTestPlayerAction');
  process.exit(1);
}

console.log('\n✅ Fix verification complete - all player action steps have proper backend calls!');
