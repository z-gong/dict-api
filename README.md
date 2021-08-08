## dict-api

A web service for looking up definitions from MDX/MDD dict files.

It also serves as a backend for ODH (online dictionary helper) plugin for chrome.

English word morphology is supported through hunspell.

### Usage

1. Put `mdx/mdd` files under `data/mdx/`
2. Start web service by `flask run`
3. Query words by accessing `http://localhost:5000/<WORD>` e.g. `http://localhost:5000/draw`
4. To disable JavaScript, access `http://localhost:5000/nojs/<WORD>`

### Acknowledgement

Reverse-engineering of the `mdx` format  
https://github.com/csarron/mdict-analysis

Encryption support
https://github.com/zhansliu/writemdict

Index support  
https://github.com/mmjang/mdict-query
