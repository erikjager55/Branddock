#!/usr/bin/env node

/**
 * Design System Consistency Checker
 * 
 * Scans all component files for common consistency violations
 * and generates a detailed report.
 * 
 * Usage:
 *   node scripts/check-consistency.js
 *   npm run check:consistency
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

// Issue storage
const issues = {
  spacing: [],
  typography: [],
  colors: [],
  buttons: [],
  components: [],
  layout: [],
};

// Statistics
const stats = {
  filesScanned: 0,
  totalIssues: 0,
  criticalIssues: 0,
  warningIssues: 0,
};

/**
 * Check for spacing inconsistencies
 */
function checkSpacing(file, content) {
  // Check for non-standard header padding
  if (content.includes('sticky top-0')) {
    // Should use px-8
    if (content.match(/sticky top-0.*px-6/)) {
      issues.spacing.push({
        file,
        severity: 'critical',
        issue: 'Header uses px-6 instead of px-8',
        line: findLineNumber(content, 'sticky top-0.*px-6'),
        fix: 'Replace px-6 with px-8',
      });
    }
    
    if (content.match(/sticky top-0.*px-4(?! w-4)/)) {
      issues.spacing.push({
        file,
        severity: 'critical',
        issue: 'Header uses px-4 instead of px-8',
        line: findLineNumber(content, 'sticky top-0.*px-4'),
        fix: 'Replace px-4 with px-8',
      });
    }
    
    // Check for non-standard header vertical padding
    if (content.match(/sticky top-0.*py-3(?! rounded)/)) {
      issues.spacing.push({
        file,
        severity: 'warning',
        issue: 'Header uses py-3 instead of py-6 or py-4',
        line: findLineNumber(content, 'sticky top-0.*py-3'),
        fix: 'Use py-6 for standard or py-4 for compact',
      });
    }
    
    if (content.match(/sticky top-0.*py-5/)) {
      issues.spacing.push({
        file,
        severity: 'warning',
        issue: 'Header uses py-5 instead of py-6 or py-4',
        line: findLineNumber(content, 'sticky top-0.*py-5'),
        fix: 'Use py-6 for standard or py-4 for compact',
      });
    }
  }
  
  // Check for non-standard card padding
  if (content.match(/(<Card|CardContent).*p-5/)) {
    issues.spacing.push({
      file,
      severity: 'warning',
      issue: 'Card uses p-5 instead of p-6 or p-4',
      line: findLineNumber(content, 'p-5'),
      fix: 'Use p-6 for standard or p-4 for compact',
    });
  }
  
  if (content.match(/(<Card|CardContent).*p-7/)) {
    issues.spacing.push({
      file,
      severity: 'warning',
      issue: 'Card uses p-7 instead of p-6',
      line: findLineNumber(content, 'p-7'),
      fix: 'Use p-6 for standard cards',
    });
  }
}

/**
 * Check for typography inconsistencies
 */
function checkTypography(file, content) {
  // Check if file uses hardcoded typography without TYPOGRAPHY constant
  const hasHardcodedTypography = content.match(/text-(xl|2xl|3xl)/);
  const usesTYPOGRAPHY = content.includes('TYPOGRAPHY');
  
  if (hasHardcodedTypography && !usesTYPOGRAPHY) {
    const matches = content.match(/text-(xl|2xl|3xl)/g) || [];
    issues.typography.push({
      file,
      severity: 'critical',
      issue: `Uses hardcoded text sizes without TYPOGRAPHY constant (${matches.length} instances)`,
      line: findLineNumber(content, 'text-(xl|2xl|3xl)'),
      fix: 'Import and use TYPOGRAPHY from design-system.ts',
      instances: matches.slice(0, 3).join(', '),
    });
  }
  
  // Check for inconsistent page titles
  if (content.match(/className="text-3xl font-semibold/)) {
    issues.typography.push({
      file,
      severity: 'warning',
      issue: 'Page title uses hardcoded text-3xl font-semibold',
      line: findLineNumber(content, 'text-3xl font-semibold'),
      fix: 'Use TYPOGRAPHY.pageTitle',
    });
  }
  
  // Check for inconsistent section headers
  if (content.match(/className="text-xl font-semibold/)) {
    issues.typography.push({
      file,
      severity: 'warning',
      issue: 'Section header uses hardcoded text-xl font-semibold',
      line: findLineNumber(content, 'text-xl font-semibold'),
      fix: 'Use TYPOGRAPHY.sectionTitle',
    });
  }
}

/**
 * Check for color inconsistencies
 */
function checkColors(file, content) {
  // Check for hardcoded hex colors
  const hexColorPattern = /(text|bg|border)-\[#[0-9A-Fa-f]{6}\]/g;
  const hexColors = content.match(hexColorPattern);
  
  if (hexColors) {
    issues.colors.push({
      file,
      severity: 'critical',
      issue: `Uses ${hexColors.length} hardcoded hex color(s)`,
      line: findLineNumber(content, hexColorPattern),
      fix: 'Use design system colors (text-primary, bg-primary, etc.)',
      instances: hexColors.slice(0, 3).join(', '),
    });
  }
  
  // Check for inconsistent status colors
  if (content.match(/text-green-600/) && !content.match(/COLORS\.status/)) {
    issues.colors.push({
      file,
      severity: 'warning',
      issue: 'Uses hardcoded status color (text-green-600)',
      line: findLineNumber(content, 'text-green-600'),
      fix: 'Use COLORS.status.success.text',
    });
  }
}

/**
 * Check for button pattern issues
 */
function checkButtons(file, content) {
  // Check for buttons with mr-2/ml-2 on icons
  if (content.match(/(mr-2|ml-2).*Icon|Icon.*(mr-2|ml-2)/)) {
    const matches = content.match(/(mr-2|ml-2)/g) || [];
    issues.buttons.push({
      file,
      severity: 'critical',
      issue: `Button icon uses mr-2/ml-2 spacing (${matches.length} instances)`,
      line: findLineNumber(content, '(mr-2|ml-2).*Icon'),
      fix: 'Use gap-2 on parent Button, remove mr-2/ml-2 from icon',
    });
  }
  
  // Check for buttons with h-5 w-5 icons
  if (content.match(/Button.*h-5 w-5|<.*Icon.*h-5 w-5.*\/>/)) {
    issues.buttons.push({
      file,
      severity: 'warning',
      issue: 'Button uses h-5 w-5 icon instead of h-4 w-4',
      line: findLineNumber(content, 'h-5 w-5'),
      fix: 'Change icon size to h-4 w-4',
    });
  }
  
  // Check for buttons with h-6 w-6 icons
  if (content.match(/Button.*h-6 w-6/)) {
    issues.buttons.push({
      file,
      severity: 'warning',
      issue: 'Button uses h-6 w-6 icon instead of h-4 w-4',
      line: findLineNumber(content, 'h-6 w-6'),
      fix: 'Change icon size to h-4 w-4',
    });
  }
  
  // Check for custom button sizing
  if (content.match(/Button.*className=".*h-9 px-4/)) {
    issues.buttons.push({
      file,
      severity: 'warning',
      issue: 'Button uses custom sizing (h-9 px-4)',
      line: findLineNumber(content, 'h-9 px-4'),
      fix: 'Use standard Button sizes (default, sm, icon)',
    });
  }
}

/**
 * Check for component pattern issues
 */
function checkComponents(file, content) {
  // Check for custom search implementations (should use SearchInput)
  if (content.match(/<Input.*placeholder="Search/i) && !content.includes('SearchInput')) {
    issues.components.push({
      file,
      severity: 'warning',
      issue: 'Uses custom search input instead of SearchInput component',
      line: findLineNumber(content, 'placeholder="Search'),
      fix: 'Use <SearchInput /> component',
    });
  }
  
  // Check for custom empty states (should use EmptyState)
  if (content.match(/No.*found|No items|Empty/i) && 
      content.match(/text-center/) && 
      !content.includes('EmptyState')) {
    issues.components.push({
      file,
      severity: 'info',
      issue: 'Might benefit from EmptyState component',
      line: findLineNumber(content, 'No.*found|No items|Empty'),
      fix: 'Consider using <EmptyState /> component',
    });
  }
  
  // Check for custom loading states (should use LoadingState)
  if (content.match(/isLoading.*<div/) && !content.includes('LoadingState')) {
    issues.components.push({
      file,
      severity: 'info',
      issue: 'Uses custom loading state',
      line: findLineNumber(content, 'isLoading'),
      fix: 'Consider using <LoadingState /> component',
    });
  }
}

/**
 * Check for layout pattern issues
 */
function checkLayout(file, content) {
  // Check for hardcoded page wrappers (should use LAYOUT_PATTERNS)
  const hasPageWrapper = content.match(/className="(h-full overflow-auto|min-h-screen)/);
  const usesLAYOUT_PATTERNS = content.includes('LAYOUT_PATTERNS');
  
  if (hasPageWrapper && !usesLAYOUT_PATTERNS) {
    issues.layout.push({
      file,
      severity: 'warning',
      issue: 'Uses hardcoded page wrapper instead of LAYOUT_PATTERNS',
      line: findLineNumber(content, 'h-full overflow-auto|min-h-screen'),
      fix: 'Use LAYOUT_PATTERNS.fullPage',
    });
  }
  
  // Check for inconsistent max-width usage
  if (content.match(/max-w-6xl/) && content.match(/max-w-7xl/)) {
    issues.layout.push({
      file,
      severity: 'info',
      issue: 'File mixes different max-width values',
      line: 'Multiple locations',
      fix: 'Standardize to one max-width pattern per page',
    });
  }
}

/**
 * Find approximate line number for a pattern
 */
function findLineNumber(content, pattern) {
  const regex = new RegExp(pattern);
  const match = content.match(regex);
  if (!match) return 'Unknown';
  
  const beforeMatch = content.substring(0, match.index);
  const lineNumber = (beforeMatch.match(/\n/g) || []).length + 1;
  return lineNumber;
}

/**
 * Scan a single file
 */
function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativeFile = filePath.replace(process.cwd(), '').substring(1);
  
  stats.filesScanned++;
  
  checkSpacing(relativeFile, content);
  checkTypography(relativeFile, content);
  checkColors(relativeFile, content);
  checkButtons(relativeFile, content);
  checkComponents(relativeFile, content);
  checkLayout(relativeFile, content);
}

/**
 * Calculate statistics
 */
function calculateStats() {
  Object.values(issues).forEach(category => {
    category.forEach(issue => {
      stats.totalIssues++;
      if (issue.severity === 'critical') stats.criticalIssues++;
      if (issue.severity === 'warning') stats.warningIssues++;
    });
  });
}

/**
 * Print report
 */
function printReport() {
  console.log('\n');
  console.log(colors.bold + colors.cyan + '═'.repeat(80) + colors.reset);
  console.log(colors.bold + colors.cyan + '  Design System Consistency Report' + colors.reset);
  console.log(colors.bold + colors.cyan + '═'.repeat(80) + colors.reset);
  console.log('\n');
  
  // Summary
  console.log(colors.bold + '📊 Summary' + colors.reset);
  console.log(`  Files scanned: ${stats.filesScanned}`);
  console.log(`  Total issues: ${stats.totalIssues}`);
  console.log(`  ${colors.red}Critical: ${stats.criticalIssues}${colors.reset}`);
  console.log(`  ${colors.yellow}Warnings: ${stats.warningIssues}${colors.reset}`);
  console.log('\n');
  
  // Issue categories
  const categories = [
    { name: 'Spacing', key: 'spacing', icon: '📏' },
    { name: 'Typography', key: 'typography', icon: '📝' },
    { name: 'Colors', key: 'colors', icon: '🎨' },
    { name: 'Buttons', key: 'buttons', icon: '🔘' },
    { name: 'Components', key: 'components', icon: '🧩' },
    { name: 'Layout', key: 'layout', icon: '📐' },
  ];
  
  categories.forEach(category => {
    const categoryIssues = issues[category.key];
    if (categoryIssues.length === 0) {
      console.log(colors.green + `✅ ${category.icon} ${category.name}: No issues` + colors.reset);
    } else {
      console.log(colors.bold + `${category.icon} ${category.name}: ${categoryIssues.length} issues` + colors.reset);
      
      categoryIssues.forEach((issue, index) => {
        const severityColor = issue.severity === 'critical' ? colors.red : 
                            issue.severity === 'warning' ? colors.yellow : colors.blue;
        
        console.log(`\n  ${index + 1}. ${severityColor}[${issue.severity.toUpperCase()}]${colors.reset} ${issue.file}`);
        console.log(`     Line: ${issue.line}`);
        console.log(`     Issue: ${issue.issue}`);
        console.log(`     Fix: ${colors.green}${issue.fix}${colors.reset}`);
        if (issue.instances) {
          console.log(`     Examples: ${issue.instances}`);
        }
      });
      console.log('');
    }
  });
  
  // Footer
  console.log('\n');
  console.log(colors.cyan + '─'.repeat(80) + colors.reset);
  
  // Consistency score
  const totalFiles = stats.filesScanned;
  const filesWithIssues = new Set(
    Object.values(issues).flat().map(i => i.file)
  ).size;
  const consistencyScore = Math.round(((totalFiles - filesWithIssues) / totalFiles) * 100);
  
  console.log(colors.bold + `\n🎯 Consistency Score: ${consistencyScore}%` + colors.reset);
  
  if (consistencyScore >= 95) {
    console.log(colors.green + '   ✨ Excellent! Your codebase is highly consistent.' + colors.reset);
  } else if (consistencyScore >= 85) {
    console.log(colors.yellow + '   👍 Good! A few improvements needed.' + colors.reset);
  } else if (consistencyScore >= 70) {
    console.log(colors.yellow + '   ⚠️  Room for improvement.' + colors.reset);
  } else {
    console.log(colors.red + '   🚨 Needs attention! Many inconsistencies found.' + colors.reset);
  }
  
  console.log('\n');
  console.log(colors.cyan + '═'.repeat(80) + colors.reset);
  console.log('\n');
  
  // Next steps
  if (stats.totalIssues > 0) {
    console.log(colors.bold + '📋 Next Steps:' + colors.reset);
    console.log('  1. Fix critical issues first');
    console.log('  2. Address warnings in batches');
    console.log('  3. Run this script again to track progress');
    console.log('  4. See IMPLEMENTATION_ROADMAP.md for detailed guidance');
    console.log('\n');
  }
}

/**
 * Save report to file
 */
function saveReport() {
  const report = {
    timestamp: new Date().toISOString(),
    stats,
    issues,
    consistencyScore: Math.round(((stats.filesScanned - new Set(Object.values(issues).flat().map(i => i.file)).size) / stats.filesScanned) * 100),
  };
  
  const reportPath = path.join(process.cwd(), 'consistency-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Detailed report saved to: ${reportPath}\n`);
}

/**
 * Main execution
 */
function main() {
  console.log('\n🔍 Scanning components for consistency issues...\n');
  
  // Find all component files
  const files = glob.sync('components/**/*.tsx', {
    cwd: process.cwd(),
    absolute: true,
    ignore: [
      '**/node_modules/**',
      '**/ui/**',  // Skip UI library components (shadcn)
    ],
  });
  
  console.log(`Found ${files.length} component files to scan\n`);
  
  // Scan each file
  files.forEach(scanFile);
  
  // Calculate stats
  calculateStats();
  
  // Print report
  printReport();
  
  // Save JSON report
  saveReport();
  
  // Exit with error code if critical issues found
  if (stats.criticalIssues > 0) {
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
