/* global api */
class encn_Cambridge_Fixed {
    constructor(options) {
        this.options = options;
        this.maxexample = 2;
        this.word = '';
    }

    async displayName() {
        return 'Cambridge EN->CN (SC) (Fixed)';
    }

    setOptions(options) {
        this.options = options;
        this.maxexample = options.maxexample;
    }

    async findTerm(word) {
        this.word = word;
        let promises = [this.findCambridge(word)];
        let results = await Promise.all(promises);
        return [].concat(...results).filter(x => x);
    }

    async findCambridge(word) {
        let notes = [];
        if (!word) return notes; // return empty notes

        function T(node) {
            if (!node)
                return '';
            else
                return node.innerText.trim();
        }

        let base = 'https://dictionary.cambridge.org/search/english-chinese-simplified/direct/?q=';
        let url = base + encodeURIComponent(word);
        let doc = '';
        try {
            let data = await api.fetch(url);
            let parser = new DOMParser();
            doc = parser.parseFromString(data, 'text/html');
        } catch (err) {
            return [];
        }

        let entries = doc.querySelectorAll('.pr .entry-body__el') || [];
        let expression = '';
        let reading = '';
        let reading_last = '';
        let definitions = [];
        let audios = [];
        for (const [index, entry] of entries.entries()) {
            let pron_uk = entry.querySelector('.uk .pron .ipa');
            let pron_us = entry.querySelector('.us .pron .ipa');
            let phonetic_uk = `${T(pron_uk).replace(/\./g, '')}`
            let phonetic_us = `${T(pron_us).replace(/\./g, '')}`
            let reading_entry = `/<span class="phonetic uk">${phonetic_uk}</span> <span class="sep">\$</span> <span class="phonetic us">${phonetic_us}</span>/`

            if (index === 0) {
                expression = T(entry.querySelector('.headword'));
                reading = reading_entry;
                audios[0] = entry.querySelector(".uk.dpron-i source");
                audios[0] = audios[0] ? 'https://dictionary.cambridge.org' + audios[0].getAttribute('src') : '';
                //audios[0] = audios[0].replace('https', 'http');
                audios[1] = entry.querySelector(".us.dpron-i source");
                audios[1] = audios[1] ? 'https://dictionary.cambridge.org' + audios[1].getAttribute('src') : '';
                //audios[1] = audios[1].replace('https', 'http');
            } else if (reading_entry !== reading_last) {
                definitions.push(`<span class='phonetics'>${reading_entry}</span>`);
            }
            reading_last = reading_entry;

            let pos = T(entry.querySelector('.posgram'));
            let sensbodys = entry.querySelectorAll('.sense-body') || [];
            for (const sensbody of sensbodys) {
                let sensblocks = sensbody.childNodes || [];
                for (const sensblock of sensblocks) {
                    let phrasehead = '';
                    let defblocks = [];
                    if (sensblock.classList && sensblock.classList.contains('phrase-block')) {
                        phrasehead = T(sensblock.querySelector('.phrase-title'));
                        phrasehead = phrasehead ? `<div class="phrasehead">${phrasehead}</div>` : '';
                        defblocks = sensblock.querySelectorAll('.def-block') || [];
                    }
                    if (sensblock.classList && sensblock.classList.contains('def-block')) {
                        defblocks = [sensblock];
                    }
                    if (defblocks.length <= 0) continue;

                    // make definition segement
                    for (const defblock of defblocks) {
                        let gram = T(defblock.querySelector('.ddef_h .gram'));
                        let pos_gram = pos !== '' ? `<span class='pos'>${(pos + ' ' + gram).trim()}</span>` : '';
                        let eng_tran = T(defblock.querySelector('.ddef_h .def'));
                        let chn_tran = T(defblock.querySelector('.def-body .trans'));
                        if (!eng_tran) continue;
                        let definition = '';
                        eng_tran = `<span class='eng_tran'>${eng_tran.replace(RegExp(expression, 'gi'), `<b>${expression}</b>`)}</span>`;
                        chn_tran = `<span class='chn_tran'>${chn_tran}</span>`;
                        let tran = `<span class='tran'>${eng_tran}${chn_tran}</span>`;
                        definition += phrasehead ? `${phrasehead}${tran}` : `${pos_gram}${tran}`;

                        // make exmaple segement
                        let examps = defblock.querySelectorAll('.def-body .examp') || [];
                        if (examps.length > 0 && this.maxexample > 0) {
                            definition += '<ul class="sents">';
                            for (const [index, examp] of examps.entries()) {
                                if (index > this.maxexample - 1) break; // to control only 2 example sentence.
                                let eng_examp = T(examp.querySelector('.eg'));
                                let chn_examp = T(examp.querySelector('.trans'));
                                definition += `<li class='sent'><span class='eng_sent'>${eng_examp.replace(RegExp(expression, 'gi'), `<b>${expression}</b>`)}</span><span class='chn_sent'>${chn_examp}</span></li>`;
                            }
                            definition += '</ul>';
                        }
                        definition && definitions.push(definition);
                    }
                }
            }
        }
        let css = this.renderCSS();
        notes.push({
            css,
            expression,
            reading,
            definitions,
            audios
        });
        return notes;
    }

    renderCSS() {
        return `
            <style>
                div.phrasehead{margin: 2px 0;font-weight: bold;}
                span.star {color: #FFBB00;}
                span.pos  {text-transform:lowercase; font-size:0.9em; margin-right:5px; padding:2px 4px; color:white; background-color:#0d47a1; border-radius:3px;}
                span.tran {margin:0; padding:0;}
                span.eng_tran {margin-right:3px; padding:0;}
                span.chn_tran {color:#0d47a1;}
                ul.sents {font-size:0.8em; list-style:square inside; margin:3px 0;padding:5px;background:rgba(13,71,161,0.1); border-radius:5px;}
                li.sent  {margin:0; padding:0;}
                span.eng_sent {margin-right:5px;}
                span.chn_sent {color:#0d47a1;}
            </style>`;
    }
}