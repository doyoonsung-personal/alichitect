// Raw graphs from p1-vpc-no-group, before deterministic repair.
// Source: eval/results/2026-11-02T11-29-56-phase0a-baseline/runs.jsonl, each turn's ops.
// The stored final graphs already have attachTo cleared; attachValid judges warningsBefore.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Graph } from '../src/types.ts';
import { loadCatalog } from '../src/catalog-node.ts';
import { makeNode } from '../src/reducer.ts';
import { checkGraph, repairGraph } from '../src/validate.ts';

const CAT = loadCatalog();

function repairAndCheck(graph: Graph) {
  const before = structuredClone(graph);
  const result = repairGraph(graph, CAT);
  assert.deepEqual(graph, before, 'repair must not mutate its input');
  assert.deepEqual(checkGraph(result.graph, CAT).filter((w) => w.code === 'attach-host-missing'), []);
  assert.deepEqual(result.warnings.filter((w) => w.code === 'attach-host-missing' && !w.repaired), []);
  for (const n of Object.values(result.graph.nodes)) {
    if (!n.attachTo) continue;
    const host = result.graph.nodes[n.attachTo];
    assert.ok(host, `${n.id} must name a node, not a group or a missing id`);
    assert.ok(CAT.byId.get(n.product)?.attach?.hosts.includes(host.product));
    assert.equal(host.attachTo, undefined);
  }
  const again = repairGraph(result.graph, CAT);
  assert.deepEqual(again.graph, result.graph);
  assert.deepEqual(again.warnings.filter((w) => w.repaired), [], 'a second repair must apply no fixes');
  assert.deepEqual(again.tombstones, []);
  return result;
}

function badgeGraph(attachTo: string, hosts: string[] = []): Graph {
  const nodes: Graph['nodes'] = {};
  for (const id of hosts) nodes[id] = makeNode({ id, product: 'alb', label: id, group: 'vpc' });
  nodes.waf = makeNode({ id: 'waf', product: 'waf', label: 'WAF', group: 'vpc', attachTo });
  return {
    groups: {
      sg: { id: 'sg', kind: 'region', label: 'Singapore', parent: null },
      vpc: { id: 'vpc', kind: 'vpc', label: 'VPC', parent: 'sg' },
    },
    nodes,
    edges: {},
    recs: [],
  };
}
const FIXTURES: Array<{ id: string; graph: Graph }> = [
  {
    "id": "p1-vpc-no-group#1",
    "graph": {
      "groups": {
        "onprem": {
          "id": "onprem",
          "kind": "onprem",
          "label": "On-premises data center",
          "parent": null
        },
        "sg": {
          "id": "sg",
          "kind": "region",
          "label": "Singapore (ap-southeast-1)",
          "parent": null
        },
        "vpc": {
          "id": "vpc",
          "kind": "vpc",
          "label": "Data VPC",
          "parent": "sg"
        }
      },
      "nodes": {
        "onprem-dc": {
          "id": "onprem-dc",
          "product": "onprem-dc",
          "label": "App servers",
          "group": "onprem",
          "why": "Runs the application workloads on-premises."
        },
        "express-connect": {
          "id": "express-connect",
          "product": "express-connect",
          "label": "Express Connect",
          "group": "vpc",
          "why": "Private tunnel between on-prem and VPC, no public internet."
        },
        "db": {
          "id": "db",
          "product": "polardb",
          "label": "PolarDB MySQL",
          "group": "vpc",
          "zones": [
            "a",
            "b"
          ],
          "why": "Managed relational database cluster across two zones."
        },
        "cache": {
          "id": "cache",
          "product": "tair",
          "label": "Tair cache",
          "group": "vpc",
          "zones": [
            "a",
            "b"
          ],
          "why": "In-memory cache for fast data access across two zones."
        },
        "privatezone": {
          "id": "privatezone",
          "product": "privatezone",
          "label": "PrivateZone",
          "group": "vpc",
          "attachTo": "vpc",
          "why": "Resolves database endpoints privately inside the VPC."
        }
      },
      "edges": {
        "e-onprem-express": {
          "id": "e-onprem-express",
          "from": "onprem-dc",
          "to": "express-connect",
          "label": "private link",
          "kind": "data"
        },
        "e-express-db": {
          "id": "e-express-db",
          "from": "express-connect",
          "to": "db",
          "label": "SQL",
          "kind": "data"
        },
        "e-express-cache": {
          "id": "e-express-cache",
          "from": "express-connect",
          "to": "cache",
          "label": "Redis",
          "kind": "data"
        }
      },
      "recs": []
    }
  },
  {
    "id": "p1-vpc-no-group#2",
    "graph": {
      "groups": {
        "onprem": {
          "id": "onprem",
          "kind": "onprem",
          "label": "On-premises data center",
          "parent": null
        },
        "sg": {
          "id": "sg",
          "kind": "region",
          "label": "Singapore (ap-southeast-1)",
          "parent": null
        },
        "vpc": {
          "id": "vpc",
          "kind": "vpc",
          "label": "Data VPC",
          "parent": "sg"
        }
      },
      "nodes": {
        "apps": {
          "id": "apps",
          "product": "onprem-dc",
          "label": "App servers",
          "group": "onprem",
          "why": "Runs the application workloads on-premises."
        },
        "vpn": {
          "id": "vpn",
          "product": "express-connect",
          "label": "Express Connect",
          "group": "sg",
          "why": "Private dedicated line from on-prem to VPC, no internet exposure."
        },
        "pvtz": {
          "id": "pvtz",
          "product": "privatezone",
          "label": "PrivateZone",
          "group": "vpc",
          "attachTo": "vpc",
          "why": "Resolves database endpoints privately inside the VPC."
        },
        "db": {
          "id": "db",
          "product": "polardb",
          "label": "PolarDB MySQL",
          "group": "vpc",
          "zones": [
            "a",
            "b"
          ],
          "why": "Managed relational database for the application."
        },
        "cache": {
          "id": "cache",
          "product": "tair",
          "label": "Tair cache",
          "group": "vpc",
          "zones": [
            "a",
            "b"
          ],
          "why": "In-memory cache for fast session and data access."
        }
      },
      "edges": {
        "e-apps-vpn": {
          "id": "e-apps-vpn",
          "from": "apps",
          "to": "vpn",
          "label": "private"
        },
        "e-vpn-db": {
          "id": "e-vpn-db",
          "from": "vpn",
          "to": "db",
          "label": "SQL"
        },
        "e-vpn-cache": {
          "id": "e-vpn-cache",
          "from": "vpn",
          "to": "cache",
          "label": "Redis"
        }
      },
      "recs": []
    }
  },
  {
    "id": "p1-vpc-no-group#3",
    "graph": {
      "groups": {
        "onprem": {
          "id": "onprem",
          "kind": "onprem",
          "label": "On-premises data center",
          "parent": null
        },
        "sg": {
          "id": "sg",
          "kind": "region",
          "label": "Singapore (ap-southeast-1)",
          "parent": null
        },
        "vpc": {
          "id": "vpc",
          "kind": "vpc",
          "label": "Data VPC",
          "parent": "sg"
        }
      },
      "nodes": {
        "apps": {
          "id": "apps",
          "product": "onprem-dc",
          "label": "App servers",
          "group": "onprem",
          "why": "Runs the application in your own data center."
        },
        "express": {
          "id": "express",
          "product": "express-connect",
          "label": "Express Connect",
          "group": "vpc",
          "why": "Private dedicated line from on-premises to VPC, no internet exposure."
        },
        "cache": {
          "id": "cache",
          "product": "tair",
          "label": "Tair cache",
          "group": "vpc",
          "zones": [
            "a",
            "b"
          ],
          "why": "In-memory cache for fast data access with zone standby."
        },
        "db": {
          "id": "db",
          "product": "polardb",
          "label": "PolarDB MySQL",
          "group": "vpc",
          "zones": [
            "a",
            "b"
          ],
          "why": "Primary relational database cluster with compute-storage separation."
        },
        "dns": {
          "id": "dns",
          "product": "privatezone",
          "label": "PrivateZone",
          "group": "vpc",
          "attachTo": "vpc",
          "why": "Resolves database endpoints privately inside the VPC."
        }
      },
      "edges": {
        "e-apps-express": {
          "id": "e-apps-express",
          "from": "apps",
          "to": "express",
          "label": "private"
        },
        "e-express-cache": {
          "id": "e-express-cache",
          "from": "express",
          "to": "cache",
          "label": "Redis"
        },
        "e-express-db": {
          "id": "e-express-db",
          "from": "express",
          "to": "db",
          "label": "MySQL"
        }
      },
      "recs": []
    }
  }
];

describe('attachment hosts: recorded VPC group references', () => {
  for (const { id, graph } of FIXTURES) {
    test(id, () => {
      const dns = Object.values(graph.nodes).find((n) => n.product === 'privatezone');
      assert.ok(dns);
      assert.equal(dns.attachTo, 'vpc');
      assert.equal(graph.groups.vpc.kind, 'vpc');
      assert.equal(graph.nodes.vpc, undefined);
      assert.ok(checkGraph(graph, CAT).some((w) => w.code === 'attach-host-missing' && w.severity === 'error'));
      const r = repairAndCheck(graph);
      assert.deepEqual(r.graph.nodes[dns.id], makeNode({ ...dns, group: 'sg', attachTo: undefined }));
      assert.deepEqual(r.graph.edges, graph.edges, 'no invented edges to a group');
      assert.deepEqual(r.tombstones, [], 'the DNS service is retained');
      const fixes = r.warnings.filter((w) => w.code === 'attach-host-missing' && w.repaired);
      assert.equal(fixes.length, 1);
      assert.deepEqual(fixes[0].ids, [dns.id]);
      assert.match(fixes[0].msg, /host 'vpc' does not exist; drawn on its own$/);
    });
  }
});

describe('attachment hosts: missing nodes and catalog host selection', () => {
  test('PrivateZone with neither a VPC node nor group stays inline in its region', () => {
    const graph: Graph = {
      groups: { sg: { id: 'sg', kind: 'region', label: 'Singapore', parent: null } },
      nodes: { dns: makeNode({ id: 'dns', product: 'privatezone', label: 'DNS', group: 'sg', attachTo: 'vpc' }) },
      edges: {},
      recs: [],
    };
    const r = repairAndCheck(graph);
    assert.equal(r.graph.nodes.dns.group, 'sg');
    assert.equal(Object.hasOwn(r.graph.nodes.dns, 'attachTo'), false);
    assert.deepEqual(r.graph.groups, graph.groups);
    assert.deepEqual(r.tombstones, []);
    assert.ok(r.warnings.some((w) => w.code === 'attach-host-missing' && w.repaired));
  });

  for (const target of ['missing', 'vpc']) {
    test(`${target}: retarget to the only catalog-compatible node`, () => {
      const r = repairAndCheck(badgeGraph(target, ['lb']));
      assert.equal(r.graph.nodes.waf.attachTo, 'lb');
      assert.equal(r.graph.nodes.waf.group, 'vpc');
      const fix = r.warnings.find((w) => w.code === 'attach-host-missing' && w.repaired);
      assert.ok(fix);
      assert.deepEqual(fix.ids, ['waf', 'lb']);
      assert.match(fix.msg, /now a badge on 'lb'/);
    });

    test(`${target}: no compatible host leaves the badge inline in its catalog scope`, () => {
      const r = repairAndCheck(badgeGraph(target));
      assert.equal(Object.hasOwn(r.graph.nodes.waf, 'attachTo'), false);
      assert.equal(r.graph.nodes.waf.group, null, 'edge-scoped WAF cannot sit inside the VPC');
      assert.deepEqual(r.graph.edges, {});
      assert.deepEqual(r.tombstones, []);
      assert.ok(r.warnings.some((w) => w.repaired && /drawn on its own$/.test(w.msg)));
    });

    test(`${target}: several compatible hosts without an edge leave the badge inline`, () => {
      const r = repairAndCheck(badgeGraph(target, ['lb-a', 'lb-b']));
      assert.equal(Object.hasOwn(r.graph.nodes.waf, 'attachTo'), false);
      assert.deepEqual(r.graph.edges, {});
      assert.deepEqual(r.tombstones, []);
    });
  }

  test('an adjacent catalog host disambiguates and receives the badge edges', () => {
    const graph = badgeGraph('vpc', ['lb-a', 'lb-b']);
    graph.nodes.users = makeNode({ id: 'users', product: 'users', label: 'Users', group: null });
    graph.edges.in = { id: 'in', from: 'users', to: 'waf' };
    graph.edges.out = { id: 'out', from: 'waf', to: 'lb-b' };
    const r = repairAndCheck(graph);
    assert.equal(r.graph.nodes.waf.attachTo, 'lb-b');
    assert.deepEqual(r.graph.edges, { in: { id: 'in', from: 'users', to: 'lb-b' } });
  });

  test('a valid attachment is left alone even when another compatible host exists', () => {
    const graph = badgeGraph('lb-b', ['lb-a', 'lb-b']);
    const r = repairAndCheck(graph);
    assert.deepEqual(r.graph, graph);
    assert.deepEqual(r.warnings.filter((w) => w.repaired), []);
  });
});
