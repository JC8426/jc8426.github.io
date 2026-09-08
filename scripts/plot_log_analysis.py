"""Rebuild portfolio figures from the published, anonymized archive summary.

Requires matplotlib. This does not read original team logs or infer network latency.
"""
from pathlib import Path
import csv
import json
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.ticker import StrMethodFormatter

OUT=Path(__file__).resolve().parents[1]/'assets/data-analysis'
d=json.loads((OUT/'log-summary.json').read_text())
assert sum(d['entry_counts'].values())==d['total_records']
assert sum(r['records'] for r in d['runs'])==d['total_records']
assert len(d['runs'])==d['file_count']
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'axes.spines.top':False,'axes.spines.right':False,'axes.spines.left':False,'axes.spines.bottom':False,'savefig.facecolor':'#f6f7f2','figure.facecolor':'#f6f7f2','axes.facecolor':'#f6f7f2','text.color':'#172625','axes.labelcolor':'#172625','xtick.color':'#536762','ytick.color':'#536762'})

# Contract: compare record composition for all 14 archived files, including two
# metadata-only/near-empty files. Bars show counts, not request rate or uptime.
fig,ax=plt.subplots(figsize=(11,6.2))
keys=['teamMessage','statusMessage','action','gameState','metadata','end']
labels=['Team messages','Robot return frames','Actions','Internal state snapshots','Metadata','End markers']
colors=['#224f63','#669d9a','#bd8754','#9ab0c8','#d4d9ce','#84897d']
left=[0]*len(d['runs'])
for key,label,color in zip(keys,labels,colors):
    vals=[r['entry_counts'].get(key,0) for r in d['runs']]
    ax.barh(range(len(left)),vals,left=left,label=label,color=color,height=.64)
    left=[x+y for x,y in zip(left,vals)]
ax.set_yticks(range(len(left)),[r['run_id'] for r in d['runs']]);ax.invert_yaxis()
ax.set_xlabel('Timestamped log entries (count)')
ax.xaxis.set_major_formatter(StrMethodFormatter('{x:,.0f}'))
for i,n in enumerate(left):ax.text(n+max(left)*.012,i,f'{n:,}',va='center',fontsize=9)
ax.set_xlim(0,max(left)*1.16);ax.grid(axis='x',alpha=.15);ax.set_axisbelow(True)
fig.suptitle('What is recorded in the archive?',x=.12,ha='left',fontsize=20,fontweight='bold')
ax.set_title('14 files · 17,509 entries · all files retained, including near-empty logs',loc='left',pad=15,fontsize=10)
fig.legend(ncol=3,loc='lower left',bbox_to_anchor=(.10,.045),frameon=False,fontsize=9)
fig.text(.12,.025,'Retrospective analysis: 8 Sep 2026. Counts describe stored entries, not packet delivery or match performance.',fontsize=9,color='#536762')
fig.subplots_adjust(left=.12,right=.98,top=.84,bottom=.21)
for ext in ['png','svg']:fig.savefig(OUT/f'archive-composition.{ext}',dpi=180)
plt.close(fig)

# Contract: show the first recorded state and changes in one example trace.
# The dashed tail carries forward the last observation, rather than inventing
# a control-packet arrival event at the last timestamp.
run=d['runs'][-1];events=run['internal_state_transitions']
times=[e['elapsed_s'] for e in events]
assert times==sorted(times)
levels={'initial':0,'ready':1,'set':2,'playing':3,'finished':4}
values=[levels[e['state']] for e in events]
fig,ax=plt.subplots(figsize=(11,4.7))
ax.axvspan(0,times[0],color='#dce1d8')
ax.step(times,values,where='post',color='#224f63',linewidth=2.2)
ax.scatter(times,values,s=38,color='#224f63',zorder=4)
ax.plot([times[-1],run['last_event_elapsed_s']],[values[-1]]*2,'--',color='#669d9a',linewidth=2)
ax.axvline(run['last_event_elapsed_s'],color='#8c978e',linewidth=1,linestyle=':')
ax.annotate('First recorded state\nREADY at 3.056 s',(times[0],values[0]),xytext=(13,.65),arrowprops={'arrowstyle':'-','color':'#536762'},fontsize=9)
ax.text(125,3.18,'Last observed state\ncarried forward',fontsize=9,color='#536762')
ax.set_yticks([1,2,3],['READY','SET','PLAYING']);ax.set_ylim(.4,3.8);ax.set_xlim(0,160)
ax.set_xlabel('Seconds from first log timestamp');ax.grid(axis='x',alpha=.15)
fig.suptitle('Reconstructing internal controller state',x=.12,ha='left',fontsize=20,fontweight='bold')
ax.set_title('Run 14 · 590 state snapshots → first observation + 8 subsequent state changes',loc='left',pad=16,fontsize=10)
fig.text(.12,.045,'Internal model only: this is not a trace of outgoing packets or states received by robots. Last log event: 152.616 s.',fontsize=9,color='#536762')
fig.subplots_adjust(left=.12,right=.98,top=.80,bottom=.22)
for ext in ['png','svg']:fig.savefig(OUT/f'controller-timeline.{ext}',dpi=180)
plt.close(fig)
with (OUT/'archive-counts.csv').open('w',newline='') as f:
    w=csv.writer(f,lineterminator="\n");w.writerow(['run_id','records',*keys])
    for r in d['runs']:w.writerow([r['run_id'],r['records'],*[r['entry_counts'].get(k,0) for k in keys]])
for path in OUT.glob('*.svg'):
    path.write_text('\n'.join(line.rstrip() for line in path.read_text().splitlines())+'\n')
print('Validated summary totals; wrote two PNG/SVG figures and anonymized CSV.')
