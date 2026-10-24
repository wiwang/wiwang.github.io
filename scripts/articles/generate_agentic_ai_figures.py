"""Illustrative Tempo Loop agent design and synthetic schedule scenarios.

No customer data, LLM API calls, or measured Tempo agent results are used.
"""
from pathlib import Path
import csv
import json
import re
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/posts/agentic-ai-tempo-loop'
OUT.mkdir(parents=True, exist_ok=True)
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'figure.facecolor':'#faf9f6','axes.facecolor':'#faf9f6','savefig.facecolor':'#faf9f6','axes.spines.top':False,'axes.spines.right':False,'svg.fonttype':'path','svg.hashsalt':'wiwang-loop-agent'})
BLUE,ORANGE,GREEN='#355e85','#b7693b','#527b67'

def save(fig,name):
    fig.savefig(OUT/f'{name}.svg',bbox_inches='tight',metadata={'Date':None})
    fig.savefig(OUT/f'{name}.png',bbox_inches='tight',dpi=180)
    plt.close(fig)

def write_csv(name,rows):
    with (OUT/name).open('w',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=rows[0]);writer.writeheader();writer.writerows(rows)

def architecture():
    fig,ax=plt.subplots(figsize=(8,9))
    ax.set(xlim=(0,10),ylim=(0,12));ax.axis('off')
    def box(x,y,w,h,title,body,color=BLUE):
        ax.add_patch(FancyBboxPatch((x,y),w,h,boxstyle='round,pad=.08',facecolor='white',edgecolor=color,lw=1.2))
        ax.text(x+w/2,y+h-.3,title,ha='center',va='center',fontsize=10,weight='bold',color=color)
        ax.text(x+w/2,y+.35,body,ha='center',va='center',fontsize=8.5,linespacing=1.5)
    def arrow(a,b,color=BLUE):
        ax.add_patch(FancyArrowPatch(a,b,arrowstyle='-|>',mutation_scale=12,color=color,lw=1.2))
    box(.2,10.3,9.6,1.2,'Question + versioned Tempo Loop view','Selected project · time range · filters · user intent | not authorization')
    box(.2,8.1,4.5,1.25,'Profile + interaction memory','Preferences · prior decisions\nProvenance, scope, expiry, corrections')
    box(5.3,8.1,4.5,1.25,'Live state + RAG evidence','Jira / activity tools · retrieved docs\nAuthorized records, versions, timestamps')
    arrow((2.4,10.2),(2.4,9.5));arrow((7.6,10.2),(7.6,9.5))
    box(.2,5.8,9.6,1.3,'Context assembly + bounded planning','Resolve scope → fetch evidence → resolve conflicts → budget tokens')
    arrow((2.4,8),(2.4,7.25));arrow((7.6,8),(7.6,7.25))
    box(.2,3.5,4.5,1.3,'Typed read / analysis tools','Current counts, dependencies, metrics\nForecast simulation with explicit assumptions')
    box(5.3,3.5,4.5,1.3,'Evidence + result validation','Source support, freshness, coverage\nNumbers, uncertainty, authorization')
    arrow((2.4,5.7),(2.4,4.95));arrow((4.85,4.15),(5.15,4.15),ORANGE)
    ax.text(6.3,5.25,'Bounded replan',ha='center',fontsize=8.5,color='#687078')
    arrow((7.6,4.95),(7.6,5.7),ORANGE)
    box(.2,1.15,9.6,1.3,'Answer anchored to the original request','Facts + source references | interpretation | scenarios | suggested next steps',GREEN)
    arrow((7.6,3.4),(7.6,2.6),GREEN)
    ax.text(5,.4,'Illustrative reference design, not Tempo’s private production topology.\nMutations, if added, require a separate authorization and confirmation path.',ha='center',fontsize=8.5,color='#687078')
    fig.tight_layout();save(fig,'agent-context-architecture')

def forecast():
    tasks=[
        {'issue_key':'DEMO-201','task':'Scope confirmation','median_workdays':2.0,'depends_on':[]},
        {'issue_key':'DEMO-202','task':'API implementation','median_workdays':6.0,'depends_on':['DEMO-201']},
        {'issue_key':'DEMO-203','task':'UI implementation','median_workdays':4.0,'depends_on':['DEMO-201']},
        {'issue_key':'DEMO-204','task':'Integration','median_workdays':3.0,'depends_on':['DEMO-202','DEMO-203']},
        {'issue_key':'DEMO-205','task':'Validation','median_workdays':4.0,'depends_on':['DEMO-204']},
        {'issue_key':'DEMO-206','task':'Release preparation','median_workdays':1.0,'depends_on':['DEMO-205']},
    ]
    fig,ax=plt.subplots(figsize=(9,4.2));ax.set(xlim=(-.6,4.6),ylim=(-1.7,1.5));ax.axis('off')
    positions=[(0,0),(1,.8),(1,-.8),(2,0),(3,0),(4,0)]
    lookup={task['issue_key']:position for task,position in zip(tasks,positions)}
    for task,(x,y) in zip(tasks,positions):
        for dep in task['depends_on']:
            dx,dy=lookup[dep]
            ax.add_patch(FancyArrowPatch((dx+.37,dy),(x-.37,y),arrowstyle='-|>',mutation_scale=11,color=BLUE,lw=1.2))
    for task,(x,y) in zip(tasks,positions):
        ax.add_patch(FancyBboxPatch((x-.36,y-.34),.72,.68,boxstyle='round,pad=.03',edgecolor=ORANGE if task['issue_key']=='DEMO-202' else BLUE,facecolor='white',lw=1.2))
        name={'Scope confirmation':'Scope','API implementation':'API','UI implementation':'UI','Integration':'Integrate','Validation':'Validate','Release preparation':'Release'}[task['task']]
        ax.text(x,y+.12,task['issue_key'],ha='center',fontsize=8)
        ax.text(x,y-.08,f"{name}\nmedian {task['median_workdays']:g}d",ha='center',va='center',fontsize=8,linespacing=1.4)
    ax.set_title('A fictional remaining-work dependency graph',pad=10)
    ax.text(2,-1.5,'Parallel branches share no constrained resources in this simplified simulation.',ha='center',fontsize=8.5,color='#687078')
    fig.tight_layout();save(fig,'project-dependencies')
    rng=np.random.default_rng(20261024);n=40000
    durations={t['issue_key']:rng.lognormal(np.log(t['median_workdays']),.35,n) for t in tasks}
    delays=(rng.random(n)<.35)*rng.uniform(3,8,n)
    samples={}
    for scenario in ['Baseline','Unresolved API blocker']:
        finish={}
        for task in tasks:
            key=task['issue_key']
            start=np.maximum.reduce([finish[d] for d in task['depends_on']]) if task['depends_on'] else np.zeros(n)
            duration=durations[key]+(delays if scenario!='Baseline' and key=='DEMO-202' else 0)
            finish[key]=start+duration
        samples[scenario]=finish['DEMO-206']
    assert np.all(samples['Unresolved API blocker']>=samples['Baseline'])
    summary=[]
    for name,values in samples.items():
        qs=np.quantile(values,[.5,.8,.95])
        summary.append({'scenario':name,'p50_workdays':float(qs[0]),'p80_workdays':float(qs[1]),'p95_workdays':float(qs[2]),'probability_by_day_20':float(np.mean(values<=20))})
    fig,ax=plt.subplots(figsize=(7.5,4.8))
    for (name,values),color in zip(samples.items(),[BLUE,ORANGE]):
        ordered=np.sort(values)
        ax.plot(ordered,np.arange(1,n+1)/n,label=name,color=color,lw=2)
    ax.axvline(20,color='#687078',ls='--',label='Illustrative deadline: day 20')
    ax.axhline(.8,color=GREEN,ls=':',label='80% cumulative probability')
    ax.set(xlabel='Remaining working days',ylabel='Simulated probability of completion',title='A blocker changes the completion distribution',xlim=(8,38),ylim=(0,1))
    ax.grid(alpha=.15);ax.legend(fontsize=9,loc='lower right');fig.tight_layout();save(fig,'completion-scenarios')
    write_csv('synthetic-project-tasks.csv',[{**t,'depends_on':';'.join(t['depends_on'])} for t in tasks])
    write_csv('forecast-summary.csv',summary)
    write_csv('forecast-samples.csv',[{'sample':i,'baseline_workdays':float(samples['Baseline'][i]),'blocker_workdays':float(samples['Unresolved API blocker'][i])} for i in range(n)])
    (OUT/'forecast-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
    table='| Scenario | P50 workdays | P80 workdays | P95 workdays | Finish by day 20 |\n| --- | --- | --- | --- | --- |\n'+'\n'.join(f"| {r['scenario']} | {r['p50_workdays']:.1f} | {r['p80_workdays']:.1f} | {r['p95_workdays']:.1f} | {r['probability_by_day_20']:.1%} |" for r in summary)
    (OUT/'results-table.md').write_text(table+'\n')
    article=ROOT/'content/posts/agentic-ai-tempo-loop.md'
    if article.exists():
        block='<!-- AGENT_FORECAST_START -->\n\n'+table+'\n\n<!-- AGENT_FORECAST_END -->'
        text,count=re.subn(r'<!-- AGENT_FORECAST_START -->.*?<!-- AGENT_FORECAST_END -->',lambda _:block,article.read_text(),flags=re.S)
        assert count==1,'Missing forecast results marker'
        article.write_text(text)
    print(table)

if __name__=='__main__':
    architecture();forecast()
