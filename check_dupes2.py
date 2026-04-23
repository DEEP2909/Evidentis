import re

file_path = 'apps/web/app/dashboard/page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# The mess starts around the second occurrence.
# Let's find the first 'return (' after index 11152.
first_return = content.find('return (', 11152)
# Find the corresponding closing brace/parenthesis for the return.
# This is complex to parse perfectly, but I can see the structure.

# Let's look at the content between the two occurrences.
print("--- BETWEEN ---")
print(content[11152+300:13379])
print("--- AFTER SECOND ---")
print(content[13379:13379+500])
