/* global api */
class encn_LDOCE6_MDX {
    constructor(options) {
        this.options = options;
        this.maxexample = 6;
        this.word = '';
    }

    async displayName() {
        let locale = await api.locale();
        return 'LDOCE6 EN->CN (mdx)';
    }

    setOptions(options) {
        this.options = options;
        this.maxexample = options.maxexample;
    }

    async findTerm(word) {
        this.word = word;
        let promises = [this.findLDOCE6(word)];
        let results = await Promise.all(promises);
        return [].concat(...results).filter(x => x);
    }

    async findLDOCE6(word) {
        let notes = [];
        if (!word) return notes;

        function putSoundTag(url) {
            return `<img class="odh-playsound" data-sound="${url}" src=""/>`;
        }

        function T(node) {
            if (!node)
                return '';
            else
                return node.innerText.trim();
        }

        let base = 'http://127.0.0.1:5000/';
        let url = base + 'nojs/' + encodeURIComponent(word);
        let doc = '';
        try {
            let data = await api.fetch(url);
            let parser = new DOMParser();
            doc = parser.parseFromString(data, 'text/html');
        } catch (err) {
            return [];
        }

        // COCA
        for (const header of doc.querySelectorAll('.dict-api_header')) {
            let coca = header.querySelector('.dict-api_coca');
            if (!coca) continue;
            notes.push({
                css: this.renderCSS(),
                expression: header.querySelector('.dict-api_word').innerText,
                reading: coca.innerHTML,
                definitions: [],
                audios: []
            });
        }

        let entryheaders = doc.querySelectorAll('.entry > .entryhead');
        let allentries = [];
        if (!entryheaders) return notes;
        for (const header of entryheaders) {
            allentries.push(header.parentNode);
            let phrvbentries = header.parentNode.querySelectorAll(':scope > .phrvbentry');
            allentries = allentries.concat(...phrvbentries);
        }

        let last_reading = '';
        let last_is_phrvb = false;
        let is_phrvb = false;
        for (const entry of allentries) {
            let definitions = [];
            let expression = '';
            let reading = '';
            let audiolinks = '';
            let header = entry.querySelector(':scope > .entryhead');

            if (!entry.classList.contains('phrvbentry')) {
                expression = T(header.querySelector('.hwd'))
                reading = T(header.querySelector('.proncodes')); // phonetic
                audiolinks = header.querySelectorAll('a');
            } else {
                is_phrvb = true;
                expression = T(header.querySelector('.phrvbhwd'));
                reading = T(entry.parentNode.querySelector(':scope > .entryhead').querySelector('.proncodes')); // phonetic
                audiolinks = entry.parentNode.querySelector(':scope > .entryhead').querySelectorAll('a');
            }

            if (reading.includes('$'))
                reading = reading.replace(/\/(.*) \$ (.*)\//, '/<span class="phonetic uk">$1<\/span> \$ <span class="phonetic us">$2<\/span>/')
            else
                reading = reading.replace(/\/(.*)\//, '/<span class="phonetic uk us">$1<\/span>/')

            // in case of several pos with same pronunciation, phonetic will not be given
            if (reading === '') reading = last_reading;

            let audios = [];
            for (const [index, audiolink] of audiolinks.entries()) {
                const href = audiolink.getAttribute('href');
                audios[index] = base + href;
            }

            let pos = T(header.querySelector('.pos'));
            let entrygram = T(header.querySelector('.gram'));

            let senses = entry.querySelectorAll(':scope > .sense');
            for (const sense of senses) {
                let signpost = T(sense.querySelector(':scope > .signpost'));
                signpost = signpost ? `<span class="eng_sign">${signpost}</span>` : '';
                let lexunit = T(sense.querySelector(':scope > .lexunit'));
                lexunit = lexunit ? `<span class="eng_lex">${lexunit}</span>` : '';
                let sensegram = T(sense.querySelector(':scope > .gram'));
                let subsenses = sense.querySelectorAll(':scope > .subsense');
                if (subsenses.length === 0) {
                    subsenses = [sense];
                    sensegram = '';
                }

                for (const subsense of subsenses) {
                    let gram = entrygram + sensegram + T(subsense.querySelector(':scope > .gram'));
                    let posgram = pos + gram !== '' ? `<span class='pos'>${(pos + ' ' + gram).trim()}</span>` : '';
                    posgram = posgram.replace('adjective', 'adj')
                        .replace('adverb', 'adv')
                        .replace('uncountable', 'U')
                        .replace('countable', 'C')
                        .replace('intransitive', 'I')
                        .replace('transitive', 'T')
                        .replace('adverb', 'adv')
                        .replace('preposition', 'prep');
                    // note that Chinese translation is inside the def with class `cn`
                    let def = subsense.querySelector(':scope > .def');
                    if (!def) continue;

                    let def_cn = def.querySelector(':scope > .cn');
                    let chn_tran = '';
                    if (def_cn) {
                        def.removeChild(def_cn);
                        chn_tran = `<span class='chn_tran'>${def_cn.innerText}</span>`
                    }
                    let eng_tran = `<span class='eng_tran'>${def.innerText}</span>`;

                    let definition = '';
                    definition += `${posgram}${lexunit}${signpost}<span class="tran">${eng_tran}${chn_tran}</span>`;
                    // make example sentence segment
                    let sense_examples = subsense.querySelectorAll('.sense>.example');
                    let subse_examples = subsense.querySelectorAll('.subsense>.example');
                    let examples = [...sense_examples, ...subse_examples];
                    if (examples.length > 0 && this.maxexample > 0) {
                        definition += '<ul class="sents">';
                        for (const [index, example] of examples.entries()) {
                            if (index > this.maxexample - 1) break; // to control only 2 example sentence.
                            // let soundlink = example.querySelector('a') || '';
                            // if (soundlink)
                            //     soundlink = putSoundTag(base + soundlink.getAttribute('href'));
                            // definition += `<li class='sent'>${soundlink}<span class='eng_sent'>${T(example)}</span></li>`;
                            definition += `<li class='sent'><span class='eng_sent'>${T(example)}</span></li>`;
                        }
                        definition += '</ul>';
                    }
                    // make grammar extra section
                    let grams = subsense.querySelectorAll('.gramexa') || [];
                    let collos = subsense.querySelectorAll('.colloexa') || [];
                    let extras = [...grams, ...collos];
                    for (const extra of extras) {
                        let eng_gram = T(extra.querySelector('.propform, .propformprep'));
                        let eng_collo = T(extra.querySelector('.collo'));
                        if (!eng_gram && !eng_collo) continue;
                        eng_gram = eng_gram ? `<span class="eng_gram_prop">${eng_gram}` : '';
                        eng_collo = eng_collo ? `<span class="eng_gram_collo">${eng_collo}</span>` : '';
                        let eng_gloss = extra.querySelector(':scope > .gloss');
                        eng_gloss = eng_gloss ? `<span class="eng_gram_gloss">${eng_gloss.innerHTML}</span>` : '';
                        definition += `<span class="gram_extra">${eng_gram}${eng_collo}${eng_gloss}</span>`;

                        let examp = extra.querySelector('.example') || '';
                        if (!examp) continue;
                        // let soundlink = examp.querySelector('a') || '';
                        // if (soundlink)
                        //     soundlink = putSoundTag(base + soundlink.getAttribute('href'));

                        let gram_collo_examp = `<span class="eng_gram_examp">${T(examp)}</span>`;
                        if (gram_collo_examp && this.maxexample > 0)
                            // definition += `<ul class="gram_examps"><li class="gram_examp">${soundlink}${gram_collo_examp}</li></ul>`;
                            definition += `<ul class="gram_examps"><li class="gram_examp">${gram_collo_examp}</li></ul>`;
                    }
                    definitions.push(definition);
                }
            }

            if (reading === last_reading && !is_phrvb && !last_is_phrvb) {
                let note = notes[notes.length - 1];
                note.definitions = note.definitions.concat(...definitions);
            } else {
                let css = this.renderCSS();
                notes.push({
                    css,
                    expression,
                    reading,
                    definitions,
                    audios
                });
            }

            last_reading = reading;
            last_is_phrvb = is_phrvb;
        }
        return notes;
    }


    renderCSS() {
        return `
            <style>
                span.head_gram{font-size: 0.8em;font-weight: bold;background-color: green;color: white;border-radius: 3px;margin: 0 3px;padding : 2px 3px;}
                span.head_freq{font-size: 0.8em;font-weight: bold;border: 1px solid red;border-radius:3px;color: red;margin: 0 3px;padding: 1px 2px;}
                span.pos{font-size: 0.9em;margin-right: 3px;padding: 0 4px;color: white;background-color: #0d47a1;border-radius: 3px;}
                span.eng_lex{font-weight: bold; margin-right: 3px;}
                span.eng_sign{font-size: 0.9em;margin-right: 3px;padding: 0 4px;color: white;background-color: darkorange;border-radius: 3px;}
                span.tran,
                span.gram_extra{margin: 0;padding: 0;}
                span.eng_tran,
                span.eng_gram_prop,
                span.eng_gram_collo,
                span.eng_gram_gloss{margin-right: 3px;padding: 0;}
                span.eng_gram_prop,
                span.eng_gram_collo{color: crimson; display: block;}
                span.chn_tran,
                span.chn_gram_tran {color: #0d47a1}
                ul.sents,
                ul.gram_examps{font-size: 0.8em;list-style: square inside;margin: 3px 0;padding: 5px;background: rgba(13,71,161,0.1);border-radius: 3px;}
                li.sent,
                li.gram_examp{margin: 0;padding: 0;}
                span.eng_sent,
                span.eng_gram_examp{margin-right: 5px;color: black;}
                span.chn_sent,
                span.chn_gram_examp{color:#0d47a1;}
                span.coca-pos { color: purple; font-weight: bold; }
                span.coca-pos ~ .coca-pos { margin-left: 8px; }
            </style>`;
    }
}
