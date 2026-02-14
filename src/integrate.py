#!/usr/bin/env python3
"""
Canvas Workshop Integration Script
Replaces the old renderInProgressView function with the new improved version
"""

def integrate():
    # Read the main file
    with open('components/canvases/CanvasWorkshopManager.tsx', 'r') as f:
        lines = f.readlines()
    
    # Read the new function
    with open('renderInProgressView_NEW.tsx', 'r') as f:
        new_function = f.read()
    
    # Lines 1-1000 (before the function)
    before = lines[:1000]
    
    # Lines 1375+ (after the function)
    after = lines[1374:]
    
    # Combine
    new_content = ''.join(before) + new_function + '\n' + ''.join(after)
    
    # Write back
    with open('components/canvases/CanvasWorkshopManager.tsx', 'w') as f:
        f.write(new_content)
    
    print("✅ Integration complete!")
    print("🎉 New In Progress view is now active!")
    print("\nTo see it:")
    print("1. Go to: Your Brand → Golden Circle → Canvas Workshop")
    print("2. Click 'In Progress' tab")
    print("3. Enjoy the new UX improvements!")

if __name__ == '__main__':
    integrate()
