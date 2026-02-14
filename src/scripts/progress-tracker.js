#!/usr/bin/env node

/**
 * Progress Tracker
 * 
 * Tracks consistency improvement progress over time
 * 
 * Usage:
 *   node scripts/progress-tracker.js
 *   npm run track:progress
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

// Load current report
const reportPath = path.join(process.cwd(), 'consistency-report.json');
const historyPath = path.join(process.cwd(), 'consistency-history.json');

function loadReport() {
  if (!fs.existsSync(reportPath)) {
    console.log('⚠️  No consistency report found. Run: npm run check:consistency\n');
    process.exit(1);
  }
  
  return JSON.parse(fs.readFileSync(reportPath, 'utf8'));
}

function loadHistory() {
  if (!fs.existsSync(historyPath)) {
    return [];
  }
  
  return JSON.parse(fs.readFileSync(historyPath, 'utf8'));
}

function saveHistory(history) {
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
}

function updateHistory(report) {
  const history = loadHistory();
  
  const entry = {
    date: new Date().toISOString().split('T')[0],
    timestamp: report.timestamp,
    consistencyScore: report.consistencyScore,
    stats: report.stats,
    issues: {
      spacing: report.issues.spacing.length,
      typography: report.issues.typography.length,
      colors: report.issues.colors.length,
      buttons: report.issues.buttons.length,
      components: report.issues.components.length,
      layout: report.issues.layout.length,
    },
  };
  
  // Add to history
  history.push(entry);
  
  // Keep last 30 entries
  if (history.length > 30) {
    history.shift();
  }
  
  saveHistory(history);
  return history;
}

function printProgress(history) {
  console.log('\n');
  console.log(colors.bold + colors.cyan + '═'.repeat(80) + colors.reset);
  console.log(colors.bold + colors.cyan + '  Consistency Improvement Progress' + colors.reset);
  console.log(colors.bold + colors.cyan + '═'.repeat(80) + colors.reset);
  console.log('\n');
  
  if (history.length === 0) {
    console.log('No history yet. Run check:consistency to start tracking.\n');
    return;
  }
  
  // Current status
  const current = history[history.length - 1];
  console.log(colors.bold + '📊 Current Status' + colors.reset);
  console.log(`  Date: ${current.date}`);
  console.log(`  Consistency Score: ${colors.bold}${current.consistencyScore}%${colors.reset}`);
  console.log(`  Total Issues: ${current.stats.totalIssues}`);
  console.log(`  Critical: ${current.stats.criticalIssues}`);
  console.log(`  Warnings: ${current.stats.warningIssues}`);
  console.log('\n');
  
  // Progress over time
  if (history.length > 1) {
    const first = history[0];
    const improvement = current.consistencyScore - first.consistencyScore;
    const issueReduction = first.stats.totalIssues - current.stats.totalIssues;
    
    console.log(colors.bold + '📈 Progress Since Start' + colors.reset);
    console.log(`  Start Date: ${first.date}`);
    console.log(`  Start Score: ${first.consistencyScore}%`);
    console.log(`  Current Score: ${current.consistencyScore}%`);
    
    if (improvement > 0) {
      console.log(`  Improvement: ${colors.green}+${improvement}%${colors.reset} 🎉`);
    } else if (improvement < 0) {
      console.log(`  Change: ${colors.yellow}${improvement}%${colors.reset}`);
    } else {
      console.log(`  Change: No change`);
    }
    
    console.log(`  Issues Resolved: ${issueReduction > 0 ? colors.green : colors.yellow}${issueReduction}${colors.reset}`);
    console.log('\n');
  }
  
  // Recent trend
  if (history.length >= 3) {
    console.log(colors.bold + '📉 Recent Trend (Last 5 Checks)' + colors.reset);
    const recent = history.slice(-5);
    
    recent.forEach((entry, index) => {
      const bar = '█'.repeat(Math.floor(entry.consistencyScore / 5));
      const scoreColor = entry.consistencyScore >= 95 ? colors.green :
                        entry.consistencyScore >= 85 ? colors.yellow : colors.reset;
      
      console.log(`  ${entry.date}: ${scoreColor}${bar}${colors.reset} ${entry.consistencyScore}%`);
    });
    console.log('\n');
  }
  
  // Category breakdown
  console.log(colors.bold + '🗂️  Issues by Category (Current)' + colors.reset);
  const categories = [
    { name: 'Spacing', key: 'spacing', icon: '📏' },
    { name: 'Typography', key: 'typography', icon: '📝' },
    { name: 'Colors', key: 'colors', icon: '🎨' },
    { name: 'Buttons', key: 'buttons', icon: '🔘' },
    { name: 'Components', key: 'components', icon: '🧩' },
    { name: 'Layout', key: 'layout', icon: '📐' },
  ];
  
  categories.forEach(category => {
    const count = current.issues[category.key];
    const bar = count > 0 ? '█'.repeat(Math.min(count, 20)) : '';
    const color = count === 0 ? colors.green : count < 5 ? colors.yellow : colors.reset;
    
    console.log(`  ${category.icon} ${category.name.padEnd(12)}: ${color}${bar}${colors.reset} ${count}`);
  });
  
  console.log('\n');
  console.log(colors.cyan + '─'.repeat(80) + colors.reset);
  
  // Goal tracking
  const target = 95;
  const remaining = target - current.consistencyScore;
  
  if (current.consistencyScore >= target) {
    console.log(colors.green + `\n🎯 Goal achieved! Consistency score: ${current.consistencyScore}%` + colors.reset);
    console.log(colors.green + '   ✨ Keep up the great work!' + colors.reset);
  } else {
    console.log(`\n🎯 Goal: ${target}% consistency`);
    console.log(`   Current: ${current.consistencyScore}%`);
    console.log(`   Remaining: ${remaining}%`);
    
    const progressBar = '█'.repeat(Math.floor(current.consistencyScore / 5)) + 
                       '░'.repeat(Math.ceil(remaining / 5));
    console.log(`   Progress: ${progressBar}`);
  }
  
  console.log('\n');
  console.log(colors.cyan + '═'.repeat(80) + colors.reset);
  console.log('\n');
}

function exportCSV(history) {
  const csv = ['Date,ConsistencyScore,TotalIssues,Critical,Warnings,Spacing,Typography,Colors,Buttons,Components,Layout'];
  
  history.forEach(entry => {
    csv.push([
      entry.date,
      entry.consistencyScore,
      entry.stats.totalIssues,
      entry.stats.criticalIssues,
      entry.stats.warningIssues,
      entry.issues.spacing,
      entry.issues.typography,
      entry.issues.colors,
      entry.issues.buttons,
      entry.issues.components,
      entry.issues.layout,
    ].join(','));
  });
  
  const csvPath = path.join(process.cwd(), 'consistency-history.csv');
  fs.writeFileSync(csvPath, csv.join('\n'));
  console.log(`📊 CSV export saved to: ${csvPath}\n`);
}

function main() {
  const report = loadReport();
  const history = updateHistory(report);
  
  printProgress(history);
  exportCSV(history);
  
  console.log('💡 Tips:');
  console.log('  - Run npm run check:consistency regularly to track progress');
  console.log('  - See IMPLEMENTATION_ROADMAP.md for step-by-step guidance');
  console.log('  - Check consistency-history.csv for detailed metrics\n');
}

if (require.main === module) {
  main();
}

module.exports = { main };
