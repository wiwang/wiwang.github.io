"""Exact illustrative reliability calculations and constructed contract failures.

No benchmark run, trained model, LLM judge, or Tempo/customer data is used.
"""
from pathlib import Path
import csv
import json
import shutil
import math
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
from loop_eval_contracts import evaluate

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/posts/tempo-loop-agent-evals'
OUT.mkdir(parents=True, exist_ok=True)
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'figure.facecolor':'#faf9f6','axes.facecolor':'#faf9f6','savefig.facecolor':'#faf9f6','axes.spines.top':False,'axes.spines.right':False,'svg.fonttype':'path','svg.hashsalt':'wiwang-loop-evals'})


def save(fig, name):
    fig.savefig(OUT / f'{name}.svg', bbox_inches='tight', metadata={'Date':None})
    fig.savefig(OUT / f'{name}.png', bbox_inches='tight', dpi=180)
    plt.close(fig)


def csv_file(name, rows):
    with (OUT/name).open('w',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=rows[0]);writer.writeheader();writer.writerows(rows)


def reliability():
    rows=[]
    fig, axes=plt.subplots(1,2,figsize=(11,4.3),sharey=True)
    for p,color in [(0.8,'#89949f'),(0.9,'#355e85'),(0.95,'#b7693b')]:
        ks=list(range(1,9))
        all_success=[p**k for k in ks]
        any_success=[1-(1-p)**k for k in ks]
        for k,a,b in zip(ks,all_success,any_success):
            rows.append({'per_task_p':p,'k':k,'all_k_success':a,'at_least_one_success':b})
        axes[0].plot(ks,all_success,'o-',label=f'p = {p:.2f}',color=color)
        axes[1].plot(ks,any_success,'o-',label=f'p = {p:.2f}',color=color)
    axes[0].set_title('Reliability: every attempt succeeds')
    axes[1].set_title('Search: at least one attempt succeeds')
    for ax in axes:
        ax.set_xlabel('Independent attempts, k');ax.set_xticks([1,2,4,6,8]);ax.set_ylim(0,1.04);ax.grid(alpha=.18);ax.legend(loc='lower left',frameon=False)
    axes[0].set_ylabel('Probability under a fixed hypothetical p')
    fig.suptitle('A high best-of-many result does not imply repeatable success',fontsize=13)
    fig.tight_layout(rect=(0,.09,1,.96))
    fig.text(.5,.015,'Exact formulas under independent, identically distributed attempts; not measured agent results.',ha='center',fontsize=9,color='#687078')
    save(fig,'repeated-reliability');csv_file('reliability.csv',rows)
    upper=[{'independent_cases':n,'failures':0,'one_sided_95_upper_failure_rate':1-.05**(1/n)} for n in [60,300,1000]]
    csv_file('zero-failure-bounds.csv',upper)
    assert abs(.9**8-.43046721)<1e-12
    # A finite-trial all-success estimator is not (c/n)^k.
    assert math.comb(3,2)/math.comb(4,2)==.5


def architecture():
    fig,ax=plt.subplots(figsize=(10,8));ax.set_xlim(0,10);ax.set_ylim(0,8);ax.axis('off')
    def box(x,y,w,h,title,body,color='#355e85'):
        ax.add_patch(FancyBboxPatch((x,y),w,h,boxstyle='round,pad=0.04,rounding_size=.08',facecolor='white',edgecolor=color,linewidth=1.5))
        ax.text(x+w/2,y+h*.72,title,ha='center',va='center',fontsize=12,fontweight='bold',color=color)
        ax.text(x+w/2,y+h*.31,body,ha='center',va='center',fontsize=10,linespacing=1.5)
    def arrow(a,b): ax.add_patch(FancyArrowPatch(a,b,arrowstyle='-|>',mutation_scale=13,color='#687078',linewidth=1.3))
    box(.2,6.4,4.45,1.25,'Freeze the task world','UI scope · identity · clock · memory\nTool schemas · documents · database snapshot')
    box(5.35,6.4,4.45,1.25,'Define the task contract','Required facts and outcomes\nForbidden actions · allowed evidence')
    arrow((2.4,6.3),(2.4,5.75));arrow((7.6,6.3),(7.6,5.75))
    box(.2,4.5,9.6,1.2,'Run the agent against a resettable sandbox','Versioned configuration · bounded tools · per-trial reset · reproducible traces')
    for x in [1.7,5,8.3]:arrow((x,4.4),(x,3.85))
    box(.2,2.25,2.9,1.55,'Execution checks','Scope · values · state\nPermissions · no writes',color='#517f6b')
    box(3.55,2.25,2.9,1.55,'Evidence checks','Coverage · freshness\nClaim-to-source support',color='#355e85')
    box(6.9,2.25,2.9,1.55,'Calibrated judges','Narrow rubric · abstain\nAudit against human labels',color='#b7693b')
    for x in [1.7,5,8.3]:arrow((x,2.15),(x,1.6))
    box(.2,.3,9.6,1.25,'Release decision with a failure diagnosis','Task success + invariants + repeated-run reliability + cost/latency + uncertainty')
    fig.text(.5,.015,'Proposed Tempo Loop evaluation design; illustrative architecture, not a private deployment diagram.',ha='center',fontsize=9,color='#687078')
    save(fig,'evaluation-contract')


def fixtures():
    gold={'project':'DEMOA','required_facts':{'blocked_issue_count':2,'remaining_hours':6},'current_sources':['DEMOA:issues:v3','DEMOA:decision:v2']}
    base={'resolved_project':'DEMOA','tool_calls':[{'name':'read_issue_snapshot','project':'DEMOA'},{'name':'read_decisions','project':'DEMOA'}], 'writes':[], 'claims':dict(gold['required_facts']), 'citations':list(gold['current_sources'])}
    traces=[]
    def add(name,**changes):
        record=json.loads(json.dumps(base));record.update(changes);record['id']=name;traces.append(record)
    add('correct_direct')
    add('correct_reordered',tool_calls=list(reversed(base['tool_calls'])))
    add('wrong_scope_coincidence',resolved_project='DEMOB',tool_calls=[{'name':'read_issue_snapshot','project':'DEMOB'}])
    add('stale_citations',citations=['DEMOA:issues:v1'])
    add('duplicated_join',claims={'blocked_issue_count':2,'remaining_hours':12})
    add('unauthorized_write',writes=[{'action':'change_priority','issue':'DEMOA-1'}])
    add('missing_required_fact',claims={'remaining_hours':6})
    add('unsupported_forecast',claims={**gold['required_facts'],'completion_date':'2026-11-04'})
    bundle={'note':'Constructed structured traces, not agent runs. Grader sees metadata and claims, not hidden reasoning.','gold':gold,'traces':traces}
    (OUT/'contract-fixtures.json').write_text(json.dumps(bundle,indent=2)+'\n')
    results=evaluate(bundle);assert sum(r['strict_success'] for r in results)==2
    assert sum(r['factual_core'] for r in results)==6
    assert all(r['strict_success'] for r in results[:2])
    csv_file('contract-results.csv',results)
    shutil.copyfile(ROOT/'scripts/articles/loop_eval_contracts.py',OUT/'loop_eval_contracts.py')
    lines=['| Constructed trace | Required numerical facts | Failed contract checks | Strict success |','| --- | --- | --- | --- |']
    for row in results:
        failed=', '.join(k.replace('_',' ') for k,v in row.items() if k not in ['trace_id','factual_core','strict_success'] and not v)
        if not row['factual_core']:failed=', '.join(filter(None,[failed,'required facts']))
        lines.append(f"| {row['trace_id'].replace('_',' ')} | {'Pass' if row['factual_core'] else 'Fail'} | {failed or 'None'} | {'Pass' if row['strict_success'] else 'Fail'} |")
    table='\n'.join(lines)+'\n'
    (OUT/'results-table.md').write_text(table)
    article=ROOT/'content/posts/tempo-loop-agent-evals.md'
    if article.exists():
        text=article.read_text()
        start='<!-- LOOP_EVAL_RESULTS_START -->'
        end='<!-- LOOP_EVAL_RESULTS_END -->'
        if start in text and end in text:
            before,rest=text.split(start,1)
            _,after=rest.split(end,1)
            article.write_text(before+start+'\n\n'+table+'\n'+end+after)


if __name__=='__main__':
    reliability();architecture();fixtures();print('Exported exact reliability calculations, architecture, and eight constructed contract traces.')
