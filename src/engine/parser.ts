import type { ChoiceOption, ScenarioCommand } from './types';
import { parseLineCommand, parseVariableChange } from './parserCommands';

type MenuCommand = ScenarioCommand & {
  options: ChoiceOption[];
};

// Parses a complete script file contents into a label map
export function parseScript(scriptContent: string): { [labelName: string]: ScenarioCommand[] } {
  const lines = scriptContent.split('\n');
  const labels: { [labelName: string]: ScenarioCommand[] } = {};
  
  let currentLabel: string | null = null;
  let labelCommands: ScenarioCommand[] = [];
  
  let inMenu = false;
  let currentMenuCommand: MenuCommand | null = null;
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
            currentMenuCommand.options.push(currentOption);
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
          currentMenuCommand.options.push(currentOption);
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
          currentMenuCommand.options.push(currentOption);
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
        currentMenuCommand.options.push(currentOption);
      }
      labelCommands.push(currentMenuCommand);
    }
    labels[currentLabel] = labelCommands;
  }
  
  return labels;
}
