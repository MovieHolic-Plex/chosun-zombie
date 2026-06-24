import type { ScenarioCommand, ChoiceOption, VariableChange } from './types';

// Helper to parse variable modifications: e.g. "$ trust_girl += 1"
function parseVariableChange(line: string): VariableChange | undefined {
  // Strip '$' prefix
  const expr = line.replace(/^\$\s*/, '').trim();
  const match = expr.match(/^([a-zA-Z0-9_]+)\s*(\+=|-=|=)\s*(-?\d+)$/);
  
  if (match) {
    return {
      name: match[1],
      op: match[2] as '=' | '+=' | '-=',
      value: parseInt(match[3], 10)
    };
  }
  return undefined;
}

// Parses a single line command
function parseLineCommand(trimmed: string, rawLine: string, lineNum: number): ScenarioCommand | undefined {
  // 1. Scene Bg: "scene bg snow_mountain_pass"
  if (trimmed.startsWith('scene bg ')) {
    return {
      type: 'scene',
      rawLine,
      lineNum,
      bgId: trimmed.substring(9).trim()
    };
  }

  // 2. Show Character: "show char 이현 alert" or "show char 소녀 neutral"
  if (trimmed.startsWith('show char ')) {
    const parts = trimmed.substring(10).trim().split(/\s+/);
    return {
      type: 'show',
      rawLine,
      lineNum,
      charId: parts[0],
      expression: parts[1] || 'neutral'
    };
  }

  // 3. Hide Character: "hide char 이현"
  if (trimmed.startsWith('hide char ')) {
    return {
      type: 'hide',
      rawLine,
      lineNum,
      charId: trimmed.substring(10).trim()
    };
  }

  // 4. Show Effect: "show effect shake"
  if (trimmed.startsWith('show effect ')) {
    return {
      type: 'effect',
      rawLine,
      lineNum,
      effectId: trimmed.substring(12).trim()
    };
  }

  // 5. Sound / Music
  if (trimmed.startsWith('play music ')) {
    return {
      type: 'play_music',
      rawLine,
      lineNum,
      audioId: trimmed.substring(11).trim()
    };
  }
  if (trimmed.startsWith('play sound ')) {
    return {
      type: 'play_sound',
      rawLine,
      lineNum,
      audioId: trimmed.substring(11).trim()
    };
  }
  if (trimmed === 'stop music') {
    return {
      type: 'stop_music',
      rawLine,
      lineNum
    };
  }
  if (trimmed === 'stop sound') {
    return {
      type: 'stop_sound',
      rawLine,
      lineNum
    };
  }

  // 6. Jump: "jump scene_002"
  if (trimmed.startsWith('jump ')) {
    return {
      type: 'jump',
      rawLine,
      lineNum,
      jumpLabel: trimmed.substring(5).trim()
    };
  }

  // 7. Variable Change: "$ trust_girl += 1"
  if (trimmed.startsWith('$')) {
    const varChange = parseVariableChange(trimmed);
    if (varChange) {
      return {
        type: 'variable',
        rawLine,
        lineNum,
        varChange
      };
    }
  }

  // 8. Dialogue with speaker and expression: 이현 alert "하지만, 이 고요함이 더 두렵다." or "이현" alert "하지만..."
  const diagWithExprMatch = trimmed.match(/^(?:"([^"]+)"|([^\s"]+))\s+([a-zA-Z0-9_가-힣]+)\s+"([^"]+)"$/);
  if (diagWithExprMatch) {
    return {
      type: 'dialogue',
      rawLine,
      lineNum,
      speaker: diagWithExprMatch[1] || diagWithExprMatch[2],
      expression: diagWithExprMatch[3],
      text: diagWithExprMatch[4]
    };
  }

  // 9. Dialogue with speaker only: 이현 "오늘도 길은 조용하구나..." or "장덕팔" "으, 으악!..."
  const diagMatch = trimmed.match(/^(?:"([^"]+)"|([^\s"]+))\s+"([^"]+)"$/);
  if (diagMatch) {
    return {
      type: 'dialogue',
      rawLine,
      lineNum,
      speaker: diagMatch[1] || diagMatch[2],
      expression: 'neutral',
      text: diagMatch[3]
    };
  }

  // 10. Narration: "흰 눈 위의 검은 피."
  const narrMatch = trimmed.match(/^"([^"]+)"$/);
  if (narrMatch) {
    return {
      type: 'narration',
      rawLine,
      lineNum,
      text: narrMatch[1]
    };
  }

  return undefined;
}

// Parses a complete script file contents into a label map
export function parseScript(scriptContent: string): { [labelName: string]: ScenarioCommand[] } {
  const lines = scriptContent.split('\n');
  const labels: { [labelName: string]: ScenarioCommand[] } = {};
  
  let currentLabel: string | null = null;
  let labelCommands: ScenarioCommand[] = [];
  
  let inMenu = false;
  let currentMenuCommand: ScenarioCommand | null = null;
  let currentOption: ChoiceOption | null = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const lineNum = i + 1;
    const trimmed = rawLine.trim();
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) {
      continue;
    }
    
    // Get indentation level (number of leading spaces/tabs)
    const indentMatch = rawLine.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1].length : 0;
    
    // Label check (must be at start of line, no indent)
    if (indent === 0 && trimmed.startsWith('label ') && trimmed.endsWith(':')) {
      // Save previous label
      if (currentLabel) {
        if (inMenu && currentMenuCommand) {
          if (currentOption) {
            currentMenuCommand.options!.push(currentOption);
          }
          labelCommands.push(currentMenuCommand);
        }
        labels[currentLabel] = labelCommands;
      }
      
      const labelName = trimmed.substring(6, trimmed.length - 1).trim();
      currentLabel = labelName;
      labelCommands = [];
      inMenu = false;
      currentMenuCommand = null;
      currentOption = null;
      continue;
    }
    
    if (!currentLabel) {
      continue; // Skip lines before the first label
    }
    
    // Handle menu parsing mode
    if (inMenu && currentMenuCommand) {
      // Choice option syntax: "Choice Text":
      const choiceMatch = trimmed.match(/^"([^"]+)"\s*:/);
      if (choiceMatch) {
        // Save previous option if any
        if (currentOption) {
          currentMenuCommand.options!.push(currentOption);
        }
        
        currentOption = {
          text: choiceMatch[1],
          effects: [],
          jumpLabel: ''
        };
        continue;
      }
      
      // Parse commands belonging to the current option
      if (currentOption) {
        if (trimmed.startsWith('$')) {
          const varChange = parseVariableChange(trimmed);
          if (varChange) {
            currentOption.effects.push(varChange);
          }
          continue;
        } else if (trimmed.startsWith('jump ')) {
          const jumpLabel = trimmed.substring(5).trim();
          currentOption.jumpLabel = jumpLabel;
          continue;
        }
      }
      
      // If indentation drops back or matches normal commands, exit menu parsing
      if (indent <= 4 && !trimmed.startsWith('"') && !trimmed.startsWith('$') && !trimmed.startsWith('jump')) {
        inMenu = false;
        if (currentOption) {
          currentMenuCommand.options!.push(currentOption);
          currentOption = null;
        }
        labelCommands.push(currentMenuCommand);
        currentMenuCommand = null;
        // Fall through and parse this line as a normal command
      } else {
        continue; // Consume the line inside the menu block
      }
    }
    
    // Start of menu
    if (trimmed === 'menu:') {
      inMenu = true;
      currentMenuCommand = {
        type: 'menu',
        rawLine,
        lineNum,
        options: []
      };
      currentOption = null;
      continue;
    }
    
    // Normal command parsing
    const command = parseLineCommand(trimmed, rawLine, lineNum);
    if (command) {
      labelCommands.push(command);
    }
  }
  
  // Save the last label
  if (currentLabel) {
    if (inMenu && currentMenuCommand) {
      if (currentOption) {
        currentMenuCommand.options!.push(currentOption);
      }
      labelCommands.push(currentMenuCommand);
    }
    labels[currentLabel] = labelCommands;
  }
  
  return labels;
}
