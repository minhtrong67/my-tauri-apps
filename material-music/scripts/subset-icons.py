import sys, re, os, glob, io
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.varLib import instancer

proj = sys.argv[1]
src_font = os.path.join(proj, 'node_modules/material-symbols/material-symbols-rounded.woff2')
out_path = os.path.join(proj, 'src/assets/material-symbols-subset.woff2')
os.makedirs(os.path.dirname(out_path), exist_ok=True)

font = TTFont(src_font)
cmap = font.getBestCmap()
glyph_char = {}
for cp, gn in sorted(cmap.items()):
    glyph_char.setdefault(gn, chr(cp))

# --- every ligature name available in the font
lig_tables = []
for lookup in font['GSUB'].table.LookupList.Lookup:
    for st in lookup.SubTable:
        if lookup.LookupType == 7: st = st.ExtSubTable
        if hasattr(st, 'ligatures'): lig_tables.append(st)
all_names = {}
for st in lig_tables:
    for first, ligs in st.ligatures.items():
        for l in ligs:
            seq = [first] + list(l.Component)
            try: name = ''.join(glyph_char[g] for g in seq).lower()
            except KeyError: continue
            all_names[name] = l.LigGlyph
print('ligatures in font:', len(all_names))

# --- names the app actually uses: every quoted token that is an icon name
used = set()
for f in glob.glob(os.path.join(proj, 'src/**/*.ts*'), recursive=True):
    txt = open(f, encoding='utf-8').read()
    for tok in re.findall(r"""['"`]([a-z][a-z0-9_]{1,40})['"`]""", txt):
        if tok in all_names: used.add(tok)
# a few that are built dynamically
used |= {'fullscreen','fullscreen_exit','check','close','search','settings','refresh','menu','arrow_back','chevron_right','expand_more','music_note','movie','play_arrow','pause'}
used = {u for u in used if u in all_names}
print('icons used:', len(used))

# --- prune ligature rules that are not needed
for st in lig_tables:
    for first in list(st.ligatures):
        keep = []
        for l in st.ligatures[first]:
            seq = [first] + list(l.Component)
            try: name = ''.join(glyph_char[g] for g in seq).lower()
            except KeyError: continue
            if name in used: keep.append(l)
        if keep: st.ligatures[first] = keep
        else: del st.ligatures[first]

letters = set('abcdefghijklmnopqrstuvwxyz0123456789_')
opts = subset.Options()
opts.flavor = None
opts.layout_features = ['liga', 'rlig', 'calt', 'ccmp', 'locl', 'mark', 'mkmk']
opts.hinting = False
opts.notdef_outline = True
opts.name_IDs = [1, 2, 3, 4, 6]
opts.drop_tables += ['DSIG', 'STAT']
opts.glyph_names = False
opts.layout_closure = True
sub = subset.Subsetter(opts)
sub.populate(unicodes=[ord(c) for c in letters], glyphs=[all_names[n] for n in used])
sub.subset(font)

# --- limit the variable axes we never change (wght 400, GRAD 0, opsz 24); keep FILL (0 / 1)
if 'fvar' in font:
    axes = {a.axisTag: (a.minValue, a.defaultValue, a.maxValue) for a in font['fvar'].axes}
    print('axes:', axes)
    limits = {}
    if 'wght' in axes: limits['wght'] = 400
    if 'GRAD' in axes: limits['GRAD'] = 0
    if 'opsz' in axes: limits['opsz'] = 24
    font = instancer.instantiateVariableFont(font, limits, inplace=False)

font.flavor = 'woff2'
font.save(out_path)
print('written', out_path, os.path.getsize(out_path) // 1024, 'KB')
open('/tmp/gen/used_icons_%s.txt' % os.path.basename(proj), 'w').write('\n'.join(sorted(used)))
