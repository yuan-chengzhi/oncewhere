"""Refresh the locally served Noto Serif SC subset after editing story text."""
from pathlib import Path
import re
from urllib.parse import quote
from urllib.request import Request, urlopen

root = Path(__file__).resolve().parents[1]
source = ''.join(path.read_text() for path in (root / 'src').glob('*.ts'))
source += ''.join(chr(i) for i in range(32, 127))
characters = ''.join(sorted(set(source)))
url = 'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400&display=swap&text=' + quote(characters)
agent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
css = urlopen(Request(url, headers={'User-Agent': agent})).read().decode()
font_url = re.findall(r'url\(([^)]+)\)', css)[0]
font = urlopen(font_url).read()
if font[:4] != b'wOF2':
    raise ValueError('Expected a WOFF2 font, received another format.')
(root / 'public/fonts/moon-serif.woff2').write_bytes(font)
(root / 'assets/font-characters.txt').write_text(characters)
license_url = 'https://raw.githubusercontent.com/google/fonts/main/ofl/notoserifsc/OFL.txt'
(root / 'public/fonts/OFL.txt').write_bytes(urlopen(license_url).read())
print(f'Local font refreshed: {len(characters)} characters, {len(font):,} bytes.')
