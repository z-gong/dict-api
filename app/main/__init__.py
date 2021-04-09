import io
import json
from flask import Blueprint, render_template, abort, send_file

main = Blueprint('main', __name__)

from app import *


@main.route('/')
def index():
    return abort(404)


@main.route('/<word_str>')
def query(word_str):
    words, definitions, suggestions = query_mdx(word_str)
    coca_dict = {w: get_coca(w) for w in definitions}

    return render_template('main.html',
                           words=words,
                           definitions=definitions,
                           suggestions=suggestions,
                           coca_dict=coca_dict,
                           iframe=True)


@main.route('/nojs/<word_str>')
def query_nojs(word_str):
    words, definitions, suggestions = query_mdx(word_str)
    coca_dict = {w: get_coca(w) for w in definitions}

    for key, values in definitions.items():
        for i, val in enumerate(values):
            values[i] = simplify_ldoce6(val)

    return render_template('main.html',
                           words=words,
                           definitions=definitions,
                           suggestions=suggestions,
                           coca_dict=coca_dict,
                           iframe=False)


@main.route('/api/<word_str>')
def api_query(word_str):
    words, definitions, suggestions = query_mdx(word_str)

    return json.dumps({'code'       : '200',
                       'words'      : words,
                       'suggestions': suggestions,
                       'definitions': definitions,
                       })


@main.route('/resource/<path:filepath>')
def send_resource(filepath):
    path = PATH_APP.joinpath('../data/mdx').joinpath(filepath)
    if path.exists():
        return send_file(str(path))

    entry = filepath.replace('/', '\\')
    if not entry.startswith('\\'):
        entry = '\\' + entry

    results = mdx.mdd_lookup(entry)
    if results == []:
        return abort(404)

    return send_file(io.BytesIO(results[0]), attachment_filename=filepath)
