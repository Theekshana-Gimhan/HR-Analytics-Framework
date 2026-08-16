"""
P6 -- Cost attribution study for the NexusHR serverless architecture.

WHY THIS SCRIPT EXISTS
----------------------
RQ2 claims the framework runs for < LKR 10,000/month. The obvious way to
evidence that -- export the GCP bill for the project -- does not work here,
and the reason is worth stating plainly because it drives the whole method.

The `kpi-uat` project is SHARED. Alongside the three NexusHR services it also
hosts an Atlantis (Terraform) runner, a GitHub Actions runner dispatcher, a
commission-tracking app and a KPI dashboard. The single Cloud SQL instance
carries six databases, only two of which are ours. Artifact Registry holds
three repositories. A project-level bill would therefore charge this thesis
for infrastructure it does not use, overstating the cost by an unknown and
unauditable margin.

Resource-level attribution from billing data would need the *detailed* usage
BigQuery export, which is not enabled on any project on this billing account
and is NOT retroactive -- enabling it now yields only a fortnight of history.

So this script takes the other route:

    measured usage (Cloud Monitoring) x published unit price
        -> cost attributable to NexusHR resources only

This is arguably the more faithful answer to RQ2 rather than a fallback. The
claim under test is what an SME would pay, and an SME would deploy
single-tenant -- their own project, none of the shared runner infrastructure.
Attributing per resource models that deployment; a shared bill does not.

TWO SCENARIOS ARE REPORTED
--------------------------
  A. ATTRIBUTED   -- NexusHR's share of the current shared deployment.
                     Shared resources are apportioned and the apportionment
                     is disclosed.
  B. SINGLE-TENANT -- what a dedicated SME deployment costs, where the whole
                     Cloud SQL instance is ours. This is the figure RQ2 is
                     actually about, and it is the honest upper bound.

Both are reported with and without GCP's always-free tier, because for a
workload this small the free tier is not a rounding detail -- it may absorb
the entire compute cost, which is itself a finding.

HONESTY CONSTRAINTS
-------------------
  * Unit prices come from published rate cards, NOT from an invoice. They are
    declared in PUBLISHED_RATES with a source and a retrieval date, and the
    script prints a verification warning. Confirm them before submission.
  * Cloud SQL apportionment by database count is crude. It is stated as an
    assumption, and scenario B avoids it entirely.
  * Egress and Cloud Build are reported as unattributable-by-resource and
    excluded from the headline, with the reason given.
  * Usage is DEVELOPMENT traffic, not a live 50-employee SME workload. The
    script does not extrapolate; Ch5 must present measured and modelled
    figures separately and never present one as the other.

Outputs: reports/cost_analysis.json, reports/cost_analysis.png
Run:     python scripts/cost_analysis.py [--days 120] [--project kpi-uat]

Requires an active gcloud login (`gcloud auth login`); the access token is
taken from the gcloud CLI so no extra Python dependencies are needed.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parent.parent
REPORTS = ROOT / 'reports'

PROJECT = 'kpi-uat'
REGION = 'us-central1'

# ---------------------------------------------------------------------------
# Published unit prices -- us-central1, USD.
#
# VERIFY THESE AGAINST https://cloud.google.com/pricing BEFORE SUBMISSION.
# They are rate-card figures, not invoice figures. The thesis must say so.
# ---------------------------------------------------------------------------
PUBLISHED_RATES = {
    'source': 'Google Cloud published rate cards, us-central1',
    'retrieved': '2026-08-16',
    'currency': 'USD',
    'cloud_run_vcpu_second': 0.00002400,
    'cloud_run_gib_second': 0.00000250,
    'cloud_run_per_million_requests': 0.40,
    'cloud_sql_db_f1_micro_hour': 0.0105,      # shared-core instance
    'cloud_sql_pd_ssd_gb_month': 0.17,
    'artifact_registry_gb_month': 0.10,
    'gcs_standard_gb_month': 0.020,
}

# GCP always-free tier, per month (us-central1).
FREE_TIER = {
    'cloud_run_vcpu_seconds': 180_000,
    'cloud_run_gib_seconds': 360_000,
    'cloud_run_requests': 2_000_000,
    'artifact_registry_gb': 0.5,
    'gcs_standard_gb': 5.0,
}

# USD -> LKR. Stated with a date because FX moves and the thesis must be
# reproducible. Update and re-run before submission.
FX = {'usd_to_lkr': 302.0, 'rate_date': '2026-08-16',
      'source': 'declared in-script; confirm against CBSL indicative rate'}

# ---------------------------------------------------------------------------
# The NexusHR resources. Everything not listed here belongs to another system
# sharing kpi-uat and is deliberately excluded.
# ---------------------------------------------------------------------------
SERVICES = {
    'simpalahr-backend-dev':  {'vcpu': 1.0, 'mem_gib': 1.00, 'role': 'HR API'},
    'simpalahr-frontend-dev': {'vcpu': 1.0, 'mem_gib': 0.25, 'role': 'SPA host'},
    'simpalahr-ml-dev':       {'vcpu': 1.0, 'mem_gib': 1.00, 'role': 'ML inference'},
}

ARTIFACT_REPO = {'name': 'simpalahr', 'size_gb': 38644.609 / 1024}
GCS_BUCKET = {'name': 'kpi-uat-simpalahr-ml', 'size_gb': 10.10 / 1024}

# Shared Cloud SQL instance: staging-sql-instance (db-f1-micro, 10 GB PD_SSD).
# `postgres` is a system database and is excluded from the denominator.
SQL_INSTANCE = {
    'name': 'staging-sql-instance',
    'tier': 'db-f1-micro',
    'disk_gb': 10,
    'user_databases': ['staging-database', 'simpala_hr', 'simpalahr',
                       'acms', 'kpi_dashboard_mks'],
    'nexushr_databases': ['simpala_hr', 'simpalahr'],
}

# Costs that exist but cannot be attributed per-resource without the detailed
# billing export. Declared so the thesis discloses them rather than implying
# the attributed total is exhaustive.
UNATTRIBUTED = {
    'network_egress': 'Egress is billed per project, not per Cloud Run service. '
                      'Traffic is development-scale and shares the project with '
                      'CI runners, so no defensible split exists.',
    'cloud_build': 'Build minutes are shared with three other systems and the '
                   'first 120 minutes/day are free. Excluded from the headline; '
                   'noted as a deployment-time rather than operational cost.',
    'cloud_scheduler': 'simpalahr-ml-retrain-monthly is 1 job; the first 3 jobs '
                       'per billing account are free.',
}

MONITORING_API = 'https://monitoring.googleapis.com/v3/projects/{project}/timeSeries'


# ---------------------------------------------------------------------------
# Cloud Monitoring access
# ---------------------------------------------------------------------------
def access_token() -> str:
    """Take the token from the gcloud CLI so we need no extra Python deps."""
    try:
        out = subprocess.run(
            ['gcloud', 'auth', 'print-access-token'],
            capture_output=True, text=True, shell=True, timeout=60)
    except Exception as exc:  # pragma: no cover
        sys.exit('ERROR: could not invoke gcloud: %s' % exc)
    token = out.stdout.strip()
    if not token:
        sys.exit('ERROR: no access token. Run `gcloud auth login` first.\n' + out.stderr.strip())
    return token


def query_metric(token: str, project: str, metric: str, service: str,
                 start: datetime, end: datetime) -> tuple:
    """Sum a Cloud Run metric for one service over the window.

    Cloud Run emits one time series per revision, so a service with many
    deployments returns many series; all of them must be summed.
    """
    flt = ('metric.type="%s" AND resource.labels.service_name="%s"' % (metric, service))
    params = {
        'filter': flt,
        'interval.startTime': start.strftime('%Y-%m-%dT%H:%M:%SZ'),
        'interval.endTime': end.strftime('%Y-%m-%dT%H:%M:%SZ'),
        'aggregation.alignmentPeriod': '86400s',
        'aggregation.perSeriesAligner': 'ALIGN_SUM',
    }
    url = MONITORING_API.format(project=project) + '?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={'Authorization': 'Bearer ' + token})
    total, points, stamps = 0.0, 0, []
    while True:
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                payload = json.load(resp)
        except urllib.error.HTTPError as exc:
            sys.exit('ERROR: monitoring API %s -- %s' % (exc.code, exc.read().decode('utf8')[:400]))
        for series in payload.get('timeSeries', []):
            for pt in series.get('points', []):
                val = pt['value']
                num = val.get('doubleValue', val.get('int64Value', 0))
                total += float(num)
                points += 1
                stamps.append(pt['interval']['endTime'])
        nxt = payload.get('nextPageToken')
        if not nxt:
            break
        nurl = url + '&pageToken=' + urllib.parse.quote(nxt)
        req = urllib.request.Request(nurl, headers={'Authorization': 'Bearer ' + token})
    return total, points, stamps


# ---------------------------------------------------------------------------
# Cost model
# ---------------------------------------------------------------------------
def cloud_run_costs(token: str, project: str, start: datetime, end: datetime) -> dict:
    """Measured Cloud Run usage -> cost, per service, normalised per month."""
    days = (end - start).total_seconds() / 86400.0
    months = days / 30.4375
    out, observed = {}, []

    for name, spec in SERVICES.items():
        inst_sec, n_pts, stamps = query_metric(
            token, project, 'run.googleapis.com/container/billable_instance_time',
            name, start, end)
        reqs, _, _ = query_metric(
            token, project, 'run.googleapis.com/request_count', name, start, end)
        observed.extend(stamps)

        vcpu_sec = inst_sec * spec['vcpu']
        gib_sec = inst_sec * spec['mem_gib']

        gross = (vcpu_sec * PUBLISHED_RATES['cloud_run_vcpu_second']
                 + gib_sec * PUBLISHED_RATES['cloud_run_gib_second']
                 + (reqs / 1e6) * PUBLISHED_RATES['cloud_run_per_million_requests'])

        # Free tier applies monthly, so compare monthly-rate usage against it.
        vcpu_pm, gib_pm, req_pm = vcpu_sec / months, gib_sec / months, reqs / months
        billable = (max(0.0, vcpu_pm - FREE_TIER['cloud_run_vcpu_seconds'])
                    * PUBLISHED_RATES['cloud_run_vcpu_second']
                    + max(0.0, gib_pm - FREE_TIER['cloud_run_gib_seconds'])
                    * PUBLISHED_RATES['cloud_run_gib_second']
                    + max(0.0, req_pm - FREE_TIER['cloud_run_requests']) / 1e6
                    * PUBLISHED_RATES['cloud_run_per_million_requests'])

        out[name] = {
            'role': spec['role'],
            'vcpu': spec['vcpu'], 'mem_gib': spec['mem_gib'],
            'billable_instance_seconds_window': round(inst_sec, 1),
            'requests_window': int(reqs),
            'data_points': n_pts,
            'vcpu_seconds_per_month': round(vcpu_pm, 1),
            'gib_seconds_per_month': round(gib_pm, 1),
            'requests_per_month': int(req_pm),
            'usd_per_month_before_free_tier': round(gross / months, 4),
            'usd_per_month_after_free_tier': round(billable, 4),
        }

    return out, observed, months


def sql_costs() -> dict:
    """Cloud SQL: full instance, plus NexusHR's apportioned share."""
    inst_month = PUBLISHED_RATES['cloud_sql_db_f1_micro_hour'] * 730.0
    disk_month = SQL_INSTANCE['disk_gb'] * PUBLISHED_RATES['cloud_sql_pd_ssd_gb_month']
    full = inst_month + disk_month
    n_all = len(SQL_INSTANCE['user_databases'])
    n_ours = len(SQL_INSTANCE['nexushr_databases'])
    share = n_ours / float(n_all)
    return {
        'instance': SQL_INSTANCE['name'],
        'tier': SQL_INSTANCE['tier'],
        'assumption': ('Apportioned by user-database count (%d NexusHR of %d user '
                       'databases; the `postgres` system database is excluded). '
                       'This is a crude proxy for actual resource consumption and '
                       'is stated as an assumption, not a measurement.'
                       % (n_ours, n_all)),
        'share': round(share, 4),
        'usd_per_month_full_instance': round(full, 4),
        'usd_per_month_attributed': round(full * share, 4),
    }


def storage_costs() -> dict:
    ar_gb = ARTIFACT_REPO['size_gb']
    ar_billable = max(0.0, ar_gb - FREE_TIER['artifact_registry_gb'])
    gcs_gb = GCS_BUCKET['size_gb']
    gcs_billable = max(0.0, gcs_gb - FREE_TIER['gcs_standard_gb'])
    return {
        'artifact_registry': {
            'repository': ARTIFACT_REPO['name'],
            'size_gb': round(ar_gb, 2),
            'usd_per_month_before_free_tier':
                round(ar_gb * PUBLISHED_RATES['artifact_registry_gb_month'], 4),
            'usd_per_month_after_free_tier':
                round(ar_billable * PUBLISHED_RATES['artifact_registry_gb_month'], 4),
            'note': ('Container image history for this repository is the single '
                     'largest attributable line item. It is accumulated build '
                     'artefacts, not operational data -- a retention policy would '
                     'remove most of it. Report as a real but reducible cost.'),
        },
        'gcs_model_bucket': {
            'bucket': GCS_BUCKET['name'],
            'size_gb': round(gcs_gb, 4),
            'usd_per_month_before_free_tier':
                round(gcs_gb * PUBLISHED_RATES['gcs_standard_gb_month'], 6),
            'usd_per_month_after_free_tier':
                round(gcs_billable * PUBLISHED_RATES['gcs_standard_gb_month'], 6),
        },
    }


def build_scenarios(run: dict, sql: dict, store: dict) -> dict:
    run_gross = sum(v['usd_per_month_before_free_tier'] for v in run.values())
    run_net = sum(v['usd_per_month_after_free_tier'] for v in run.values())
    ar_gross = store['artifact_registry']['usd_per_month_before_free_tier']
    ar_net = store['artifact_registry']['usd_per_month_after_free_tier']
    gcs_gross = store['gcs_model_bucket']['usd_per_month_before_free_tier']
    gcs_net = store['gcs_model_bucket']['usd_per_month_after_free_tier']

    def pack(label, sql_usd, run_u, ar_u, gcs_u, note):
        usd = run_u + sql_usd + ar_u + gcs_u
        return {
            'label': label,
            'note': note,
            'usd_per_month': round(usd, 4),
            'lkr_per_month': round(usd * FX['usd_to_lkr'], 2),
            'under_lkr_10000': bool(usd * FX['usd_to_lkr'] < 10000),
            'breakdown_usd': {
                'cloud_run': round(run_u, 4),
                'cloud_sql': round(sql_usd, 4),
                'artifact_registry': round(ar_u, 4),
                'cloud_storage': round(gcs_u, 6),
            },
        }

    return {
        'A_attributed_with_free_tier': pack(
            'A. Attributed share of shared project, free tier applied',
            sql['usd_per_month_attributed'], run_net, ar_net, gcs_net,
            'NexusHR share of the current shared kpi-uat deployment.'),
        'A_attributed_no_free_tier': pack(
            'A. Attributed share, free tier ignored',
            sql['usd_per_month_attributed'], run_gross, ar_gross, gcs_gross,
            'Same attribution, but priced as if no always-free tier existed. '
            'Conservative; use if a reviewer objects to relying on free tier.'),
        'B_single_tenant_with_free_tier': pack(
            'B. Dedicated single-tenant SME deployment, free tier applied',
            sql['usd_per_month_full_instance'], run_net, ar_net, gcs_net,
            'What an SME running only NexusHR would pay. The whole Cloud SQL '
            'instance is theirs. This is the figure RQ2 is about.'),
        'B_single_tenant_no_free_tier': pack(
            'B. Dedicated single-tenant SME deployment, free tier ignored',
            sql['usd_per_month_full_instance'], run_gross, ar_gross, gcs_gross,
            'Most conservative defensible figure. Headline the thesis on this '
            'one if a single number is needed.'),
    }


# ---------------------------------------------------------------------------
def plot(scen: dict, run: dict, path: Path) -> None:
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 5.2))

    keys = list(scen.keys())
    lkr = [scen[k]['lkr_per_month'] for k in keys]
    labels = ['A: attributed\n(free tier)', 'A: attributed\n(no free tier)',
              'B: single-tenant\n(free tier)', 'B: single-tenant\n(no free tier)']
    colors = ['#4C72B0', '#7BA0D0', '#DD8452', '#E8B08A']
    bars = ax1.bar(labels, lkr, color=colors)
    ax1.axhline(10000, color='#C44E52', linestyle='--', linewidth=1.6,
                label='RQ2 target: LKR 10,000/month')
    top = max(max(lkr) * 1.35, 11500)
    ax1.set_ylim(0, top)
    for b, v in zip(bars, lkr):
        ax1.text(b.get_x() + b.get_width() / 2, v + top * 0.02,
                 'LKR %s' % format(round(v), ','), ha='center', fontsize=9)
    ax1.set_ylabel('LKR per month')
    ax1.set_title('Measured monthly cost vs RQ2 target', fontsize=11)
    ax1.legend(fontsize=9)
    ax1.tick_params(axis='x', labelsize=8)

    b = scen['B_single_tenant_no_free_tier']['breakdown_usd']
    items = [(k.replace('_', ' ').title(), v * FX['usd_to_lkr'])
             for k, v in b.items() if v > 0]
    items.sort(key=lambda x: -x[1])
    ax2.barh([i[0] for i in items][::-1], [i[1] for i in items][::-1],
             color='#55A868')
    ax2.set_xlabel('LKR per month')
    ax2.set_title('Where the cost actually sits\n(scenario B, no free tier)', fontsize=11)
    for i, (_, v) in enumerate(items[::-1]):
        # A sub-LKR-1 item renders as a zero-length bar, which reads as a
        # plotting fault rather than a real (negligible) cost. Label it.
        txt = '  < 1' if v < 1 else '  %s' % format(round(v), ',')
        ax2.text(v, i, txt, va='center', fontsize=9)
    ax2.set_xlim(0, max(v for _, v in items) * 1.25)

    fig.suptitle('P6 -- Cost attribution for NexusHR resources in a shared GCP project',
                 fontsize=12)
    fig.tight_layout(rect=(0, 0, 1, 0.94))
    fig.savefig(path, dpi=150)
    plt.close(fig)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--days', type=int, default=120,
                    help='look-back window in days (default 120)')
    ap.add_argument('--project', default=PROJECT)
    args = ap.parse_args()

    end = datetime.now(timezone.utc)
    start = end - timedelta(days=args.days)

    print('=' * 78)
    print('P6 -- COST ATTRIBUTION STUDY')
    print('=' * 78)
    print('Project        : %s (SHARED -- non-NexusHR resources excluded)' % args.project)
    print('Window         : %s .. %s (%d days)'
          % (start.date(), end.date(), args.days))
    print('Method         : measured usage x published unit price')
    print('WARNING        : rates are rate-card, not invoice. Verify before submission.')
    print()

    token = access_token()
    run, stamps, months = cloud_run_costs(token, args.project, start, end)
    sql = sql_costs()
    store = storage_costs()
    scen = build_scenarios(run, sql, store)

    observed = sorted(stamps)
    coverage = {'first_datapoint': observed[0] if observed else None,
                'last_datapoint': observed[-1] if observed else None,
                'window_months': round(months, 3)}

    print('-- Cloud Run measured usage ' + '-' * 50)
    print('%-24s %14s %12s %12s' % ('service', 'inst-seconds', 'requests', 'USD/mo*'))
    for name, v in run.items():
        print('%-24s %14s %12s %12.4f'
              % (name,
                 format(round(v['billable_instance_seconds_window']), ','),
                 format(v['requests_window'], ','),
                 v['usd_per_month_after_free_tier']))
    print()

    print('-- Scenarios ' + '-' * 64)
    for k, v in scen.items():
        flag = 'PASS' if v['under_lkr_10000'] else 'FAIL'
        print('%-46s USD %8.2f  LKR %10s  [%s]'
              % (v['label'][:46], v['usd_per_month'],
                 format(round(v['lkr_per_month']), ','), flag))
    print()

    head = scen['B_single_tenant_no_free_tier']
    print('HEADLINE (most conservative): LKR %s/month vs LKR 10,000 target -- %s'
          % (format(round(head['lkr_per_month']), ','),
             'PASS' if head['under_lkr_10000'] else 'FAIL'))
    print('Largest line item: %s'
          % max(head['breakdown_usd'].items(), key=lambda kv: kv[1])[0])
    print()

    REPORTS.mkdir(exist_ok=True)
    payload = {
        'generated': datetime.now(timezone.utc).isoformat(),
        'project': args.project,
        'region': REGION,
        'method': ('Measured usage from Cloud Monitoring multiplied by published '
                   'unit prices, attributed to NexusHR resources only. Adopted '
                   'because kpi-uat is shared with four unrelated systems and no '
                   'detailed BigQuery billing export exists (and enabling one is '
                   'not retroactive).'),
        'window': {'start': start.isoformat(), 'end': end.isoformat(),
                   'days': args.days, **coverage},
        'rates': PUBLISHED_RATES,
        'free_tier': FREE_TIER,
        'fx': FX,
        'cloud_run': run,
        'cloud_sql': sql,
        'storage': store,
        'unattributed_costs': UNATTRIBUTED,
        'scenarios': scen,
        'caveats': [
            'Unit prices are published rate-card figures, not invoice figures.',
            'Cloud SQL apportionment by database count is an assumption, not a '
            'measurement; scenario B avoids it by charging the full instance.',
            'Usage reflects development traffic, not a live 50-employee SME '
            'workload. Do not present this as an operational-load measurement.',
            'Egress and Cloud Build are not attributable per resource in a shared '
            'project and are excluded from the headline; see unattributed_costs.',
            'The always-free tier is granted per billing account, not per service. '
            'In scenario A the other systems sharing kpi-uat draw on the same '
            'allowance, so crediting it wholly to NexusHR is generous. The claim '
            'is sound in scenario B (a dedicated SME deployment), which is a '
            'further reason to headline scenario B.',
        ],
    }
    (REPORTS / 'cost_analysis.json').write_text(json.dumps(payload, indent=2))
    plot(scen, run, REPORTS / 'cost_analysis.png')
    print('Wrote reports/cost_analysis.json')
    print('Wrote reports/cost_analysis.png')


if __name__ == '__main__':
    main()
