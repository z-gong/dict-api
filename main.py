from mdict.mdict_query import IndexBuilder
import hunspell

hs = hunspell.HunSpell('data/morphology/en_US.dic', 'data/morphology/en_US.aff')
print(hs.stem('fci'))

mdx = IndexBuilder('data/mdx/LDOCE6.mdx')
print(mdx.get_mdx_keys('focus'))
print(mdx.get_mdx_keys('fo*us'))
print(mdx.mdx_lookup('focus'))
print(mdx.mdd_lookup(r'\hwd\bre\e\spent_adj0205.mp3'))
