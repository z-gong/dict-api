import re
import hunspell
import json
import math
from pathlib import Path
from flask import Flask, url_for
from mdict.mdict_query import IndexBuilder
from config import Config

PATH_APP = Path(__file__).parent
spell = hunspell.HunSpell(*[PATH_APP.joinpath('../data/morphology').joinpath(f) for f in Config.SPELL_FILES])
mdx = IndexBuilder(PATH_APP.joinpath('../data/mdx').joinpath(Config.MDX))
# COCA60000 {word : [[pos, rank, times, ratio], ...], ...}
with open(PATH_APP.joinpath('../data/COCA60000.json')) as f:
    coca = json.load(f)


def query_mdx(word_str):
    word = word_str.strip()
    stems = [s.decode() for s in spell.stem(word)]
    suggestions = [s for s in spell.suggest(word)]

    words = list({k: None for k in [word] + stems}.keys())
    definitions = {}  # {'key':[def1, def2, ...], ...}
    for key in words:
        if key in definitions:
            continue
        values = mdx.mdx_lookup(key)
        if values != []:
            definitions[key] = values

    files = set()
    audios = set()
    for key, values in definitions.items():
        for val in values:
            # image and javascript
            for match in re.finditer(r'src="(.*?)"', val):
                filename = match.group(1)
                if not filename.startswith('data:'):
                    files.add(filename)
            # css
            for match in re.finditer(r'href="(.*?\.css)"', val):
                filename = match.group(1)
                files.add(filename)
            # audio
            for match in re.finditer(r'href="sound://(.*?)"', val):
                filename = match.group(1)
                audios.add(filename)

    for filename in files:
        url = url_for('main.send_resource', filepath=filename)
        for key, values in definitions.items():
            for i, val in enumerate(values):
                values[i] = val.replace(filename, url)

    for filename in audios:
        url = url_for('main.send_resource', filepath=filename)
        attrs = f'href="{url}" onclick="(new Audio(this.href)).play(); return false;"'
        for key, values in definitions.items():
            for i, val in enumerate(values):
                values[i] = val.replace(f'href="sound://{filename}"', attrs)

    for key, values in definitions.items():
        for i, val in enumerate(values):
            for match in re.finditer(r'href="entry://(.*?)"', val):
                word = match.group(1)
                url = url_for('main.query', word_str=word)
                values[i] = values[i].replace(match.group(0), f'href="{url}"')

    return words, definitions, suggestions


def get_coca(word):
    values = coca.get(word, None)
    if values is None:
        return None

    coca_strings = []
    for part, rank, freq, percent in coca[word]:
        rank_str = 'C%i' % (math.ceil(rank / 8000) * 8)
        if rank <= 8000:
            coca_color = 'red'
        elif rank <= 16000:
            coca_color = 'orange'
        elif rank <= 24000:
            coca_color = 'gray'
        else:
            rank_str = 'C24~'
            coca_color = 'lightgray'
        coca_strings.append('<span class="coca-pos">%s.</span>'
                            ' <span class="coca-rank" style="color: %s">%s</span>' % (part, coca_color, rank_str))

    return ' '.join(coca_strings)


def simplify_ldoce6(html):
    '''
    Remove buttons
    '''
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, 'lxml')

    for head in soup.find_all(class_='entryhead'):
        buttons = head.find(class_='buttons')
        if buttons is not None:
            buttons.decompose()

    for script in soup.find_all('script'):
        script.decompose()

    for tag in soup.find_all(class_='imgholder'):
        tag.decompose()

    return str(soup)


app = Flask(__name__)

from .main import main

app.register_blueprint(main)
