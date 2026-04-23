import re

file_path = 'apps/web/app/dashboard/page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the double return AppShell blocks
# We want to keep everything up to the first 'return (' inside the component, but the previous tool mess has mixed it up.
# Actually, the file had a double injection.

# Let's try to find the start of the return and the end of the first return block.
# Or better, let's just identify the duplicated block and remove it.

# Look for the sequence that marks the duplicate:
duplicate_marker = '              {teamActivity.map((item, index) => ('
parts = content.split(duplicate_marker)

if len(parts) > 2:
    # There's a duplicate.
    # The first one ends at lines 357-358 area.
    # We want to remove the text between the end of the first map and the start of the next section.
   
    # Actually, let's just rewrite the relevant section of the file if we can.
    pass

# Simplified: Use a regex to find the duplicate and remove it.
# This is tricky without seeing the whole file.

# Let's just try to read the file again to be absolutely sure what it looks like now.
print(content[content.find('const teamActivity ='):content.find('const teamActivity =')+2000])
