"""Synthetic Jira-shaped activity-to-issue benchmark. No Tempo/customer data."""
from pathlib import Path
import csv,json,re
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public/posts/recomendation'
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'figure.facecolor':'#faf9f6','axes.facecolor':'#faf9f6','savefig.facecolor':'#faf9f6','axes.spines.top':False,'axes.spines.right':False,'svg.fonttype':'path','svg.hashsalt':'wiwang-jira-ranking'})
def csv_file(name,rows):
    with (OUT/name).open('w',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=rows[0]);writer.writeheader();writer.writerows(rows)
def save(fig,name):
    fig.savefig(OUT/f'{name}.svg',bbox_inches='tight',metadata={'Date':None})
    fig.savefig(OUT/f'{name}.png',bbox_inches='tight',dpi=180);plt.close(fig)
def run(seed):
    rng=np.random.default_rng(seed);nu,ni,nt=200,150,5
    workstreams=np.arange(ni)%nt; user_stream=np.arange(nu)%nt
    issue_keys=[f'DEMO-{101+i}' for i in range(ni)]
    prototypes=np.eye(nt)[workstreams]
    descriptors=np.concatenate([prototypes,rng.normal(0,.35,(ni,8))],axis=1)
    descriptors/=np.linalg.norm(descriptors,axis=1,keepdims=True)
    training=np.zeros((nu,ni)); positive_lists=[];test=[];events=[]
    for u in range(nu):
        probabilities=np.where(workstreams==user_stream[u],.85/30,.15/120)
        sequence=rng.choice(ni,20,replace=True,p=probabilities)
        positive_lists.append(sequence[:16])
        for day,i in enumerate(sequence):
            events.append({'organization_id':'synthetic-org','user_id':f'user-{u:03d}','activity_day':day,'confirmed_issue_key':issue_keys[i],'split':'train' if day<16 else 'test'})
            if day<16:training[u,i]+=1
            else:
                context=descriptors[i]+rng.normal(0,.35,descriptors.shape[1]);context/=np.linalg.norm(context)
                test.append((u,int(i),context))
    assert all(day['activity_day']<16 for day in events if day['split']=='train')
    p=rng.normal(0,.1,(nu,16));q=rng.normal(0,.1,(ni,16))
    negative_lists=[np.flatnonzero(row==0) for row in training]
    for epoch in range(50):
        for u in rng.integers(0,nu,nu*16):
            i=rng.choice(positive_lists[u]);j=rng.choice(negative_lists[u])
            pu,qi,qj=p[u].copy(),q[i].copy(),q[j].copy()
            g=1/(1+np.exp(np.clip(pu@(qi-qj),-40,40)))
            p[u]+=.04*(g*(qi-qj)-.01*pu)
            q[i]+=.04*(g*pu-.01*qi);q[j]+=.04*(-g*pu-.01*qj)
    bpr=p@q.T
    bpr_normal=(bpr-bpr.mean(axis=1,keepdims=True))/np.maximum(bpr.std(axis=1,keepdims=True),1e-12)
    models=['Issue popularity','User–issue BPR','Activity similarity','Context + history']
    metrics={name:[] for name in models}
    for u,target,context in test:
        similarity=descriptors@context
        scores=[training.sum(axis=0),bpr[u],similarity,similarity+.1*bpr_normal[u]]
        for name,score in zip(models,scores):
            # Recurring work is valid: previously linked issues are NOT masked.
            order=np.argsort(-score,kind='stable');rank=int(np.flatnonzero(order==target)[0])+1
            metrics[name].append((rank==1,rank<=5,1/rank))
    rows=[]
    for model in models:
        a=np.asarray(metrics[model],float)
        rows.append({'seed':seed,'model':model,'top_1':float(a[:,0].mean()),'top_5':float(a[:,1].mean()),'mrr':float(a[:,2].mean())})
    if seed==7:
        csv_file('synthetic-jira-events.csv',events)
        csv_file('synthetic-issue-catalog.csv',[{'organization_id':'synthetic-org','issue_key':key,'workstream_id':int(workstreams[i]),'synthetic_title':f'Illustrative work item {i+1}',**{f'descriptor_{j:02d}':float(v) for j,v in enumerate(descriptors[i])}} for i,key in enumerate(issue_keys)])
        context_rows=[]
        counter={}
        for u,target,context in test:
            day=counter.get(u,16);counter[u]=day+1
            context_rows.append({'organization_id':'synthetic-org','user_id':f'user-{u:03d}','activity_day':day,**{f'activity_embedding_{j:02d}':float(v) for j,v in enumerate(context)}})
        csv_file('synthetic-test-context.csv',context_rows)
        assert len(context_rows)==800 and all(value==20 for value in counter.values())
        fig,ax=plt.subplots(figsize=(7.5,4.3))
        image=training[np.argsort(user_stream,kind='stable')][:,np.argsort(workstreams,kind='stable')]
        ax.imshow(image,cmap='Blues',aspect='auto',interpolation='nearest',vmin=0,vmax=4)
        ax.set(title='Synthetic confirmed user–Jira issue links',xlabel='Issues sorted by latent workstream',ylabel='Users sorted by primary workstream')
        fig.tight_layout();save(fig,'jira-interactions')
    return rows
if __name__=='__main__':
    rows=[]
    for seed in [7,17,27,37,47]:rows+=run(seed)
    summary=[]
    for name in ['Issue popularity','User–issue BPR','Activity similarity','Context + history']:
        record={'model':name}
        for key in ['top_1','top_5','mrr']:
            values=[r[key] for r in rows if r['model']==name]
            record[key+'_mean']=float(np.mean(values));record[key+'_std']=float(np.std(values,ddof=1))
        assert 0 <= record['top_1_mean'] <= record['top_5_mean'] <= 1
        assert record['top_1_mean'] <= record['mrr_mean'] <= 1
        summary.append(record)
    fig,axes=plt.subplots(2,1,figsize=(7.5,7),sharex=True)
    for ax,key,label in zip(axes,['top_1','top_5'],['Top-1 accuracy','Top-5 accuracy']):
        ax.bar(np.arange(4),[r[key+'_mean'] for r in summary],yerr=[r[key+'_std'] for r in summary],color=['#89949f','#b7693b','#355e85','#527b67'],capsize=4,width=.6)
        ax.set(ylabel=label,ylim=(0,1));ax.grid(axis='y',alpha=.15);ax.set_axisbelow(True)
    axes[1].set_xticks(np.arange(4),['Issue\npopularity','User–issue\nBPR','Activity\nsimilarity','Context +\nhistory'])
    axes[0].set_title('Infer the active issue from synthetic activity context\nMean ± sample standard deviation across five runs',pad=14)
    fig.tight_layout();save(fig,'jira-ranking-results')
    csv_file('jira-experiment-runs.csv',rows);csv_file('jira-experiment-summary.csv',summary)
    (ROOT/'scripts/articles/jira-results.json').write_text(json.dumps(summary,indent=2)+'\n')
    table='| Model | Top-1 accuracy | Top-5 accuracy | MRR |\n| --- | --- | --- | --- |\n'+'\n'.join('| '+r['model']+' | '+' | '.join(f"{r[key+'_mean']:.3f} ± {r[key+'_std']:.3f}" for key in ['top_1','top_5','mrr'])+' |' for r in summary)
    (OUT/'jira-results-table.md').write_text(table+'\n')
    print(table)

    article=ROOT/'content/posts/recomendation.md'
    text=article.read_text()
    block='<!-- JIRA_TABLE_START -->\n\n'+table+'\n\n<!-- JIRA_TABLE_END -->'
    text,count=re.subn(r'<!-- JIRA_TABLE_START -->.*?<!-- JIRA_TABLE_END -->',lambda _:block,text,flags=re.S)
    assert count==1, 'Missing article results marker'
    article.write_text(text)
