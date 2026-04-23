import os
import re

def audit_buttons():
    directory = 'apps/web'
    report = []
    
    button_pattern = re.compile(r'<([B|b]utton)[^>]*>')
    
    for root, _, files in os.walk(directory):
        for file in files:
            if not file.endswith(('.tsx', '.jsx')):
                continue
            
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                
                # Find all buttons
                for match in button_pattern.finditer(content):
                    btn_str = match.group(0)
                    
                    # Check wiring
                    is_wired = False
                    wiring_info = []
                    
                    if 'onClick=' in btn_str:
                        is_wired = True
                        wiring_info.append('onClick')
                    if 'type="submit"' in btn_str:
                        is_wired = True
                        wiring_info.append('type=submit')
                    if 'asChild' in btn_str:
                        is_wired = True
                        wiring_info.append('asChild (Link wrapper)')
                    
                    if not is_wired:
                        # Check if it's wrapped in a form, but we can't easily do that with regex on single tag
                        pass
                    
                    report.append({
                        'file': filepath,
                        'button': btn_str,
                        'wired': is_wired,
                        'info': ', '.join(wiring_info) if wiring_info else 'Unwired or Form Submit'
                    })
                    
    # Format report
    print(f"Found {len(report)} buttons.")
    unwired = [r for r in report if not r['wired']]
    print(f"Potentially unwired: {len(unwired)}")
    for r in unwired:
        print(f"File: {r['file']} | Button: {r['button']}")

audit_buttons()
