#!/usr/bin/env python3
"""
Build script to compile the React app and embed it into dashboard.json
"""
import json
import subprocess
import glob
import os
import sys

def run_build():
    """Run npm build command"""
    print("Building the package...")
    try:
        result = subprocess.run(
            ['npm', 'run', 'build'],
            cwd=os.path.dirname(os.path.abspath(__file__)),
            check=True,
            capture_output=True,
            text=True
        )
        print("Build completed successfully!")
        if result.stdout:
            print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Build failed with error: {e}")
        if e.stdout:
            print("STDOUT:", e.stdout)
        if e.stderr:
            print("STDERR:", e.stderr)
        return False

def find_js_file():
    """Find the generated JS file in dist directory"""
    js_files = glob.glob('dist/index-*.js')
    if not js_files:
        raise FileNotFoundError("No index-*.js file found in dist directory")
    if len(js_files) > 1:
        print(f"Warning: Multiple JS files found, using: {js_files[0]}")
    return js_files[0]

def update_dashboard():
    """Update dashboard.json with built files"""
    print("\nUpdating dashboard.json...")
    
    # Find the JS file
    js_file_path = find_js_file()
    print(f"Found JS file: {js_file_path}")
    
    # Read the HTML file
    html_path = 'dist/index.html'
    if not os.path.exists(html_path):
        raise FileNotFoundError(f"{html_path} not found")
    
    with open(html_path, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # Replace the index-*.js reference with main.js (without leading slash)
    import re
    html_content = re.sub(r'/index-[^"]+\.js', 'main.js', html_content)
    
    # Remove any CSS link tags since CSS is inlined in the JS
    html_content = re.sub(r'<link[^>]*stylesheet[^>]*>', '', html_content)
    
    # Read the JS file
    with open(js_file_path, 'r', encoding='utf-8') as f:
        js_content = f.read()
    
    # Read dashboard.json
    dashboard_path = 'dashboard.json'
    with open(dashboard_path, 'r', encoding='utf-8') as f:
        dashboard = json.load(f)
    
    # Ensure attachments array exists
    if 'attachments' not in dashboard:
        dashboard['attachments'] = []
    
    # Update or create attachments
    attachments = dashboard['attachments']
    
    # Find or create index.html attachment
    html_attachment = None
    js_attachment = None
    
    for attachment in attachments:
        if attachment.get('name') == 'index.html':
            html_attachment = attachment
        elif attachment.get('name') == 'main.js':
            js_attachment = attachment
    
    # Create attachments if they don't exist
    if html_attachment is None:
        html_attachment = {'name': 'index.html', 'value': ''}
        attachments.append(html_attachment)
    
    if js_attachment is None:
        js_attachment = {'name': 'main.js', 'value': ''}
        attachments.append(js_attachment)
    
    # Update values (json.dump will handle escaping automatically)
    html_attachment['value'] = html_content
    js_attachment['value'] = js_content
    
    # Write back to dashboard.json
    # json.dump automatically escapes newlines and special characters
    with open(dashboard_path, 'w', encoding='utf-8') as f:
        json.dump(dashboard, f, indent=4, ensure_ascii=False)
    
    print(f"\nSuccessfully updated dashboard.json!")
    print(f"  - HTML content: {len(html_content):,} characters")
    print(f"  - JS content: {len(js_content):,} characters")
    print(f"  - Total attachments: {len(attachments)}")

def main():
    """Main execution function"""
    try:
        # Step 1: Build the package
        if not run_build():
            print("\nBuild failed. Exiting.")
            sys.exit(1)
        
        # Step 2: Update dashboard.json
        update_dashboard()
        
        print("\n✓ All done!")
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()

