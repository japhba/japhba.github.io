from pathlib import Path
import re
import sys
fn = sys.argv[1]
file = (Path(__file__).parent / fn)
print(file.read_text())
res = re.search(r"(---[\w\W]*---)", file.read_text())
file.write_text(res.group(0) + "\n")