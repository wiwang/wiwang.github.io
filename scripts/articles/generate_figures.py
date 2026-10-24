"""Reproduce the bias–variance experiment. No external data."""
from pathlib import Path
import csv
import json
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[2]
plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 10, 'axes.spines.top': False, 'axes.spines.right': False, 'axes.labelcolor': '#374151', 'text.color': '#242b31', 'axes.titleweight': 'normal', 'savefig.facecolor': '#faf9f6', 'figure.facecolor': '#faf9f6', 'axes.facecolor': '#faf9f6', 'svg.fonttype': 'path', 'svg.hashsalt': 'wiwang-article-figures'})
BLUE, ORANGE, GREEN = '#355e85', '#b7693b', '#527b67'

def save(fig, directory, name):
    fig.savefig(directory / f'{name}.svg', bbox_inches='tight', metadata={'Date': None})
    fig.savefig(directory / f'{name}.png', dpi=180, bbox_inches='tight')
    plt.close(fig)

def write_csv(file, rows):
    with file.open('w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)

def bias_variance():
    out = ROOT / 'public/posts/Bias-Variance'
    rng = np.random.default_rng(42)
    x = np.linspace(-1, 1, 25)
    grid = np.linspace(-1, 1, 401)
    truth = np.sin(np.pi * grid)
    sigma = .25
    ys = np.sin(np.pi * x)[None, :] + rng.normal(0, sigma, (500, len(x)))
    rows, curves = [], {}
    for degree in range(1, 16):
        train_design = np.polynomial.legendre.legvander(x, degree)
        test_design = np.polynomial.legendre.legvander(grid, degree)
        weights = np.linalg.lstsq(train_design, ys.T, rcond=None)[0]
        predictions = (test_design @ weights).T
        train_predictions = (train_design @ weights).T
        mean = predictions.mean(axis=0)
        bias2 = np.mean((mean - truth)**2)
        variance = np.mean(np.var(predictions, axis=0, ddof=0))
        # Exact finite-Monte-Carlo identity, integrating uniformly over the grid.
        signal_error = np.mean((predictions - truth)**2)
        assert np.isclose(signal_error, bias2 + variance)
        rows.append({'degree': degree, 'bias_squared': float(bias2), 'variance': float(variance), 'noise': sigma**2, 'expected_test_mse': float(signal_error + sigma**2), 'training_mse': float(np.mean((train_predictions - ys)**2))})
        curves[degree] = predictions
    fig, axes = plt.subplots(3, 1, figsize=(7.2, 8.5), sharex=True, sharey=True)
    for ax, degree, label in zip(axes, [1, 3, 12], ['Underfitting', 'A useful middle ground', 'More sensitivity to noise']):
        ax.plot(grid, curves[degree][:20].T, color=BLUE, alpha=.14, lw=.8)
        ax.plot(grid, curves[degree].mean(axis=0), color=BLUE, lw=2, label='Mean fitted prediction')
        ax.plot(grid, truth, color=ORANGE, lw=2, linestyle='--', label='True signal')
        ax.set(title=f'Degree {degree} · {label}', ylabel='Prediction', ylim=(-1.8, 1.8))
        ax.grid(alpha=.15)
    axes[-1].set_xlabel('Input x')
    axes[0].legend(loc='upper left', fontsize=8)
    fig.suptitle('Same inputs, different training noise', fontsize=14, y=1.01)
    fig.tight_layout(h_pad=2)
    save(fig, out, 'fit-stability')
    fig, ax = plt.subplots(figsize=(7.2, 4.6))
    degrees = [r['degree'] for r in rows]
    for key, label, color, style in [('bias_squared','Squared bias',BLUE,'-'),('variance','Variance',ORANGE,'-'),('expected_test_mse','Expected test MSE',GREEN,'-'),('training_mse','Training MSE','#89949f','--')]:
        ax.plot(degrees, [r[key] for r in rows], label=label, color=color, linestyle=style, lw=2)
    ax.axhline(sigma**2, color='#89949f', linestyle=':', label='Noise variance')
    ax.set(xlabel='Polynomial degree', ylabel='Mean squared error', title='Complexity changes where the error comes from')
    ax.set_xticks([1,3,5,7,9,12,15]); ax.grid(alpha=.15); ax.legend(fontsize=9, ncol=2)
    fig.tight_layout(); save(fig, out, 'error-decomposition')
    write_csv(out / 'experiment.csv', rows)
    return rows

if __name__ == '__main__':
    results = {'bias_variance':bias_variance()}
    (ROOT/'scripts/articles/results.json').write_text(json.dumps(results,indent=2)+'\n')
    print(json.dumps(results,indent=2))

    # Keep the article tables synchronized with the experiment outputs.
    import re
    bv_rows = [r for r in results['bias_variance'] if r['degree'] in [1,3,12]]
    bv_table = '| Degree | Squared bias | Variance | Expected test MSE | Training MSE |\n| --- | --- | --- | --- | --- |\n' + '\n'.join(f"| {r['degree']} | {r['bias_squared']:.5f} | {r['variance']:.5f} | {r['expected_test_mse']:.5f} | {r['training_mse']:.5f} |" for r in bv_rows)
    for filename, key, table in [('Bias-Variance.md','BIAS',bv_table)]:
        article = ROOT / 'content/posts' / filename
        text = article.read_text()
        block = f'<!-- {key}_TABLE_START -->\n\n{table}\n\n<!-- {key}_TABLE_END -->'
        text = text.replace(f'<!-- {key}_TABLE -->', block)
        text = re.sub(f'<!-- {key}_TABLE_START -->.*?<!-- {key}_TABLE_END -->', lambda _: block, text, flags=re.S)
        article.write_text(text)
