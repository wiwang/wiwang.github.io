"""Illustrative MLOps architecture and synthetic monitoring experiment; no customer data."""
from pathlib import Path
import csv
import json
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/posts/mlops-production-systems'
OUT.mkdir(parents=True, exist_ok=True)
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'axes.spines.top':False,'axes.spines.right':False,'figure.facecolor':'#faf9f6','axes.facecolor':'#faf9f6','savefig.facecolor':'#faf9f6','text.color':'#242b31','svg.fonttype':'path','svg.hashsalt':'wiwang-mlops'})
BLUE,ORANGE,GREEN = '#355e85','#b7693b','#527b67'
def save(fig,name):
    fig.savefig(OUT/f'{name}.svg',bbox_inches='tight',metadata={'Date':None})
    svg = OUT / f'{name}.svg'
    svg.write_text('\n'.join(line.rstrip() for line in svg.read_text().splitlines()) + '\n')
    fig.savefig(OUT/f'{name}.png',bbox_inches='tight',dpi=180)
    plt.close(fig)

def architecture():
    fig,ax=plt.subplots(figsize=(8,9))
    ax.set(xlim=(0,10),ylim=(0,12));ax.axis('off')
    def box(x,y,w,h,title,body,color=BLUE):
        ax.add_patch(FancyBboxPatch((x,y),w,h,boxstyle='round,pad=0.10',facecolor='white',edgecolor=color,linewidth=1.2))
        ax.text(x+w/2,y+h-.35,title,ha='center',va='center',fontsize=11,color=color,weight='bold')
        ax.text(x+w/2,y+.40,body,ha='center',va='center',fontsize=9,linespacing=1.5)
    def arrow(a,b,color=BLUE):
        ax.add_patch(FancyArrowPatch(a,b,arrowstyle='-|>',mutation_scale=13,color=color,linewidth=1.2))
    box(.3,10.1,9.4,1.25,'Events and source snapshots','Jira · Calendar · IDE activity | event time + availability time')
    box(.3,8.0,9.4,1.25,'Versioned feature pipeline','Validate → deduplicate → aggregate → publish with lineage')
    arrow((5,10),(5,9.4))
    box(.3,5.8,4.25,1.25,'Historical feature view','Point-in-time datasets\nLabel maturity + immutable manifests')
    box(5.45,5.8,4.25,1.25,'Online feature view','Bounded-latency retrieval\nFreshness + fallback contract')
    arrow((2.4,7.9),(2.4,7.2));arrow((7.6,7.9),(7.6,7.2))
    box(.3,3.6,4.25,1.25,'Train → evaluate → register','Temporal splits + release gates\nPinned model / feature bundle')
    box(5.45,3.6,4.25,1.25,'Serve → capture predictions','Eligible candidates + model score\nRequest / version / outcome IDs')
    arrow((2.4,5.7),(2.4,5.0));arrow((7.6,5.7),(7.6,5.0));arrow((4.7,4.2),(5.3,4.2),ORANGE)
    box(.3,1.2,9.4,1.25,'Monitor → diagnose → controlled action','Service + features + delayed model quality + product outcomes',GREEN)
    arrow((7.6,3.5),(7.6,2.6),GREEN)
    ax.text(2.4,2.95,'Orchestration coordinates dependencies;\nit is not the request-time data path.',ha='center',va='center',fontsize=9,color='#687078')
    ax.text(5,.45,'Illustrative reference architecture inspired by the problem domain.\nNot a representation of a proprietary production topology.',ha='center',va='center',fontsize=9,color='#687078')
    fig.tight_layout();save(fig,'architecture')

def monitoring():
    rng=np.random.default_rng(20261024)
    rows=[]
    sigmoid=lambda x:1/(1+np.exp(-x))
    for day in range(60):
        n=4000
        x=rng.normal(size=n)
        context=rng.normal(1.2 if day>=15 else 0,1,n)
        incident=30<=day<40
        online_x=x-1.5 if incident else x
        p=sigmoid(1.5*online_x)
        y=rng.binomial(1,sigmoid(1.5*x))
        loss=-np.mean(y*np.log(p)+(1-y)*np.log1p(-p))
        ages=rng.lognormal(np.log(25 if incident else 1),.35,n)
        rows.append({'event_day':day,'label_available_day':day+7,'context_mean':float(context.mean()),'feature_age_p95_minutes':float(np.quantile(ages,.95)),'log_loss':float(loss),'requests':n,'incident':incident})
    assert all(r['label_available_day']-r['event_day']==7 for r in rows)
    baseline=np.mean([r['log_loss'] for r in rows if r['event_day']<15])
    bad=np.mean([r['log_loss'] for r in rows if r['incident']])
    assert bad>baseline
    fig,axes=plt.subplots(3,1,figsize=(7.5,8),sharex=True)
    d=np.arange(60)
    axes[0].plot(d,[r['context_mean'] for r in rows],color=BLUE,lw=2)
    axes[0].set(ylabel='Context mean',title='A distribution change is not, by itself, a quality incident')
    axes[0].axvline(15,color=BLUE,ls=':',alpha=.7)
    axes[1].plot(d,[r['feature_age_p95_minutes'] for r in rows],color=ORANGE,lw=2)
    axes[1].set(ylabel='p95 age (minutes)',title='Feature health changes when the injected incident begins')
    axes[2].plot(d,[r['log_loss'] for r in rows],color=GREEN,lw=2,label='By prediction day (retrospective)')
    axes[2].plot(d+7,[r['log_loss'] for r in rows],color=GREEN,lw=2,ls='--',label='Same cohort loss available seven days later')
    axes[2].set(ylabel='Binary log loss',xlabel='Day',title='Outcome-based confirmation arrives after the operational signal')
    axes[2].legend(fontsize=8,loc='upper left')
    for ax in axes:
        ax.axvspan(30,40,color=ORANGE,alpha=.1)
        ax.grid(alpha=.15);ax.set_xlim(0,66)
    fig.tight_layout(h_pad=2);save(fig,'monitoring-lag')
    with (OUT/'monitoring.csv').open('w',newline='') as f:
        w=csv.DictWriter(f,fieldnames=rows[0]);w.writeheader();w.writerows(rows)
    groups=[('Baseline',0,15),('Context shift only',15,30),('Injected incident',30,40),('Recovered',40,60)]
    summary=[]
    for name,start,end in groups:
        group=[r for r in rows if start<=r['event_day']<end]
        summary.append({'period':name,'days':f'{start}–{end-1}','mean_context':float(np.mean([r['context_mean'] for r in group])),'mean_daily_p95_age_minutes':float(np.mean([r['feature_age_p95_minutes'] for r in group])),'mean_daily_log_loss':float(np.mean([r['log_loss'] for r in group]))})
    (OUT/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
    table='| Period (event days) | Context mean | Mean daily p95 age (min) | Mean daily log loss |\n| --- | --- | --- | --- |\n'+'\n'.join(f"| {r['period']} ({r['days']}) | {r['mean_context']:.3f} | {r['mean_daily_p95_age_minutes']:.2f} | {r['mean_daily_log_loss']:.3f} |" for r in summary)
    (OUT/'results-table.md').write_text(table+'\n')
    print(table)

if __name__=='__main__':
    architecture();monitoring()

    import re
    article=ROOT/'content/posts/mlops-production-systems.md'
    table=(OUT/'results-table.md').read_text().strip()
    text=article.read_text()
    block='<!-- MLOPS_TABLE_START -->\n\n'+table+'\n\n<!-- MLOPS_TABLE_END -->'
    text,count=re.subn(r'<!-- MLOPS_TABLE_START -->.*?<!-- MLOPS_TABLE_END -->',lambda _:block,text,flags=re.S)
    assert count==1, 'Missing article results marker'
    article.write_text(text)
