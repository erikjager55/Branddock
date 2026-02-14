#!/usr/bin/env python3
"""
Phase 3: Component Migration Tool
Automatically moves components and updates import paths
"""

import os
import re
from pathlib import Path

# Component categorization
COMPONENTS = {
    'brand': [
        'AllAssetsDashboard.tsx',
        'AssetAccessBadge.tsx',
        'AssetOwnershipBanner.tsx',
        'AssetProgressBadge.tsx',
        'AssetResultsPageNew.tsx',
        'BrandAssetDetail.tsx',
        'BrandAssetsViewSimple.tsx',
        'BrandLibraryNew.tsx',
        'BrandMatrixView.tsx',
        'BrandOverview.tsx',
        'YourBrandStartPage.tsx',
        'QualityProgressBar.tsx',
    ],
    'research': [
        'CrossTargetResearchPanel.tsx',
        'ResearchApproachSelection.tsx',
        'ResearchDashboard.tsx',
        'ResearchHubWithTargets.tsx',
        'ResearchMethodCard.tsx',
        'ResearchMethodsDashboard.tsx',
        'ResearchOptionsView.tsx',
        'ResearchPlansSectionGamified.tsx',
        'ResearchTargetSelector.tsx',
        'ResearchTemplates.tsx',
        'ResearchToolComparison.tsx',
        'ResearchToolNav.tsx',
        'ResearchWorkflow.tsx',
        'SessionNavigator.tsx',
        'SessionOutcomeHeader.tsx',
        'StrategicResearchPlanner.tsx',
    ],
    'persona': [
        'PersonaDetail.tsx',
        'PersonaResearchMethods.tsx',
        'PersonasSection.tsx',
    ],
    'strategy': [
        'StrategyHubSection.tsx',
    ],
    'foundation': [
        'KnowledgeLibrary.tsx',
        'ProductsServices.tsx',
        'TrendLibrary.tsx',
    ],
    'layout': [
        'Dashboard.tsx',
        'DashboardView.tsx',
        'EnhancedSidebarSimple.tsx',
        'PageHeader.tsx',
    ],
    'shared': [
        'ErrorBoundary.tsx',
    ]
}

def update_import_path(old_path: str, from_folder: str, to_folder: str) -> str:
    """Update import path when component moves"""
    # Keep UI imports as-is
    if '/ui/' in old_path or './ui/' in old_path:
        return old_path
    
    # Keep canvases imports as-is
    if '/canvases/' in old_path or './canvases/' in old_path:
        return old_path
        
    # Keep services imports as-is
    if '/services/' in old_path or './services/' in old_path:
        return old_path
    
    # Keep brand-assets imports as-is
    if '/brand-assets/' in old_path or './brand-assets/' in old_path:
        return old_path
    
    # Update component imports
    for category, files in COMPONENTS.items():
        for file in files:
            filename_without_ext = file.replace('.tsx', '')
            if filename_without_ext in old_path:
                return f'../{category}/{file.replace(".tsx", "")}'
    
    return old_path

def fix_imports_in_file(file_path: Path, folder: str):
    """Fix import statements in a moved file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Update relative imports to UI components (now need ../)
    content = re.sub(
        r"from ['\"]\.\/ui\/",
        "from '../ui/",
        content
    )
    
    # Update relative imports to canvases (now need ../)
    content = re.sub(
        r"from ['\"]\.\/canvases\/",
        "from '../canvases/",
        content
    )
    
    # Update relative imports to services (now need ../)
    content = re.sub(
        r"from ['\"]\.\/services\/",
        "from '../services/",
        content
    )
    
    # Update relative imports to brand-assets (now need ../)
    content = re.sub(
        r"from ['\"]\.\/brand-assets\/",
        "from '../brand-assets/",
        content
    )
    
    # Update component imports
    for category, files in COMPONENTS.items():
        for file in files:
            filename = file.replace('.tsx', '')
            # Match imports like: from './ComponentName'
            pattern = rf"from ['\"]\./({filename})['\"]"
            if category == folder:
                # Same folder, keep as ./
                replacement = rf"from './{filename}'"
            else:
                # Different folder, update path
                replacement = rf"from '../{category}/{filename}'"
            content = re.sub(pattern, replacement, content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

def main():
    print("🚀 Phase 3: Component Migration Tool")
    print("=" * 50)
    print()
    
    # Create folders
    print("📁 Creating folder structure...")
    for folder in COMPONENTS.keys():
        folder_path = Path(f'components/{folder}')
        folder_path.mkdir(parents=True, exist_ok=True)
        print(f"   ✓ components/{folder}/")
    print()
    
    # Move files
    print("📦 Moving components...")
    for folder, files in COMPONENTS.items():
        print(f"\n   {folder.upper()} ({len(files)} files):")
        for file in files:
            src = Path(f'components/{file}')
            dst = Path(f'components/{folder}/{file}')
            
            if src.exists():
                # Read content
                with open(src, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Write to new location
                with open(dst, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                # Fix imports
                fix_imports_in_file(dst, folder)
                
                # Delete old file
                src.unlink()
                
                print(f"      ✓ {file}")
            else:
                print(f"      ⚠ {file} (not found)")
    
    print()
    print("✅ Migration complete!")
    print()
    print("⚠️  IMPORTANT: You still need to manually update App.tsx imports!")
    print()

if __name__ == '__main__':
    main()
