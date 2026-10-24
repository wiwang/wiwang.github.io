"""A synthetic, deterministic UI-scoped retrieval study, not an LLM benchmark.

All methods apply the same authorization and temporal filters. No external data,
embedding model, language-model API, or customer information is used.
"""
from pathlib import Path
from collections import Counter
import csv
import json
import re
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/posts/rag-tempo-loop'
OUT.mkdir(parents=True, exist_ok=True)
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'figure.facecolor':'#faf9f6','axes.facecolor':'#faf9f6','savefig.facecolor':'#faf9f6','axes.spines.top':False,'axes.spines.right':False,'svg.fonttype':'path','svg.hashsalt':'wiwang-rag'})
COLORS = ['#89949f','#b7693b','#355e85']
AS_OF = '2025-11-11'
STOP = {'the','a','an','is','are','this','it','to','for','of','in','on','we','our','what','who','when','can','may','be','and','do','does','how'}

def save(fig,name):
    fig.savefig(OUT/f'{name}.svg',bbox_inches='tight',metadata={'Date':None})
    fig.savefig(OUT/f'{name}.png',bbox_inches='tight',dpi=180)
    plt.close(fig)

def write_csv(name,rows):
    with (OUT/name).open('w',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=rows[0]);writer.writeheader();writer.writerows(rows)

def tokens(text):
    return [t for t in re.findall(r'[a-z0-9]+(?:-[a-z0-9]+)*',text.lower()) if t not in STOP]

EXPANSIONS = {
    'ship':'release deadline milestone target',
    'slip':'blocker dependency release deadline',
    'clear':'owner ownership blocker dependency',
    'ready':'acceptance verification blocker',
    'bandwidth':'capacity allocation availability',
}

def architecture():
    fig,ax=plt.subplots(figsize=(8,9));ax.set(xlim=(0,10),ylim=(0,12));ax.axis('off')
    def box(x,y,w,h,title,body,color='#355e85'):
        ax.add_patch(FancyBboxPatch((x,y),w,h,boxstyle='round,pad=.08',facecolor='white',edgecolor=color,lw=1.2))
        ax.text(x+w/2,y+h-.3,title,ha='center',va='center',fontsize=10,weight='bold',color=color)
        ax.text(x+w/2,y+.35,body,ha='center',va='center',fontsize=8.5,linespacing=1.5)
    def arrow(a,b):
        ax.add_patch(FancyArrowPatch(a,b,arrowstyle='-|>',mutation_scale=12,color='#355e85',lw=1.2))
    box(.2,10.3,4.5,1.2,'Ingest + version knowledge','Jira / decisions / project docs\nSource IDs, permissions, valid time')
    box(5.3,10.3,4.5,1.2,'Resolve the question','Explicit intent + captured UI scope\nAuthenticated user, project, as-of time')
    box(.2,8.0,4.5,1.3,'Structure-aware chunks','Parent context + stable revision IDs\nLexical index + embedding index')
    box(5.3,8.0,4.5,1.3,'Authorized candidate universe','Tenant / resource / time constraints\nIndependent of relevance scores')
    arrow((2.45,10.2),(2.45,9.45));arrow((7.55,10.2),(7.55,9.45))
    box(.2,5.6,9.6,1.3,'Retrieve → fuse → rerank → select evidence','Exact identifiers + semantic matches | diversity, evidence coverage, token budget')
    arrow((2.45,7.9),(2.45,7.05));arrow((7.55,7.9),(7.55,7.05))
    box(.2,3.3,4.5,1.3,'Agent reasoning + live tools','Use retrieved text as evidence\nQuery current facts / calculate as needed')
    box(5.3,3.3,4.5,1.3,'Verify + cite + expose gaps','Claim support, versions, scope\nFreshness, completeness, contradictions')
    arrow((2.45,5.5),(2.45,4.75));arrow((4.85,3.95),(5.15,3.95))
    box(.2,1.0,9.6,1.3,'Deliver an answer with an evidence ledger','Facts and sources | interpretation | assumptions | unresolved evidence','#527b67')
    arrow((7.55,3.2),(7.55,2.45))
    ax.text(5,.35,'Illustrative architecture for a Tempo Loop use case.\nRetrieved documents cannot grant permissions or override application instructions.',ha='center',fontsize=8.5,color='#687078')
    fig.tight_layout();save(fig,'rag-architecture')

def corpus_and_queries():
    docs=[]
    projects=['DEMOA','DEMOB','DEMOC','DEMOD','DEMOE','DEMOF']
    for tenant in ['synthetic-org-a','synthetic-org-b']:
        for project_no,project in enumerate(projects):
            facts={
                'deadline':f'{project} Release milestone target date is November {20+project_no}. The approved deadline is recorded in decision 01.',
                'blocker':f'{project} API integration has an unresolved blocker: dependency {project}-202 awaits interface contract approval.',
                'owner':f'{project} Ownership of dependency {project}-202 belongs to Delivery Group {project_no+1}. The owner coordinates contract approval.',
                'acceptance':f'{project} Acceptance requires integration verification tests and security signoff. The release must satisfy the definition of done.',
                'capacity':f'{project} Available team capacity allocation is four working days for the next planning window. Availability is a planning assumption.',
                'progress':f'{project} Status snapshot records six remaining issues, including the API integration work. This summary is illustrative.',
            }
            for kind,text in facts.items():
                for revision,start,end in [('old','2025-09-01','2025-11-01'),('current','2025-11-01','2025-12-01'),('future','2025-12-01','2026-01-01')]:
                    docs.append({'doc_id':f'{tenant}:{project}:{kind}:{revision}','tenant':tenant,'project':project,'kind':kind,'revision':revision,'available_at':start,'valid_from':start,'valid_to':end,'allowed':True,'text':text+(' Superseded planning record.' if revision=='old' else '')})
    # A private same-tenant record exists but is never an eligible search result.
    docs.append({'doc_id':'synthetic-private-note','tenant':'synthetic-org-a','project':'DEMOA','kind':'private','revision':'current','available_at':'2025-11-01','valid_from':'2025-11-01','valid_to':'2025-12-01','allowed':False,'text':'Private release deadline blocker ownership planning note.'})
    templates=[('When can this ship?',['deadline']),('Why might this slip?',['deadline','blocker']),('Who should clear this dependency?',['owner','blocker']),('Is this ready?',['acceptance','blocker']),('Do we have bandwidth?',['capacity'])]
    queries=[]
    for project in projects:
        for n,(question,kinds) in enumerate(templates):
            queries.append({'query_id':f'{project}-q{n+1}','tenant':'synthetic-org-a','ui_project':project,'as_of':AS_OF,'question':question,'gold_ids':[f'synthetic-org-a:{project}:{kind}:current' for kind in kinds]})
    return docs,queries

class BM25:
    def __init__(self,docs):
        self.docs=docs;self.counts=[Counter(tokens(d['text'])) for d in docs]
        self.lengths=np.array([sum(c.values()) for c in self.counts],float)
        self.mean_length=self.lengths.mean()
        self.df=Counter(term for c in self.counts for term in c)
    def score(self,query):
        values=np.zeros(len(self.docs));k1,b=1.2,.75
        for term in set(tokens(query)):
            df=self.df.get(term,0)
            idf=np.log(1+(len(self.docs)-df+.5)/(df+.5))
            for i,count in enumerate(self.counts):
                tf=count.get(term,0)
                values[i]+=idf*tf*(k1+1)/(tf+k1*(1-b+b*self.lengths[i]/self.mean_length))
        return values

def experiment():
    docs,queries=corpus_and_queries()
    eligible=[d for d in docs if d['tenant']=='synthetic-org-a' and d['allowed'] and d['available_at']<=AS_OF and d['valid_from']<=AS_OF<d['valid_to']]
    assert len(eligible)==36 and len(queries)==30
    bm=BM25(eligible)
    methods=['BM25 without UI scope','UI-scoped BM25','UI scope + term expansion']
    rows=[];rankings=[]
    for q in queries:
        for method in methods:
            query=q['question']
            if method==methods[2]:
                query+=' '+' '.join(EXPANSIONS[t] for t in tokens(query) if t in EXPANSIONS)
            scores=bm.score(query)
            candidates=[i for i,d in enumerate(eligible) if method==methods[0] or d['project']==q['ui_project']]
            order=sorted(candidates,key=lambda i:(-scores[i],eligible[i]['doc_id']))
            ranked=[eligible[i]['doc_id'] for i in order]
            assert all(eligible[i]['allowed'] and eligible[i]['tenant']==q['tenant'] and eligible[i]['revision']=='current' for i in order)
            rankings.append({'query_id':q['query_id'],'method':method,'question':q['question'],'ui_project':q['ui_project'],'top_6_ids':';'.join(ranked[:6]),'gold_ids':';'.join(q['gold_ids'])})
            gold=set(q['gold_ids'])
            for k in range(1,7):
                found=gold.intersection(ranked[:k])
                rows.append({'query_id':q['query_id'],'method':method,'k':k,'required_evidence_recall':len(found)/len(gold),'complete_evidence':int(found==gold)})
    summary=[]
    for method in methods:
        for k in range(1,7):
            subset=[r for r in rows if r['method']==method and r['k']==k]
            summary.append({'method':method,'k':k,'mean_required_evidence_recall':float(np.mean([r['required_evidence_recall'] for r in subset])),'complete_evidence_rate':float(np.mean([r['complete_evidence'] for r in subset]))})
    fig,ax=plt.subplots(figsize=(7.5,4.7))
    for method,color in zip(methods,COLORS):
        subset=[r for r in summary if r['method']==method]
        ax.plot([r['k'] for r in subset],[r['complete_evidence_rate'] for r in subset],marker='o',label=method,color=color,lw=2)
    ax.set(xlabel='Retrieved evidence units, K',ylabel='Queries with all required evidence',title='Does the retrieved set cover every required fact?',ylim=(0,1.05),xticks=range(1,7))
    ax.grid(alpha=.15);ax.legend(fontsize=8,loc='lower right');fig.tight_layout();save(fig,'evidence-coverage')
    at3=[r for r in summary if r['k']==3]
    fig,ax=plt.subplots(figsize=(7.5,4.7))
    x=np.arange(3)
    ax.bar(x-.18,[r['mean_required_evidence_recall'] for r in at3],width=.36,color='#355e85',label='Mean required-evidence recall')
    ax.bar(x+.18,[r['complete_evidence_rate'] for r in at3],width=.36,color='#527b67',label='Complete-evidence rate')
    ax.set(xticks=x,xticklabels=['BM25 without\nUI scope','UI-scoped\nBM25','UI scope +\nterm expansion'],ylabel='Fraction at K = 3',ylim=(0,1.05),title='Retrieval coverage, not generated-answer accuracy')
    ax.grid(axis='y',alpha=.15);ax.set_axisbelow(True);ax.legend(fontsize=8,loc='upper left');fig.tight_layout();save(fig,'retrieval-at-three')
    (OUT/'synthetic-corpus.json').write_text(json.dumps(docs,indent=2)+'\n')
    (OUT/'synthetic-queries.json').write_text(json.dumps(queries,indent=2)+'\n')
    write_csv('query-rankings.csv',rankings);write_csv('retrieval-results.csv',rows);write_csv('retrieval-summary.csv',summary)
    table='| Retrieval setup | Required-evidence recall@3 | Complete-evidence rate@3 |\n| --- | --- | --- |\n'+'\n'.join(f"| {r['method']} | {r['mean_required_evidence_recall']:.1%} | {r['complete_evidence_rate']:.1%} |" for r in at3)
    (OUT/'results-table.md').write_text(table+'\n')
    article=ROOT/'content/posts/rag-tempo-loop.md'
    if article.exists():
        block='<!-- RAG_RESULTS_START -->\n\n'+table+'\n\n<!-- RAG_RESULTS_END -->'
        text,count=re.subn(r'<!-- RAG_RESULTS_START -->.*?<!-- RAG_RESULTS_END -->',lambda _:block,article.read_text(),flags=re.S)
        assert count==1,'Missing retrieval results marker';article.write_text(text)
    print(table)

if __name__=='__main__':
    architecture();experiment()
